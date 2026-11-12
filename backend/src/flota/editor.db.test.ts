import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Pool, type PoolClient } from 'pg';
import express from 'express';
import cookieParser from 'cookie-parser';
import sharp from 'sharp';

test('editores HTTP y PostgreSQL: permisos, versiones, fotos, identidad, planos históricos y rollback', {skip:process.env.PROBAR_EDITORES_DB!=='1'},async()=>{
  const carpeta=process.env.ENTORNO_PRUEBAS_DB??resolve(__dirname,'../../conexion-bd');
  config({path:resolve(carpeta,'.env'),quiet:true});
  assert.ok(process.env.DIRECT_URL,'Falta DIRECT_URL para la prueba explícita.');
  const url=new URL(process.env.DIRECT_URL);
  for(const k of ['sslmode','sslcert','sslrootcert','sslkey','sslidentity','sslaccept','schema'])url.searchParams.delete(k);
  const ca=process.env.DB_SSL_CA_FILE;
  if(ca) process.env.DB_SSL_CA_FILE=resolve(carpeta,ca);
  const owner=new Pool({connectionString:url.toString(),ssl:['localhost','127.0.0.1'].includes(url.hostname)?false:{rejectUnauthorized:true,...(ca?{ca:readFileSync(resolve(carpeta,ca),'utf8')}:{})},connectionTimeoutMillis:10000});
  const db=await owner.connect(); let servidor:ReturnType<ReturnType<typeof express>['listen']>|undefined;
  try{
    await db.query('BEGIN');
    if(!(await db.query("SELECT 1 FROM information_schema.columns WHERE table_schema='transporte' AND table_name='buses' AND column_name='version'")).rowCount)
      await db.query(readFileSync(resolve(__dirname,'../../conexion-bd/prisma/migrations/20261112_editores_mikel/migration.sql'),'utf8').replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
    await db.query('GRANT transporte_runtime TO CURRENT_USER');
    const insertar=async(tabla:string,columnas:string,valores:unknown[])=>(await db.query(`INSERT INTO transporte.${tabla}(${columnas}) VALUES(${valores.map((_,i)=>'$'+(i+1))}) RETURNING id`,valores)).rows[0].id as string;
    async function persona(){const id=await insertar('usuarios','nombres,apellidos,tipo_documento,documento,email,email_verificado_at',['Test','Mikel','OTRO',randomUUID().slice(0,30),randomUUID()+'@example.com',new Date()]);const token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex');await insertar('sesiones','usuario_id,token_hash,expires_at',[id,hash,new Date(Date.now()+3600000)]);return{id,token,hash};}
    const admin=await persona(),coopUser=await persona(),cliente=await persona(),ajeno=await persona();
    await db.query("INSERT INTO transporte.usuario_roles_globales(usuario_id,rol_id) SELECT $1,id FROM transporte.roles WHERE codigo='ADMIN_SISTEMA'",[admin.id]);
    const c=await insertar('cooperativas','nombre,razon_social,ruc',['Test Mikel','Prueba reversible',randomUUID().slice(0,13)]);
    await insertar('config_cooperativa','cooperativa_id',[c]);
    await db.query("INSERT INTO transporte.membresias(cooperativa_id,usuario_id,rol_id) SELECT $1,$2,id FROM transporte.roles WHERE codigo='COOPERATIVA'",[c,coopUser.id]);
    const c2=await insertar('cooperativas','nombre,razon_social,ruc',['Otro ámbito','Prueba reversible',randomUUID().slice(0,13)]);
    await db.query("INSERT INTO transporte.membresias(cooperativa_id,usuario_id,rol_id) SELECT $1,$2,id FROM transporte.roles WHERE codigo='COOPERATIVA'",[c2,ajeno.id]);
    const grupo=await insertar('grupos_bus','cooperativa_id,nombre',[c,'Grupo reversible']);
    const clase=(await db.query("SELECT id FROM transporte.clases_asiento WHERE codigo='NORMAL'")).rows[0].id;
    const {crearEditorRouter}=await import('./editorRouter.js');
    const app=express();app.use(cookieParser());
    app.use('/api/mikel',crearEditorRouter(async(req,trabajo)=>{
      const t=req.cookies?.transporte_sesion;
      if(!t){const error=new Error('sesion');Object.assign(error,{status:401});throw error;}
      await db.query('SAVEPOINT peticion');
      try{await db.query('SET LOCAL ROLE transporte_runtime');await db.query('SELECT transporte.abrir_contexto($1,$2)',[createHash('sha256').update(t).digest('hex'),randomUUID()]);const resultado=await trabajo(db as PoolClient);await db.query('RESET ROLE');await db.query('RELEASE SAVEPOINT peticion');return resultado;}
      catch(e){await db.query('ROLLBACK TO SAVEPOINT peticion');await db.query('RESET ROLE');throw e;}
    }));
    servidor=app.listen(0,'127.0.0.1');await new Promise<void>(r=>servidor!.once('listening',r));const puerto=(servidor.address() as {port:number}).port;
    async function api(ruta:string,token=coopUser.token,body?:unknown){const respuesta=await fetch(`http://127.0.0.1:${puerto}/api/mikel/${ruta}`,{method:body===undefined?'GET':'PUT',headers:{Cookie:token?`transporte_sesion=${token}`:'',Origin:process.env.FRONTEND_URL??'http://127.0.0.1:5173','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return{status:respuesta.status,datos:respuesta.headers.get('content-type')?.includes('application/json')?await respuesta.json():Buffer.from(await respuesta.arrayBuffer())};}
    assert.equal((await api('buses','')).status,401);
    assert.equal((await api('buses',cliente.token)).status,403);
    assert.equal((await api('global',coopUser.token)).status,403);
    const global=await api('global',admin.token);assert.equal(global.status,200);assert.equal((await api('global',admin.token,{...global.datos.datos,sesionHoras:4})).status,200);assert.equal((await api('global',admin.token,global.datos.datos)).status,409);
    const b={version:1,unidad:randomUUID().slice(0,15),placa:'TST-'+String(Math.floor(Math.random()*9000)+1000),chasis:'Prueba',carroceria:'Prueba',correo:'test@example.com',grupoId:grupo,propietario:'',activo:true,pisos:1,filas:1,celdas:[{piso:1,fila:1,columna:1,tipo:'ASIENTO',codigo:'1A',clase_id:clase}],servicios:[],fotos:[],planoEnUso:false};
    const foto={base64:(await sharp({create:{width:20,height:20,channels:3,background:'#ff0000'}}).png().toBuffer()).toString('base64')};
    const alta=await api('buses',coopUser.token,{datos:b,fotos:[foto],crearVersion:false});assert.equal(alta.status,200,JSON.stringify(alta.datos));const guardado=alta.datos;
    assert.equal(guardado.celdas.length,1);assert.equal(guardado.fotos.length,1);assert.equal((await api('imagenes/'+guardado.fotos[0].id)).status,200);
    assert.equal((await api('buses/'+guardado.id,ajeno.token)).status,404);
    assert.equal((await api('imagenes/'+guardado.fotos[0].id,ajeno.token)).status,404);
    const actualizado=await api('buses',coopUser.token,{datos:{...guardado,propietario:'Actualizado'},fotos:[],crearVersion:false});assert.equal(actualizado.status,200,JSON.stringify(actualizado.datos));
    assert.equal((await api('buses',coopUser.token,{datos:guardado,fotos:[],crearVersion:false})).status,409);
    const cambiado={...actualizado.datos,celdas:[{...b.celdas[0],codigo:'1B'}]};
    assert.equal((await api('buses',coopUser.token,{datos:cambiado,fotos:[],crearVersion:false})).status,409);
    assert.equal((await api('buses',coopUser.token,{datos:cambiado,fotos:[],crearVersion:true})).status,200);
    assert.equal((await db.query('SELECT count(*)::int n FROM transporte.planos WHERE bus_id=$1',[guardado.id])).rows[0].n,2);
    assert.equal((await api('buses',coopUser.token,{datos:{...b,unidad:'no debe guardarse',placa:'ERR-9123'},fotos:[{base64:'basura'}],crearVersion:false})).status,422);
    assert.equal((await db.query("SELECT 1 FROM transporte.buses WHERE cooperativa_id=$1 AND unidad='no debe guardarse'",[c])).rowCount,0);
    const identidad=await api('identidad');assert.equal(identidad.status,200);
    const idDatos={...identidad.datos,ruc:'1234567890001',email:'test@example.com',telefono:'',whatsapp:''};
    assert.equal((await api('identidad',coopUser.token,{datos:idDatos,logo:foto})).status,200);
    assert.equal((await api('identidad',coopUser.token,{datos:idDatos,logo:null})).status,409);
    // Una frecuencia real y sus grupos, sin alterar viajes publicados.
    const ruta=await insertar('rutas','cooperativa_id,nombre',[c,'Ruta reversible']);
    const frecuencia=await insertar('frecuencias','cooperativa_id,ruta_id,codigo,hora_salida,resolucion_ant,tipo_viaje',[c,ruta,'TEST','08:00','PRUEBA','DIRECTO']);
    const compat={frecuenciaId:frecuencia,version:1,grupoIds:[grupo]};
    assert.equal((await api('compatibilidades',coopUser.token,compat)).status,200);
    assert.equal((await api('compatibilidades',coopUser.token,compat)).status,409);
    assert.equal((await api('compatibilidades',ajeno.token,{...compat,version:2})).status,404);
    assert.equal((await api('compatibilidades')).datos.grupos[0].buses.length,1);
  }finally{
    if(servidor)await new Promise<void>(r=>servidor!.close(()=>r()));
    await db.query('ROLLBACK');db.release();await owner.end();
    const {pool}=await import('../database.js');await pool.end();
  }
});
