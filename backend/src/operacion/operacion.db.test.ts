import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {config} from 'dotenv';
import {Pool,type PoolClient} from 'pg';
import express from 'express';
import cookieParser from 'cookie-parser';

test('Benjamín: frecuencia → tarifas → borrador → publicación → reserva → compra; ROLLBACK', {skip:process.env.PROBAR_OPERACION_DB!=='1'},async()=>{
 config({path:resolve(__dirname,'../../.env'),quiet:true});const carpeta=resolve(__dirname,'../../conexion-bd');config({path:resolve(carpeta,'.env'),quiet:true});assert.ok(process.env.DIRECT_URL);
 const url=new URL(process.env.DIRECT_URL);for(const k of ['sslmode','sslcert','sslrootcert','sslkey','sslidentity','sslaccept','schema'])url.searchParams.delete(k);
 const ca=process.env.DB_SSL_CA_FILE;const owner=new Pool({connectionString:url.toString(),ssl:{rejectUnauthorized:true,...(ca?{ca:readFileSync(resolve(carpeta,ca),'utf8')}:{})},connectionTimeoutMillis:10000});
 const archivosPrueba:string[]=[];const db=await owner.connect();let server:ReturnType<ReturnType<typeof express>['listen']>|undefined;
 try{await db.query('BEGIN');await db.query('GRANT transporte_runtime TO CURRENT_USER');
 const insert=async(table:string,columns:string,values:unknown[])=>(await db.query(`INSERT INTO transporte.${table}(${columns})VALUES(${values.map((_,i)=>'$'+(i+1))})RETURNING id`,values)).rows[0].id as string;
 async function persona(admin=false){const id=await insert('usuarios','nombres,apellidos,tipo_documento,documento,email,email_verificado_at',['Prueba','Operación','OTRO',randomUUID().slice(0,25),randomUUID()+'@example.invalid',new Date()]);if(admin)await db.query("INSERT INTO transporte.usuario_roles_globales(usuario_id,rol_id)SELECT $1,id FROM transporte.roles WHERE codigo='ADMIN_SISTEMA'",[id]);const token=randomBytes(32).toString('base64url');await insert('sesiones','usuario_id,token_hash,expires_at',[id,createHash('sha256').update(token).digest('hex'),new Date(Date.now()+3600000)]);return{id,token};}
 const actor=await persona(),cliente=await persona(),ajeno=await persona(),admin=await persona(true);
 const c=await insert('cooperativas','nombre,razon_social,ruc',['Prueba Operación '+randomUUID().slice(0,6),'Prueba reversible',randomUUID().slice(0,13)]);
 const c2=await insert('cooperativas','nombre,razon_social,ruc',['Otro ámbito '+randomUUID().slice(0,6),'Prueba reversible',randomUUID().slice(0,13)]);
 for(const [coop,user]of[[c,actor.id],[c2,ajeno.id]])await db.query("INSERT INTO transporte.membresias(cooperativa_id,usuario_id,rol_id)SELECT $1,$2,id FROM transporte.roles WHERE codigo='COOPERATIVA'",[coop,user]);
 await insert('config_cooperativa','cooperativa_id',[c]);
 const g=await insert('grupos_bus','cooperativa_id,nombre',[c,'Grupo Prueba']);
 const city1=await insert('ciudades','nombre,provincia',['Origen '+randomUUID().slice(0,6),'Prueba']),city2=await insert('ciudades','nombre,provincia',['Destino '+randomUUID().slice(0,6),'Prueba']);
 const t1=await insert('terminales','ciudad_id,nombre',[city1,'Terminal origen']),t2=await insert('terminales','ciudad_id,nombre',[city2,'Terminal destino']);
 const bus=await insert('buses','cooperativa_id,grupo_id,unidad,placa,chasis,carroceria',[c,g,'TEST-'+randomUUID().slice(0,6),'TST-'+randomUUID().slice(0,8),'Prueba','Prueba']);
 const clase=(await db.query("SELECT id FROM transporte.clases_asiento WHERE codigo='NORMAL'")).rows[0].id;
 const plano=await insert('planos','cooperativa_id,bus_id,numero_version,nombre,pisos,publicado',[c,bus,1,'Prueba',1,true]);
 const asiento=await insert('plano_celdas','cooperativa_id,plano_id,piso,fila,columna,tipo,codigo,clase_id',[c,plano,1,1,1,'ASIENTO','1A',clase]);
 const asientosExtra:string[]=[];for(let col=2;col<=5;col++)asientosExtra.push(await insert('plano_celdas','cooperativa_id,plano_id,piso,fila,columna,tipo,codigo,clase_id',[c,plano,1,1,col,'ASIENTO',String(col)+'A',clase]));
 const impuesto=(await db.query("SELECT id FROM transporte.impuestos WHERE concepto='TRANSPORTE_TERRESTRE' AND activo ORDER BY puntos_base LIMIT 1")).rows[0].id;
 await db.query("INSERT INTO transporte.cooperativa_metodos_pago(cooperativa_id,metodo_id,habilitado) SELECT $1,id,true FROM transporte.metodos_pago WHERE codigo='EFECTIVO'",[c]);
 async function contexto<T>(token:string,fn:(db:PoolClient)=>Promise<T>){await db.query('SAVEPOINT api');try{await db.query('SET LOCAL ROLE transporte_runtime');await db.query('SELECT transporte.abrir_contexto($1,$2)',[createHash('sha256').update(token).digest('hex'),randomUUID()]);const r=await fn(db);await db.query('RESET ROLE');await db.query('RELEASE SAVEPOINT api');return r;}catch(e){await db.query('ROLLBACK TO SAVEPOINT api');await db.query('RESET ROLE');throw e;}}
 const {perfilSesion}=await import('../auth/router.js');
 const perfilAdmin=await contexto(admin.token,perfilSesion);assert.ok(perfilAdmin.roles.includes('ADMIN_SISTEMA'));assert.ok(perfilAdmin.permisos.includes('identidad.admin'));
 const perfilCoop=await contexto(actor.token,perfilSesion);assert.ok(perfilCoop.roles.includes('COOPERATIVA'));assert.ok(perfilCoop.permisos.includes('config.admin'));assert.ok(!perfilCoop.permisos.includes('identidad.admin'));
 const perfilCliente=await contexto(cliente.token,perfilSesion);assert.deepEqual(perfilCliente.roles,['CLIENTE']);assert.ok(!perfilCliente.permisos.includes('oficina.vender'));assert.ok(!perfilCliente.permisos.includes('config.admin'));
 const {crearOperacionRouter}=await import('./router.js');const app=express();app.use(cookieParser());app.use('/api/operacion',crearOperacionRouter(async(req,fn)=>{const t=req.cookies?.transporte_sesion;if(!t)throw Object.assign(new Error('Inicia sesión'),{status:401});return contexto(t,fn);}));const {crearReembolsosClienteRouter}=await import('../pagos/reembolsosCliente.js');app.use('/api/reservas',crearReembolsosClienteRouter(async(req,fn)=>{const t=req.cookies?.transporte_sesion;if(!t)throw Object.assign(new Error('Sin sesión'),{code:'28000'});return contexto(t,fn);}));server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server!.once('listening',r));const port=(server.address() as {port:number}).port;
 async function api(ruta:string,body?:unknown,method=body?'PUT':'GET',token=actor.token,coop=c,origin=process.env.FRONTEND_URL??'http://127.0.0.1:5173'){const r=await fetch(`http://127.0.0.1:${port}/api/operacion/${ruta}${ruta.includes('?')?'&':'?'}cooperativaId=${coop}`,{method,headers:{Cookie:token?'transporte_sesion='+token:'',Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,datos:await r.json()};}
 assert.equal((await api('contexto',undefined,'GET','')).status,401);
 assert.equal((await api('contexto',undefined,'GET',cliente.token)).status,403);
 assert.equal((await api('contexto',undefined,'GET',ajeno.token)).status,403);
 assert.equal((await api('frecuencias',{},'PUT',actor.token,c,'https://ajeno.invalid')).status,403);
 const f={codigo:'TEST-FRE',hora:'08:00',resolucion:'RES-PRUEBA',tipo:'DIRECTO',activa:true,grupos:[g],paradas:[{terminalId:t1,minutos:0},{terminalId:t2,minutos:120}]};
 const alta=await api('frecuencias',f);assert.equal(alta.status,200,JSON.stringify(alta));const fid=alta.datos.id;
 const completo=await api('contexto');assert.equal(completo.status,200);
 const partes:Record<string,string[]>={resumen:['frecuencias','grupos','buses','viajes','indisponibilidades'],frecuencias:['frecuencias','grupos','terminales'],tarifas:['frecuencias','grupos','tarifas','beneficios','clases','impuestos'],planificacion:['frecuencias','grupos','buses','viajes','conductores','indisponibilidades'],politica:[]};
 const listas=['frecuencias','grupos','buses','viajes','tarifas','beneficios','terminales','clases','impuestos','conductores','indisponibilidades'];
 for(const [vista,campos]of Object.entries(partes)){
  const parcial=await api('contexto?vista='+vista);assert.equal(parcial.status,200);
  assert.deepEqual(parcial.datos.cooperativa,completo.datos.cooperativa);assert.deepEqual(parcial.datos.permisos,completo.datos.permisos);
  for(const campo of listas)assert.deepEqual(parcial.datos[campo],campos.includes(campo)?completo.datos[campo]:[],vista+': '+campo);
 }
 assert.equal((await api('contexto?vista=__proto__')).status,422);
 assert.equal((await api('contexto?vista=politica',undefined,'GET',cliente.token)).status,403);

 assert.equal((await api('frecuencias',{...f,codigo:'OTRA',paradas:[{terminalId:t1,minutos:0},{terminalId:t1,minutos:60}]})).status,422);
 assert.equal((await api('frecuencias',{...f,id:fid,version:0})).status,409);
 const dia=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 const asignacion={fecha:dia,frecuenciaId:fid,busId:bus};
 const paradaId=await insert('grupo_dias_parada','cooperativa_id,grupo_id,dia_iso',[c,g,new Date(dia+'T12:00Z').getUTCDay()||7]);
 assert.equal((await api('asignaciones',{asignaciones:[asignacion]})).status,422);
 await db.query('DELETE FROM transporte.grupo_dias_parada WHERE id=$1',[paradaId]);
 const proxima=new Date(Date.parse(dia)+86400000).toISOString().slice(0,10);
 assert.equal((await api('asignaciones',{asignaciones:[{...asignacion,fecha:proxima},{...asignacion,fecha:proxima}]})).status,422);
 assert.equal((await db.query('SELECT count(*)::int n FROM transporte.viajes WHERE cooperativa_id=$1',[c])).rows[0].n,0,'Un lote inválido debe revertirse entero');
 assert.equal((await api('frecuencias',{...f,id:fid,version:1},'PUT',ajeno.token,c2)).status,422);

 const borrador=await api('asignaciones',{asignaciones:[asignacion]});assert.equal(borrador.status,200,JSON.stringify(borrador));const vid=borrador.datos.ids[0];
 assert.equal((await api('asignaciones',{asignaciones:[asignacion]})).status,422);
 const sinTarifa=await api('publicar',{viajes:[{id:vid,version:1}]},'POST');assert.equal(sinTarifa.status,422,JSON.stringify(sinTarifa));
 let ctx=await api('contexto?desde='+dia+'&hasta='+dia);assert.equal(ctx.status,200,JSON.stringify(ctx));assert.equal(ctx.datos.viajes[0].estado,'BORRADOR');
 const tarifa={grupo_id:g,clase_id:clase,origen_orden:0,destino_orden:1,precio:1200,servicio:0,impuesto_id:impuesto,impuesto_servicio_id:null,desde:dia,hasta:null};
 assert.equal((await api('tarifas',{frecuenciaId:fid,version:1,tarifas:[tarifa]})).status,200);
 assert.equal((await api('tarifas',{frecuenciaId:fid,version:1,tarifas:[tarifa]})).status,409);
 assert.equal((await api('beneficios',{codigo:'NINO',descuento_bp:3000,edad_min:0,edad_max_exclusiva:12,condiciones:'Nacimiento y documento verificados',activo:true,desde:dia,hasta:null})).status,200);
 const lote=await api('publicar',{viajes:[{id:vid,version:1},{id:vid,version:0}]},'POST');assert.equal(lote.status,409);assert.equal((await db.query('SELECT estado FROM transporte.viajes WHERE id=$1',[vid])).rows[0].estado,'BORRADOR','Publicar debe ser atómico');
 const publicado=await api('publicar',{viajes:[{id:vid,version:1}]},'POST');assert.equal(publicado.status,200,JSON.stringify(publicado));
 ctx=await api('contexto?desde='+dia+'&hasta='+dia);assert.equal(ctx.datos.viajes[0].estado,'PUBLICADO');
 assert.equal((await api('publicar',{viajes:[{id:vid,version:1}]},'POST')).status,409);
 assert.equal((await api('frecuencias',{...f,id:fid,version:2,hora:'09:00'})).status,409);
 const propuesta=await api('propuestas',{desde:dia,hasta:dia},'POST');assert.equal(propuesta.status,200);assert.equal(propuesta.datos.propuestas.length,0);const futura=await api('propuestas',{desde:proxima,hasta:proxima},'POST');assert.equal(futura.status,200,JSON.stringify(futura));assert.equal(futura.datos.propuestas.length,1);assert.equal((await db.query('SELECT count(*)::int n FROM transporte.viajes WHERE cooperativa_id=$1',[c])).rows[0].n,1,'Generar una propuesta no debe escribir viajes');
 const politicaVacia=await api('politica');assert.equal(politicaVacia.status,200);assert.deepEqual(politicaVacia.datos.versiones,[]);
 const payloadPolitica={condiciones:'Política temporal de prueba; reserva completa',plazo_abono_dias:5,permite_parcial:false,reglas:[{minutos_desde:0,minutos_hasta:240,porcentaje_bp:null},{minutos_desde:240,minutos_hasta:720,porcentaje_bp:2500},{minutos_desde:720,minutos_hasta:1440,porcentaje_bp:5000},{minutos_desde:1440,minutos_hasta:null,porcentaje_bp:10000}]};
 const guardarP=await api('politica',payloadPolitica);assert.equal(guardarP.status,200,JSON.stringify(guardarP));let pol=guardarP.datos.politica;
 assert.equal((await api('politica/publicar',{id:pol.id,revision:pol.revision},'POST')).status,422,'La política incompleta no se publica');
 const completaP=await api('politica',{...payloadPolitica,id:pol.id,revision:pol.revision,reglas:payloadPolitica.reglas.map(r=>({...r,porcentaje_bp:r.porcentaje_bp??0}))});assert.equal(completaP.status,200,JSON.stringify(completaP));
 assert.equal((await api('politica',{...payloadPolitica,id:pol.id,revision:pol.revision})).status,409,'Se rechaza una revisión antigua');pol=completaP.datos.politica;
 const publicarP=await api('politica/publicar',{id:pol.id,revision:pol.revision},'POST');assert.equal(publicarP.status,200,JSON.stringify(publicarP));pol=publicarP.datos.politica;assert.equal(pol.estado,'PUBLICADA');
 const existente=ctx.datos.tarifas.find((t:{activa:boolean})=>t.activa);
 const atomico=await api('configuracion-tarifas',{frecuenciaId:fid,version:2,tarifas:[{...existente,precio:1300}],beneficios:[{codigo:'NINO',descuento_bp:null,edad_min:0,edad_max_exclusiva:12,condiciones:'',activo:true,desde:dia,hasta:null}]});assert.equal(atomico.status,422,JSON.stringify(atomico));assert.equal((await db.query('SELECT precio_centavos::int precio FROM transporte.tarifas WHERE frecuencia_id=$1 AND activa',[fid])).rows[0].precio,1200,'El fallo de un beneficio revierte también las tarifas');
 const compra=await contexto(cliente.token,async tx=>{
  const encontrados=await tx.query('SELECT * FROM transporte.buscar_viajes($1,$2,$3::date,1)',[city1,city2,dia]);assert.ok(encontrados.rows.some(v=>Object.values(v).includes(vid)),'El viaje publicado debe aparecer en la búsqueda real');
  const rid=(await tx.query('SELECT transporte.reservar_asientos($1,0,1,$2::uuid[]) id',[vid,[asiento]])).rows[0].id;
  const ra=(await tx.query('SELECT id FROM transporte.reserva_asientos WHERE reserva_id=$1',[rid])).rows[0].id;
  await tx.query('SELECT transporte.compra_guardar_pasajeros($1,$2::jsonb)',[rid,JSON.stringify({contacto:{email:'prueba@example.invalid',telefono:'+593991234567'},pasajeros:[{reserva_asiento_id:ra,nombres:'Pasajero',apellidos:'Prueba',tipo_documento:'OTRO',documento:'PRUEBA-OP',nacimiento:'1990-01-01',tipo_pasajero:'ADULTO'}]})]);
  await tx.query('SELECT transporte.cotizar($1)',[rid]);const r=(await tx.query('SELECT cotizacion_version FROM transporte.reservas WHERE id=$1',[rid])).rows[0];await tx.query('SELECT transporte.aceptar_cotizacion($1,$2)',[rid,r.cotizacion_version]);return rid;
 });
 await contexto(admin.token,async tx=>{await tx.query('SELECT transporte.cobrar_efectivo($1,2000,$2)',[compra,randomUUID()]);});
 assert.equal((await db.query('SELECT estado FROM transporte.reservas WHERE id=$1',[compra])).rows[0].estado,'CONFIRMADA');
 assert.equal((await db.query('SELECT count(*)::int n FROM transporte.boletos WHERE compra_id IN(SELECT id FROM transporte.compras WHERE reserva_id=$1)',[compra])).rows[0].n,1);
 const hoy=new Date().toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'});
 const reporte=await api('reportes?desde='+hoy+'&hasta='+hoy,undefined,'GET',admin.token);assert.equal(reporte.status,200,JSON.stringify(reporte));assert.equal(reporte.datos.kpis.cobrado,1200);assert.equal(reporte.datos.kpis.devuelto,0);assert.equal(reporte.datos.kpis.pasajeros,1);assert.equal(reporte.datos.porCooperativa.length,1);
 assert.equal((await api('reportes?desde='+hoy+'&hasta='+hoy,undefined,'GET',cliente.token)).status,403);
 assert.equal((await api('reportes?desde='+hoy+'&hasta='+hoy,undefined,'GET',ajeno.token)).status,403);
 const nuevaPolitica=await api('politica',{...pol,condiciones:'Nueva versión que no debe afectar compras anteriores',plazo_abono_dias:7});assert.equal(nuevaPolitica.status,200,JSON.stringify(nuevaPolitica));const pol2=nuevaPolitica.datos.politica;assert.notEqual(pol2.id,pol.id);assert.equal((await api('politica/publicar',{id:pol2.id,revision:pol2.revision},'POST')).status,200);assert.equal((await db.query('SELECT politica_reembolso_id FROM transporte.compras WHERE reserva_id=$1',[compra])).rows[0].politica_reembolso_id,pol.id);
 assert.equal((await api('cancelar',{id:vid,version:2},'POST')).status,422);
 async function reembolso(token:string,body?:unknown,origin=process.env.FRONTEND_URL??'http://127.0.0.1:5173',reservaObjetivo=compra){
  const r=await fetch(`http://127.0.0.1:${port}/api/reservas/${reservaObjetivo}/reembolso`,{method:body?'POST':'GET',headers:{Cookie:token?'transporte_sesion='+token:'',Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,datos:await r.json()};
 }
 assert.equal((await reembolso('')).status,401);
 assert.equal((await reembolso(ajeno.token)).status,404);
 const elegible=await reembolso(cliente.token);assert.equal(elegible.status,200,JSON.stringify(elegible));assert.equal(elegible.datos.elegibilidad.elegible,true);assert.equal(elegible.datos.elegibilidad.politicaId,pol.id);
 const pedir={motivo:'Solicitud real de prueba del cliente',clave:randomUUID()};
 assert.equal((await reembolso(cliente.token,pedir,'https://ajeno.invalid')).status,403);
 assert.equal((await reembolso(ajeno.token,pedir)).status,404);
 const solicitada=await reembolso(cliente.token,pedir);assert.equal(solicitada.status,201,JSON.stringify(solicitada));
 assert.equal((await reembolso(cliente.token,pedir)).datos.id,solicitada.datos.id,'Reintento idempotente');
 assert.equal((await reembolso(cliente.token,{...pedir,clave:randomUUID()})).status,409,'Una sola solicitud activa');
 const seguimiento=await reembolso(cliente.token);assert.equal(seguimiento.datos.solicitud.estado,'SOLICITADO');
 assert.equal((await db.query('SELECT estado FROM transporte.reservas WHERE id=$1',[compra])).rows[0].estado,'CONFIRMADA','Solicitar no cancela ni abona');


 async function comprarExtras(ids:string[]){const rid=await contexto(cliente.token,async tx=>{const rid=(await tx.query('SELECT transporte.reservar_asientos($1,0,1,$2::uuid[]) id',[vid,ids])).rows[0].id;const asientos=(await tx.query('SELECT id FROM transporte.reserva_asientos WHERE reserva_id=$1 ORDER BY id',[rid])).rows;await tx.query('SELECT transporte.compra_guardar_pasajeros($1,$2::jsonb)',[rid,JSON.stringify({contacto:{email:'parcial@example.invalid',telefono:'+593991234567'},pasajeros:asientos.map((ra,i)=>({reserva_asiento_id:ra.id,nombres:'Pasajero',apellidos:'Parcial '+i,tipo_documento:'OTRO',documento:'PARCIAL-'+randomUUID().slice(0,20),nacimiento:'1990-01-01',tipo_pasajero:'ADULTO'}))})]);await tx.query('SELECT transporte.cotizar($1)',[rid]);const v=(await tx.query('SELECT cotizacion_version FROM transporte.reservas WHERE id=$1',[rid])).rows[0].cotizacion_version;await tx.query('SELECT transporte.aceptar_cotizacion($1,$2)',[rid,v]);return rid;});await contexto(admin.token,async tx=>{await tx.query('SELECT transporte.cobrar_efectivo($1,3000,$2)',[rid,randomUUID()]);});return rid;}
 const sinParcial=await comprarExtras(asientosExtra.slice(0,2));
 const sinParcialDatos=await reembolso(cliente.token,undefined,undefined,sinParcial);assert.equal(sinParcialDatos.status,200,JSON.stringify(sinParcialDatos));
 const raSin=sinParcialDatos.datos.asientos[0].id;
 assert.equal((await reembolso(cliente.token,{motivo:'Parcial no autorizado',clave:randomUUID(),asientos:[raSin]},undefined,sinParcial)).status,409,'No se cambia la política histórica');
 const publicadaActual=(await api('politica')).datos.versiones.find((p:any)=>p.id===pol2.id);
 const conParcial=await api('politica',{...publicadaActual,permite_parcial:true,condiciones:'Política de prueba con cancelación parcial',plazo_abono_dias:5});assert.equal(conParcial.status,200,JSON.stringify(conParcial));
 const polParcial=conParcial.datos.politica;assert.equal((await api('politica/publicar',{id:polParcial.id,revision:polParcial.revision},'POST')).status,200);
 const parcial=await comprarExtras(asientosExtra.slice(2));const informacion=await reembolso(cliente.token,undefined,undefined,parcial);assert.equal(informacion.status,200,JSON.stringify(informacion));assert.equal(informacion.datos.politica.permite_parcial,true);
 const seleccionados=informacion.datos.asientos.map((x:any)=>x.id);
 const payload={motivo:'Cancelar solo un pasajero',clave:randomUUID(),asientos:[seleccionados[0]]};
 const primera=await reembolso(cliente.token,payload,undefined,parcial);assert.equal(primera.status,201,JSON.stringify(primera));
 assert.equal((await reembolso(cliente.token,payload,undefined,parcial)).datos.id,primera.datos.id);
 assert.equal((await reembolso(cliente.token,{...payload,asientos:[seleccionados[1]]},undefined,parcial)).status,409,'Una clave no puede cambiar de pasajero');
 await contexto(admin.token,async tx=>{await tx.query('SELECT transporte.decidir_reembolso($1,true,$2)',[primera.datos.id,'Aprobación parcial de prueba']);});
 assert.equal((await db.query("SELECT count(*)::int n FROM transporte.reserva_asientos WHERE reserva_id=$1 AND estado='CONFIRMADO'",[parcial])).rows[0].n,1);
 assert.equal((await db.query('SELECT estado FROM transporte.reservas WHERE id=$1',[parcial])).rows[0].estado,'CONFIRMADA');
 const {consultar,emitir}=await import('../pagos/router.js');await contexto(admin.token,async tx=>{const cid=(await tx.query('SELECT id FROM transporte.compras WHERE reserva_id=$1',[parcial])).rows[0].id;await emitir(tx,cid,archivosPrueba);});const vigentes=await contexto(cliente.token,tx=>consultar(tx,parcial));assert.equal(vigentes.documento?.estado,'LISTO','Se regenera el PDF para los pasajeros vigentes');assert.equal(archivosPrueba.length,1);assert.equal(vigentes.pasajeros.length,1);assert.equal(vigentes.reembolsos?.enTramiteCentavos,1200);
 await contexto(admin.token,async tx=>{await tx.query('SELECT transporte.registrar_abono_reembolso($1,$2,NULL,$3)',[primera.datos.id,'ABONO-PARCIAL',randomUUID()]);});
 const segunda=await reembolso(cliente.token,{motivo:'Cancelar el pasajero restante',clave:randomUUID(),asientos:null},undefined,parcial);assert.equal(segunda.status,201,JSON.stringify(segunda));
 assert.equal((await db.query('SELECT monto_centavos::int monto FROM transporte.solicitudes_reembolso WHERE id=$1',[segunda.datos.id])).rows[0].monto,1200,'Solo se reintegra el importe restante');
 await contexto(admin.token,async tx=>{await tx.query('SELECT transporte.decidir_reembolso($1,true,$2)',[segunda.datos.id,'Aprobación del resto']);await tx.query('SELECT transporte.registrar_abono_reembolso($1,$2,NULL,$3)',[segunda.datos.id,'ABONO-RESTANTE',randomUUID()]);});
 assert.equal((await db.query('SELECT estado FROM transporte.compras WHERE reserva_id=$1',[parcial])).rows[0].estado,'REEMBOLSADA');
 assert.equal((await db.query('SELECT sum(ab.monto_centavos)::int monto FROM transporte.reembolsos ab JOIN transporte.solicitudes_reembolso s ON s.id=ab.solicitud_id JOIN transporte.compras c ON c.id=s.compra_id WHERE c.reserva_id=$1',[parcial])).rows[0].monto,2400);
 const versionCoop=(await db.query('SELECT version FROM transporte.cooperativas WHERE id=$1',[c])).rows[0].version;
 assert.equal((await api('cooperativas/'+c+'/estado',{activa:false,version:versionCoop})).status,403);
 const desactivar=await api('cooperativas/'+c+'/estado',{activa:false,version:versionCoop},'PUT',admin.token);assert.equal(desactivar.status,200,JSON.stringify(desactivar));assert.equal(desactivar.datos.cooperativa.activa,false);assert.equal(desactivar.datos.cooperativa.version,versionCoop+1);
 assert.equal((await api('cooperativas/'+c+'/estado',{activa:true,version:versionCoop},'PUT',admin.token)).status,409);
 const activar=await api('cooperativas/'+c+'/estado',{activa:true,version:versionCoop+1},'PUT',admin.token);assert.equal(activar.status,200);assert.equal(activar.datos.cooperativa.activa,true);

 }finally{if(server)await new Promise<void>((r,j)=>server!.close(e=>e?j(e):r()));await db.query('ROLLBACK');await (await import('../pagos/archivos.js')).borrarCreados(archivosPrueba);db.release();await owner.end();}
});
