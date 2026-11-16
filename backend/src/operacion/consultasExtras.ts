import {createHash} from 'node:crypto';
import type {Router,Request} from 'express';
import type {PoolClient} from 'pg';
import {uuid} from '../pagos/validacion';
import {ErrorOperacion,exigir,entero,rango} from './validacion';
type Sesion=<T>(req:Request,fn:(db:PoolClient)=>Promise<T>)=>Promise<T>;
type Ambito=(db:PoolClient,req:Request,permiso?:string)=>Promise<{id:string}>;
async function politica(db:PoolClient,c:string,id:string,lock=false){
 const p=(await db.query('SELECT id,numero_version,estado,condiciones,plazo_abono_dias,permite_parcial,publicada_at FROM transporte.politicas_reembolso WHERE id=$1 AND cooperativa_id=$2',[id,c])).rows[0];
 if(!p)throw new ErrorOperacion(404,'Política no disponible.');
 if(lock&&p.estado==='BORRADOR')await db.query("SELECT id FROM transporte.politicas_reembolso WHERE id=$1 AND cooperativa_id=$2 AND estado='BORRADOR' FOR UPDATE",[id,c]);
 p.reglas=(await db.query('SELECT id,minutos_desde,minutos_hasta,porcentaje_bp FROM transporte.reglas_reembolso WHERE politica_id=$1 ORDER BY minutos_desde',[id])).rows;
 return {...p,revision:createHash('sha256').update(JSON.stringify(p)).digest('hex')};
}
export function cobertura(reglas:{minutos_desde:number;minutos_hasta:number|null;porcentaje_bp:number|null}[]){let siguiente=0,completa=false;for(const r of [...reglas].sort((a,b)=>a.minutos_desde-b.minutos_desde)){if(completa||r.minutos_desde!==siguiente||r.porcentaje_bp===null)return false;if(r.minutos_hasta===null)completa=true;else siguiente=r.minutos_hasta;}return completa;}
export function registrarExtras(router:Router,sesion:Sesion,ambito:Ambito){
 router.put('/cooperativas/:id/estado',async(req,res,next)=>{try{res.json(await sesion(req,async db=>{
  exigir(typeof req.body.activa==='boolean','Indica si deseas activar o desactivar la cooperativa.');const version=entero(req.body.version,1);
  if(!(await db.query("SELECT transporte.puede('cooperativas.admin') ok")).rows[0].ok)throw new ErrorOperacion(403,'Solo un administrador puede cambiar este estado.');
  const r=(await db.query('UPDATE transporte.cooperativas SET activa=$3,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 RETURNING id,activa,version',[uuid(req.params.id),version,req.body.activa])).rows[0];
  if(!r)throw new ErrorOperacion(409,'La cooperativa cambió. Actualiza los datos e inténtalo otra vez.');
  return {cooperativa:r,mensaje:r.activa?'Cooperativa activada correctamente.':'Cooperativa desactivada correctamente.'};
 }));}catch(e){next(e);}});
 router.get('/politica',async(req,res,next)=>{try{res.json(await sesion(req,async db=>{const {id:c}=await ambito(db,req);const ids=(await db.query("SELECT id FROM transporte.politicas_reembolso WHERE cooperativa_id=$1 ORDER BY (estado='BORRADOR') DESC,numero_version DESC LIMIT 10",[c])).rows;const versiones=[];for(const p of ids)versiones.push(await politica(db,c,p.id));return {versiones};}));}catch(e){next(e);}});
 router.put('/politica',async(req,res,next)=>{try{res.json(await sesion(req,async db=>{
  const {id:c}=await ambito(db,req,'tarifas.admin'),d=req.body;exigir(typeof d.condiciones==='string'&&d.condiciones.length<=4000&&!/[<>\x00-\x08]/.test(d.condiciones),'Revisa las condiciones de la política.');
  exigir(typeof d.permite_parcial==='boolean','Indica si se permite cancelación parcial.');const plazo=d.plazo_abono_dias===null?null:entero(d.plazo_abono_dias,1,365);
  exigir(Array.isArray(d.reglas)&&d.reglas.length>0&&d.reglas.length<=20,'Define entre una y 20 reglas.');
  const reglas=d.reglas.map((r:{minutos_desde:unknown;minutos_hasta:unknown;porcentaje_bp:unknown})=>({minutos_desde:entero(r.minutos_desde,0,525600),minutos_hasta:r.minutos_hasta===null?null:entero(r.minutos_hasta,1,525600),porcentaje_bp:r.porcentaje_bp===null?null:entero(r.porcentaje_bp,0,10000)})).sort((a:{minutos_desde:number},b:{minutos_desde:number})=>a.minutos_desde-b.minutos_desde);
  for(let i=0;i<reglas.length;i++){const r=reglas[i];exigir(r.minutos_hasta===null||r.minutos_hasta>r.minutos_desde,'Revisa los límites horarios.');if(i)exigir(reglas[i-1].minutos_hasta!==null&&reglas[i-1].minutos_hasta<=r.minutos_desde,'Las reglas no pueden superponerse.');}
  let id:string|null=d.id?uuid(d.id):null;const anterior=id?await politica(db,c,id,true):null;
  if(anterior&&anterior.revision!==d.revision)throw new ErrorOperacion(409,'La política cambió. Recarga antes de guardar.');
  if(!anterior||anterior.estado!=='BORRADOR'){
   exigir(!(await db.query("SELECT 1 FROM transporte.politicas_reembolso WHERE cooperativa_id=$1 AND estado='BORRADOR'",[c])).rowCount,'Ya existe un borrador. Selecciónalo para continuar.');
   id=(await db.query("INSERT INTO transporte.politicas_reembolso(cooperativa_id,numero_version,condiciones,plazo_abono_dias,permite_parcial)SELECT $1,coalesce(max(numero_version),0)+1,$2,$3,$4 FROM transporte.politicas_reembolso WHERE cooperativa_id=$1 RETURNING id",[c,d.condiciones.trim(),plazo,d.permite_parcial])).rows[0].id;
  }else await db.query('UPDATE transporte.politicas_reembolso SET condiciones=$2,plazo_abono_dias=$3,permite_parcial=$4 WHERE id=$1',[id,d.condiciones.trim(),plazo,d.permite_parcial]);
  await db.query('DELETE FROM transporte.reglas_reembolso WHERE politica_id=$1',[id]);
  for(const r of reglas.filter((r:{porcentaje_bp:number|null})=>r.porcentaje_bp!==null))await db.query('INSERT INTO transporte.reglas_reembolso(cooperativa_id,politica_id,minutos_desde,minutos_hasta,porcentaje_bp)VALUES($1,$2,$3,$4,$5)',[c,id,r.minutos_desde,r.minutos_hasta,r.porcentaje_bp]);
  return {politica:await politica(db,c,id!),mensaje:'Borrador guardado. La política publicada no cambia hasta que publiques esta versión.'};
 }));}catch(e){next(e);}});
 router.post('/politica/publicar',async(req,res,next)=>{try{res.json(await sesion(req,async db=>{
  const {id:c}=await ambito(db,req,'tarifas.admin'),p=await politica(db,c,uuid(req.body.id),true);if(p.revision!==req.body.revision)throw new ErrorOperacion(409,'El borrador cambió. Recarga antes de publicar.');
  exigir(p.estado==='BORRADOR'&&p.condiciones?.trim()&&p.plazo_abono_dias&&cobertura(p.reglas),'Completa las condiciones, el plazo de abono y todos los intervalos antes de publicar.');
  await db.query('SELECT transporte.publicar_politica_reembolso($1)',[p.id]);return {politica:await politica(db,c,p.id),mensaje:'Política publicada. Se aplicará a nuevas compras; las anteriores conservan su versión.'};
 }));}catch(e){next(e);}});
 router.get('/reportes',async(req,res,next)=>{try{res.json(await sesion(req,async db=>{
  const hoy=new Date().toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'}),r=rango(req.query.desde??hoy,req.query.hasta??hoy),estado=String(req.query.estado??'');exigir(['','PENDIENTE','EN_REVISION','APROBADO','RECHAZADO'].includes(estado),'Estado de pago inválido.');
  const cooperativas=(await db.query("SELECT id,nombre FROM transporte.cooperativas WHERE transporte.puede('reportes.leer',id) ORDER BY nombre")).rows;
  if(!cooperativas.length)throw new ErrorOperacion(403,'No tienes permiso para consultar reportes.');const seleccion=req.query.cooperativaId?uuid(req.query.cooperativaId):null;if(seleccion&&!cooperativas.some(c=>c.id===seleccion))throw new ErrorOperacion(403,'Cooperativa fuera del ámbito autorizado.');const ids=seleccion?[seleccion]:cooperativas.map(c=>c.id);
  const ventas=(await db.query(`SELECT c.cooperativa_id,to_char(p.confirmado_at AT TIME ZONE 'America/Guayaquil','YYYY-MM-DD') fecha,c.viaje_snapshot#>>'{bus,grupo}' servicio,count(*)::int compras,sum(re.cantidad)::int pasajeros,sum(c.total_pagado_centavos)::text cobrado FROM transporte.compras c JOIN transporte.pagos p ON p.id=c.pago_id JOIN transporte.reservas re ON re.id=c.reserva_id JOIN transporte.intentos_pago i ON i.id=p.intento_id WHERE c.cooperativa_id=ANY($1::uuid[]) AND (p.confirmado_at AT TIME ZONE 'America/Guayaquil')::date BETWEEN $2::date AND $3::date AND ($4='' OR i.estado=$4) GROUP BY c.cooperativa_id,fecha,servicio ORDER BY fecha`,[ids,r.desde,r.hasta,estado])).rows.map(v=>({...v,cobrado:Number(v.cobrado)}));
  const devoluciones=(await db.query(`SELECT r.cooperativa_id,sum(r.monto_centavos)::text devuelto FROM transporte.reembolsos r JOIN transporte.pagos p ON p.id=r.pago_id JOIN transporte.intentos_pago i ON i.id=p.intento_id WHERE r.cooperativa_id=ANY($1::uuid[]) AND (r.ejecutado_at AT TIME ZONE 'America/Guayaquil')::date BETWEEN $2::date AND $3::date AND ($4='' OR i.estado=$4) GROUP BY r.cooperativa_id`,[ids,r.desde,r.hasta,estado])).rows;
  const porCooperativa=cooperativas.filter(c=>ids.includes(c.id)).map(c=>{const vs=ventas.filter(v=>v.cooperativa_id===c.id),cobrado=vs.reduce((a,v)=>a+v.cobrado,0),devuelto=Number(devoluciones.find(v=>v.cooperativa_id===c.id)?.devuelto??0);return {...c,compras:vs.reduce((a,v)=>a+v.compras,0),pasajeros:vs.reduce((a,v)=>a+v.pasajeros,0),cobrado,devuelto,neto:cobrado-devuelto};});
  const eventos=(await db.query(`SELECT a.id,a.created_at fecha,coalesce(u.nombres||' '||u.apellidos,'Usuario del sistema') usuario,a.accion,a.entidad FROM transporte.auditoria a LEFT JOIN transporte.usuarios u ON u.id=a.actor_id WHERE (a.cooperativa_id=ANY($1::uuid[]) OR (a.cooperativa_id IS NULL AND $4::boolean AND transporte.puede('auditoria.leer'))) AND (a.created_at AT TIME ZONE 'America/Guayaquil')::date BETWEEN $2::date AND $3::date ORDER BY a.created_at DESC,a.id DESC LIMIT 100`,[ids,r.desde,r.hasta,!seleccion])).rows;
  const kpis=porCooperativa.reduce((a,c)=>({cobrado:a.cobrado+c.cobrado,devuelto:a.devuelto+c.devuelto,neto:a.neto+c.neto,pasajeros:a.pasajeros+c.pasajeros}),{cobrado:0,devuelto:0,neto:0,pasajeros:0});
  return {cooperativas,porCooperativa,ventas,eventos,kpis,filtros:{...r,estado,cooperativaId:seleccion??''}};
 }));}catch(e){next(e);}});
}
