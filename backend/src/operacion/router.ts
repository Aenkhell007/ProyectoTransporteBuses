import {registrarExtras} from './consultasExtras';
import express, {type Request} from 'express';
import type {PoolClient} from 'pg';
import {conSesion} from '../sesion';
import {uuid} from '../pagos/validacion';
import {ErrorOperacion, exigir, texto, entero, fecha, hora, rango, paradas} from './validacion';

async function sesion<T>(req: Request, fn: (db:PoolClient)=>Promise<T>) {
  const token=req.cookies?.transporte_sesion;
  if(typeof token!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(token)) throw new ErrorOperacion(401,'Inicia sesión para continuar.');
  return conSesion(token,fn);
}
async function ambito(db:PoolClient, req:Request, permiso='cooperativa.leer') {
  const disponibles=(await db.query("SELECT id,nombre FROM transporte.cooperativas WHERE activa AND transporte.puede($1,id) ORDER BY nombre",[permiso])).rows;
  const id=req.query.cooperativaId ? uuid(req.query.cooperativaId) : disponibles[0]?.id;
  if(!id||!disponibles.some(c=>c.id===id)) throw new ErrorOperacion(403,'No tienes acceso a esta cooperativa. Solicita una asignación al administrador.');
  if(req.method!=='GET') await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",['operacion:'+id]);
  return {id,disponibles};
}
async function versionFrecuencia(db:PoolClient,c:string,id:string,version:unknown) {
  const f=(await db.query('SELECT * FROM transporte.frecuencias WHERE id=$1 AND cooperativa_id=$2 FOR UPDATE',[id,c])).rows[0];
  if(!f) throw new ErrorOperacion(404,'Frecuencia no disponible.');
  if(f.version!==version) throw new ErrorOperacion(409,'La frecuencia cambió. Recarga antes de guardar.');
  return f;
}
async function catalogo(db:PoolClient,c:string,desde:string,hasta:string) {
  const cooperativa=(await db.query('SELECT id,nombre,ambito_operacion,provincia FROM transporte.cooperativas WHERE id=$1',[c])).rows[0];
  const frecuencias=(await db.query(`SELECT f.id,f.codigo,to_char(f.hora_salida,'HH24:MI') hora,f.resolucion_ant resolucion,f.tipo_viaje tipo,f.activa,f.version,f.ruta_id,
    r.nombre ruta,coalesce((SELECT jsonb_agg(jsonb_build_object('terminalId',p.terminal_id,'minutos',p.minutos_desde_origen,'orden',p.orden,'ciudad',ci.nombre,'terminal',t.nombre) ORDER BY p.orden) FROM transporte.ruta_paradas p JOIN transporte.terminales t ON t.id=p.terminal_id JOIN transporte.ciudades ci ON ci.id=t.ciudad_id WHERE p.ruta_id=f.ruta_id),'[]') paradas,
    coalesce((SELECT jsonb_agg(grupo_id) FROM transporte.frecuencia_grupo WHERE frecuencia_id=f.id),'[]') grupos,
    EXISTS(SELECT 1 FROM transporte.viajes WHERE frecuencia_id=f.id) usada
    FROM transporte.frecuencias f JOIN transporte.rutas r ON r.id=f.ruta_id WHERE f.cooperativa_id=$1 ORDER BY f.codigo`,[c])).rows;
  const grupos=(await db.query(`SELECT g.id,g.nombre,g.activo,coalesce((SELECT jsonb_agg(dia_iso) FROM transporte.grupo_dias_parada WHERE grupo_id=g.id),'[]') descanso FROM transporte.grupos_bus g WHERE cooperativa_id=$1 ORDER BY nombre`,[c])).rows;
  const buses=(await db.query(`SELECT b.id,b.unidad,b.placa,b.grupo_id,b.activo,(SELECT id FROM transporte.planos p WHERE p.bus_id=b.id AND p.publicado AND EXISTS(SELECT 1 FROM transporte.plano_celdas pc WHERE pc.plano_id=p.id AND pc.tipo='ASIENTO' AND pc.activa) ORDER BY numero_version DESC LIMIT 1) plano_id FROM transporte.buses b WHERE b.cooperativa_id=$1 ORDER BY unidad`,[c])).rows;
  const viajes=(await db.query(`SELECT v.id,v.frecuencia_id,v.bus_id,v.plano_id,v.conductor_id,v.estado,v.version,v.salida,v.llegada,v.liberacion_bus,to_char(v.salida AT TIME ZONE 'America/Guayaquil','YYYY-MM-DD') fecha,to_char(v.salida AT TIME ZONE 'America/Guayaquil','HH24:MI') hora FROM transporte.viajes v WHERE v.cooperativa_id=$1 AND (v.salida AT TIME ZONE 'America/Guayaquil')::date BETWEEN $2::date AND $3::date ORDER BY v.salida,v.id`,[c,desde,hasta])).rows;
  const tarifas=(await db.query(`SELECT id,frecuencia_id,grupo_id,clase_id,origen_orden,destino_orden,precio_centavos::int precio,servicio_centavos::int servicio,impuesto_id,impuesto_servicio_id,lower(vigencia)::text desde,upper(vigencia)::text hasta,activa FROM transporte.tarifas WHERE cooperativa_id=$1 ORDER BY frecuencia_id,origen_orden,destino_orden`,[c])).rows;
  const beneficios=(await db.query(`SELECT id,codigo,nombre,descuento_bp,edad_min,edad_max_exclusiva,condiciones,activo,lower(vigencia)::text desde,upper(vigencia)::text hasta,updated_at::text revision FROM transporte.beneficios WHERE cooperativa_id=$1 ORDER BY codigo,created_at`,[c])).rows;
  const terminales=(await db.query('SELECT t.id,t.nombre,c.nombre ciudad FROM transporte.terminales t JOIN transporte.ciudades c ON c.id=t.ciudad_id WHERE t.activa AND c.activa AND (t.cooperativa_id IS NULL OR t.cooperativa_id=$1) ORDER BY c.nombre,t.nombre',[c])).rows;
  const cantonesProvincia = cooperativa.provincia && ['URBANA', 'RURAL'].includes(cooperativa.ambito_operacion)
    ? (await db.query(`
        SELECT id, nombre, provincia FROM transporte.ciudades
        WHERE activa AND lower(trim(provincia)) = lower(trim($1))
        ORDER BY nombre`, [cooperativa.provincia])).rows
    : [];
  const clases=(await db.query('SELECT id,nombre,codigo FROM transporte.clases_asiento ORDER BY nombre')).rows;
  const impuestos=(await db.query('SELECT id,nombre,puntos_base,concepto FROM transporte.impuestos WHERE activo ORDER BY concepto,nombre')).rows;
  const conductores=(await db.query(`SELECT DISTINCT u.id,u.nombres||' '||u.apellidos nombre FROM transporte.usuarios u JOIN transporte.membresias m ON m.usuario_id=u.id JOIN transporte.roles r ON r.id=m.rol_id WHERE m.cooperativa_id=$1 AND m.activa AND u.activo AND r.codigo='PERSONAL_BUS' ORDER BY nombre`,[c])).rows;
  const indisponibilidades=(await db.query('SELECT bus_id,desde,hasta,motivo FROM transporte.indisponibilidades_bus WHERE cooperativa_id=$1 AND hasta>=$2::date AND desde<($3::date+1)',[c,desde,hasta])).rows;
  const permisos=(await db.query("SELECT transporte.puede('operacion.admin',$1) operacion,transporte.puede('tarifas.admin',$1) tarifas",[c])).rows[0];
  return {cooperativa,frecuencias,grupos,buses,viajes,tarifas,beneficios,terminales,cantonesProvincia,clases,impuestos,conductores,indisponibilidades,permisos};
}
export function crearOperacionRouter(contexto:typeof sesion=sesion) {
 const router=express.Router();
 router.use(express.json({limit:'128kb'}));
 router.use((req,res,next)=>{res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(req.method!=='GET'&&![process.env.FRONTEND_URL??'http://127.0.0.1:5173','http://localhost:5173'].includes(req.get('origin')??''))return next(new ErrorOperacion(403,'Origen no autorizado.'));next();});
 router.get('/contexto',async(req,res,next)=>{try{res.json(await contexto(req,async db=>{const a=await ambito(db,req);const hoy=new Date().toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'});const r=rango(req.query.desde??hoy,req.query.hasta??hoy);return {...await catalogo(db,a.id,r.desde,r.hasta),cooperativas:a.disponibles};}));}catch(e){next(e);}});
 router.post('/paraderos', async (req, res, next) => {
   try {
     const { ciudadId, nombre } = req.body ?? {};
     const canton = uuid(ciudadId);
     const nombreParadero = texto(nombre);
     exigir(nombreParadero.length >= 2, 'El nombre del paradero debe tener al menos dos caracteres.');

     const paradero = await contexto(req, async db => {
       const { id } = await ambito(db, req, 'operacion.admin');
       const resultado = await db.query<{ id: string }>(
         "SELECT transporte.registrar_paradero_local($1,$2,$3,'PARADERO') AS id",
         [id, canton, nombreParadero],
       );
       return { id: resultado.rows[0].id, mensaje: 'Paradero registrado. Ya puedes seleccionarlo en la frecuencia.' };
     });
     res.status(201).json(paradero);
   } catch (error) {
     next(error);
   }
 });
 router.put('/frecuencias',async(req,res,next)=>{try{res.json(await contexto(req,async db=>{
  const {id:c}=await ambito(db,req,'operacion.admin'),d=req.body,ps=paradas(d.paradas),codigo=texto(d.codigo,50),resolucion=texto(d.resolucion),h=hora(d.hora);
  exigir(d.tipo==='DIRECTO'||d.tipo==='CON_PARADAS','Selecciona un tipo de viaje.');exigir(typeof d.activa==='boolean','Selecciona el estado.');exigir(d.tipo!=='DIRECTO'||ps.length===2,'Una frecuencia directa solo tiene origen y destino.');
  exigir(Array.isArray(d.grupos)&&d.grupos.length>0&&d.grupos.length<=50,'Habilita al menos un grupo de buses.');const gs=[...new Set<string>(d.grupos.map(uuid))];
  exigir((await db.query('SELECT id FROM transporte.grupos_bus WHERE cooperativa_id=$1 AND activo AND id=ANY($2::uuid[])',[c,gs])).rowCount===gs.length,'Los grupos deben estar activos y pertenecer a esta cooperativa.');
  exigir((await db.query('SELECT id FROM transporte.terminales WHERE activa AND id=ANY($1::uuid[]) AND (cooperativa_id IS NULL OR cooperativa_id=$2)',[ps.map(p=>uuid(p.terminalId)),c])).rowCount===ps.length,'Las terminales y paraderos deben estar activos y disponibles para esta cooperativa.');
  let id=d.id?uuid(d.id):null;let rutaId:string;
  if(id){const f=await versionFrecuencia(db,c,id,d.version);rutaId=f.ruta_id;const usadas=(await db.query('SELECT 1 FROM transporte.viajes WHERE frecuencia_id=$1 LIMIT 1',[id])).rowCount;
   const old=(await db.query('SELECT terminal_id AS "terminalId",minutos_desde_origen AS minutos FROM transporte.ruta_paradas WHERE ruta_id=$1 ORDER BY orden',[rutaId])).rows;
   if(usadas&&(JSON.stringify(old)!==JSON.stringify(ps)||f.hora_salida.slice(0,5)!==h||f.tipo_viaje!==d.tipo))throw new ErrorOperacion(409,'La frecuencia ya tiene viajes. Crea otra para cambiar su ruta, horarios o paradas y conservar el historial.');
   if(!usadas&&JSON.stringify(old)!==JSON.stringify(ps)){
    exigir(!(await db.query('SELECT 1 FROM transporte.tarifas WHERE frecuencia_id=$1 LIMIT 1',[id])).rowCount,'La frecuencia ya tiene tarifas. Crea otra para cambiar sus paradas sin alterar los tramos existentes.');
    const nombre=(await db.query(`SELECT string_agg(ci.nombre,' → ' ORDER BY p.orden) nombre FROM unnest($1::uuid[]) WITH ORDINALITY p(id,orden) JOIN transporte.terminales t ON t.id=p.id JOIN transporte.ciudades ci ON ci.id=t.ciudad_id`,[[ps[0].terminalId,ps[ps.length-1].terminalId]])).rows[0].nombre;
    rutaId=(await db.query('INSERT INTO transporte.rutas(cooperativa_id,nombre)VALUES($1,$2)RETURNING id',[c,nombre])).rows[0].id;
    for(const[p,pv]of ps.entries())await db.query('INSERT INTO transporte.ruta_paradas(cooperativa_id,ruta_id,terminal_id,orden,minutos_desde_origen)VALUES($1,$2,$3,$4,$5)',[c,rutaId,pv.terminalId,p,pv.minutos]);
   }
   await db.query('UPDATE transporte.frecuencias SET codigo=$2,hora_salida=$3,resolucion_ant=$4,tipo_viaje=$5,activa=$6,ruta_id=$7,version=version+1,updated_at=now() WHERE id=$1',[id,codigo,h,resolucion,d.tipo,d.activa,rutaId]);
   const incompatibles=(await db.query(`SELECT 1 FROM transporte.viajes v JOIN transporte.buses b ON b.id=v.bus_id WHERE v.frecuencia_id=$1 AND v.estado IN('BORRADOR','PUBLICADO','EN_RUTA') AND NOT(b.grupo_id=ANY($2::uuid[])) LIMIT 1`,[id,gs])).rowCount;
   exigir(!incompatibles,'Hay viajes asignados a un grupo que intentas quitar.');await db.query('DELETE FROM transporte.frecuencia_grupo WHERE frecuencia_id=$1',[id]);
  }else{const nombre=(await db.query(`SELECT string_agg(c.nombre,' → ' ORDER BY p.orden) nombre FROM unnest($1::uuid[]) WITH ORDINALITY p(id,orden) JOIN transporte.terminales t ON t.id=p.id JOIN transporte.ciudades c ON c.id=t.ciudad_id`,[ [ps[0].terminalId,ps[ps.length-1].terminalId] ])).rows[0].nombre;rutaId=(await db.query('INSERT INTO transporte.rutas(cooperativa_id,nombre) VALUES($1,$2) RETURNING id',[c,nombre])).rows[0].id;
   for(const[p,pv]of ps.entries())await db.query('INSERT INTO transporte.ruta_paradas(cooperativa_id,ruta_id,terminal_id,orden,minutos_desde_origen)VALUES($1,$2,$3,$4,$5)',[c,rutaId,pv.terminalId,p,pv.minutos]);
   id=(await db.query('INSERT INTO transporte.frecuencias(cooperativa_id,ruta_id,codigo,hora_salida,resolucion_ant,tipo_viaje,activa) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[c,rutaId,codigo,h,resolucion,d.tipo,d.activa])).rows[0].id;}
  for(const g of gs)await db.query('INSERT INTO transporte.frecuencia_grupo(cooperativa_id,frecuencia_id,grupo_id)VALUES($1,$2,$3)',[c,id,g]);return {id,mensaje:'Frecuencia y paradas guardadas.'};
 }));}catch(e){next(e);}});
 router.put('/tarifas',async(req,res,next)=>{try{res.json(await contexto(req,async db=>{const {id:c}=await ambito(db,req,'tarifas.admin');return guardarTarifas(db,c,req.body);}));}catch(e){next(e);}});
 router.put('/beneficios',async(req,res,next)=>{try{res.json(await contexto(req,async db=>{const {id:c}=await ambito(db,req,'tarifas.admin');return guardarBeneficio(db,c,req.body);}));}catch(e){next(e);}});

 router.put('/configuracion-tarifas',async(req,res,next)=>{try{res.json(await contexto(req,async db=>{
  const {id:c}=await ambito(db,req,'tarifas.admin'),d=req.body;exigir(Array.isArray(d.tarifas)&&Array.isArray(d.beneficios)&&d.beneficios.length<=3,'Configuración no válida.');
  exigir(d.tarifas.length+d.beneficios.length>0,'No hay cambios que guardar.');
  if(d.tarifas.length)await guardarTarifas(db,c,d);
  for(const b of d.beneficios)await guardarBeneficio(db,c,b);
  return {mensaje:'Configuración guardada. Las compras confirmadas conservan sus importes.'};
 }));}catch(e){next(e);}});
 router.post('/propuestas',async(req,res,next)=>{try{res.json(await contexto(req,async db=>{
  const {id:c}=await ambito(db,req,'operacion.admin'),r=rango(req.body.desde,req.body.hasta),data=await catalogo(db,c,r.desde,r.hasta),propuestas:Record<string,unknown>[]=[],avisos:string[]=[];
  exigir(Date.parse(r.desde+'T00:00:00-05:00')>Date.now()-86400000,'La propuesta debe comenzar hoy o después.');
  const conflictos=(await db.query(`SELECT bus_id,frecuencia_id,salida,liberacion_bus,to_char(salida AT TIME ZONE 'America/Guayaquil','YYYY-MM-DD') fecha FROM transporte.viajes WHERE cooperativa_id=$1 AND estado<>'CANCELADO' AND salida<($3::date+1) AT TIME ZONE 'America/Guayaquil' AND liberacion_bus>$2::date AT TIME ZONE 'America/Guayaquil'`,[c,r.desde,r.hasta])).rows;
  const grupoId=req.body.grupoId?uuid(req.body.grupoId):null;
  for(let dia=Date.parse(r.desde+'T12:00:00Z');dia<=Date.parse(r.hasta+'T12:00:00Z');dia+=86400000){const fechaDia=new Date(dia).toISOString().slice(0,10),diaIso=new Date(dia).getUTCDay()||7;
   for(const f of data.frecuencias.filter(f=>f.activa&&(!grupoId||f.grupos.includes(grupoId)))){
    if(conflictos.some(v=>v.frecuencia_id===f.id&&v.fecha===fechaDia))continue;
    const duracion=f.paradas.at(-1)?.minutos??0,salida=new Date(fechaDia+'T'+f.hora+':00-05:00').toISOString(),llegada=new Date(Date.parse(salida)+duracion*60000).toISOString(),liberacion=new Date(Date.parse(llegada)+30*60000).toISOString();
    if(duracion<=0||Date.parse(salida)<=Date.now()){avisos.push(f.codigo+' · '+fechaDia+': revisa los tiempos de la ruta o selecciona una salida futura.');continue;}
    const solapa=(inicio:string,fin:string)=>Date.parse(inicio)<Date.parse(liberacion)&&Date.parse(salida)<Date.parse(fin);
    const bus=data.buses.find(b=>b.activo&&b.plano_id&&f.grupos.includes(b.grupo_id)&&(!grupoId||b.grupo_id===grupoId)&&!data.grupos.find(g=>g.id===b.grupo_id)?.descanso.includes(diaIso)&&!data.indisponibilidades.some(i=>i.bus_id===b.id&&solapa(i.desde,i.hasta))&&!conflictos.some(v=>v.bus_id===b.id&&solapa(v.salida,v.liberacion_bus))&&!propuestas.some(p=>p.busId===b.id&&solapa(String(p.salida),String(p.liberacion))));
    if(bus)propuestas.push({fecha:fechaDia,frecuenciaId:f.id,busId:bus.id,salida,llegada,liberacion,planoId:bus.plano_id});else avisos.push(f.codigo+' · '+fechaDia+': no hay un bus compatible y disponible.');
    exigir(propuestas.length<=100,'Reduce el intervalo para generar como máximo 100 asignaciones.');
   }
  }return {propuestas,avisos};
 }));}catch(e){next(e);}});
 router.put('/asignaciones',async(req,res,next)=>{try{res.json(await contexto(req,async db=>{
  const {id:c}=await ambito(db,req,'operacion.admin');const lista=req.body.asignaciones;exigir(Array.isArray(lista)&&lista.length>0&&lista.length<=100,'Selecciona entre una y 100 asignaciones.');const ids:string[]=[];
  for(const d of lista){let id=d.id?uuid(d.id):null;if(id){const v=(await db.query('SELECT estado,version FROM transporte.viajes WHERE id=$1 AND cooperativa_id=$2 FOR UPDATE',[id,c])).rows[0];if(!v)throw new ErrorOperacion(404,'Asignación no disponible.');if(v.version!==d.version)throw new ErrorOperacion(409,'La asignación cambió. Recarga la planificación.');exigir(v.estado==='BORRADOR','Solo se puede editar una asignación en borrador.');}
   const t=await comprobarAsignacion(db,c,d,id);const conductor=d.conductorId?uuid(d.conductorId):null;
   if(conductor){exigir((await db.query(`SELECT 1 FROM transporte.membresias m JOIN transporte.roles r ON r.id=m.rol_id JOIN transporte.usuarios u ON u.id=m.usuario_id WHERE m.cooperativa_id=$1 AND m.usuario_id=$2 AND m.activa AND u.activo AND r.codigo='PERSONAL_BUS'`,[c,conductor])).rowCount,'El conductor debe ser personal activo de esta cooperativa.');
    exigir(!(await db.query("SELECT 1 FROM transporte.viajes WHERE conductor_id=$1 AND cooperativa_id=$2 AND estado<>'CANCELADO' AND ($3::uuid IS NULL OR id<>$3) AND tstzrange(salida,liberacion_bus,'[)') && tstzrange($4::timestamptz,$5::timestamptz,'[)')",[conductor,c,id,t.salida,t.liberacion])).rowCount,'El conductor ya tiene otra asignación en ese horario.');}
   if(id)await db.query('UPDATE transporte.viajes SET frecuencia_id=$2,bus_id=$3,plano_id=$4,salida=$5,llegada=$6,liberacion_bus=$7,conductor_id=$8,version=version+1,updated_at=now() WHERE id=$1',[id,d.frecuenciaId,d.busId,t.planoId,t.salida,t.llegada,t.liberacion,conductor]);
   else id=(await db.query('INSERT INTO transporte.viajes(cooperativa_id,frecuencia_id,bus_id,plano_id,salida,llegada,liberacion_bus,conductor_id)VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[c,d.frecuenciaId,d.busId,t.planoId,t.salida,t.llegada,t.liberacion,conductor])).rows[0].id;
   ids.push(id!);
  }return {ids,mensaje:'Borrador guardado. Todavía no está disponible para la venta.'};
 }));}catch(e){next(e);}});
 router.post('/publicar',async(req,res,next)=>{try{res.json(await contexto(req,async db=>{
  const {id:c}=await ambito(db,req,'operacion.admin');exigir(Array.isArray(req.body.viajes)&&req.body.viajes.length>0&&req.body.viajes.length<=100,'Selecciona los borradores a publicar.');
  for(const d of req.body.viajes){const id=uuid(d.id),v=(await db.query(`SELECT *,to_char(salida AT TIME ZONE 'America/Guayaquil','YYYY-MM-DD') fecha FROM transporte.viajes WHERE id=$1 AND cooperativa_id=$2 FOR UPDATE`,[id,c])).rows[0];
   if(!v)throw new ErrorOperacion(404,'Asignación no disponible.');if(v.version!==d.version)throw new ErrorOperacion(409,'La planificación cambió. Recarga antes de publicar.');exigir(v.estado==='BORRADOR','Solo se publican viajes en borrador.');
   await comprobarAsignacion(db,c,{frecuenciaId:v.frecuencia_id,busId:v.bus_id,fecha:v.fecha},id);
   const faltan=(await db.query(`SELECT 1 FROM transporte.plano_celdas pc WHERE pc.plano_id=$1 AND pc.tipo='ASIENTO' AND pc.activa AND NOT EXISTS(SELECT 1 FROM transporte.tarifas t JOIN transporte.frecuencias f ON f.id=t.frecuencia_id WHERE t.frecuencia_id=$2 AND t.grupo_id=(SELECT grupo_id FROM transporte.buses WHERE id=$3) AND t.clase_id=pc.clase_id AND t.activa AND t.precio_centavos>0 AND t.vigencia @> $4::date AND t.origen_orden=0 AND t.destino_orden=(SELECT max(orden) FROM transporte.ruta_paradas WHERE ruta_id=f.ruta_id)) LIMIT 1`,[v.plano_id,v.frecuencia_id,v.bus_id,v.fecha])).rowCount;
   exigir(!faltan,'Configura una tarifa de ruta completa para cada clase de asiento antes de publicar.');
   await db.query("UPDATE transporte.viajes SET estado='PUBLICADO',version=version+1,updated_at=now() WHERE id=$1",[id]);
  }return {mensaje:'Salidas publicadas. Ya pueden encontrarse en la búsqueda del cliente.'};
 }));}catch(e){next(e);}});
 router.post('/cancelar',async(req,res,next)=>{try{res.json(await contexto(req,async db=>{
  const {id:c}=await ambito(db,req,'operacion.admin'),id=uuid(req.body.id);const v=(await db.query('SELECT estado,version FROM transporte.viajes WHERE id=$1 AND cooperativa_id=$2 FOR UPDATE',[id,c])).rows[0];if(!v)throw new ErrorOperacion(404,'Asignación no disponible.');if(v.version!==req.body.version)throw new ErrorOperacion(409,'La asignación cambió.');exigir(['BORRADOR','PUBLICADO'].includes(v.estado),'Este viaje ya no se puede cancelar desde la planificación.');
  exigir(!(await db.query("SELECT 1 FROM transporte.reservas WHERE viaje_id=$1 AND estado IN('PENDIENTE','CONFIRMADA') LIMIT 1",[id])).rowCount,'Hay reservas activas. Resuélvelas antes de cancelar.');
  await db.query("UPDATE transporte.viajes SET estado='CANCELADO',version=version+1,updated_at=now() WHERE id=$1",[id]);return {mensaje:'Salida cancelada. Se conserva el historial.'};
 }));}catch(e){next(e);}});
 registrarExtras(router,contexto,ambito);
 router.use((e:unknown,_req:Request,res:express.Response,_next:express.NextFunction)=>{const error=e as {status?:number;code?:string;message?:string};const conflicto=['23505','23P01','40001','40P01'].includes(error.code??'');const status=error.status??(conflicto?409:error.code==='28000'?401:error.code==='42501'?403:['P0001','23514','23503','22P02'].includes(error.code??'')?422:500);res.status(status).json({error:error.status&&error.status<500?error.message:conflicto?'Los datos entran en conflicto con otro registro o una salida existente.':status===401?'La sesión venció. Inicia sesión nuevamente.':status===403?'No tienes permiso para esta operación.':status===422?'La base rechazó la operación. Revisa la disponibilidad, las tarifas y los estados.':'No se pudo completar la operación.'});});
 return router;
}
export const operacionRouter=crearOperacionRouter();

async function comprobarAsignacion(db:PoolClient,c:string,d:{fecha:unknown;frecuenciaId:unknown;busId:unknown},excepto:string|null=null) {
 const dia=fecha(d.fecha),fid=uuid(d.frecuenciaId),bid=uuid(d.busId);
 const f=(await db.query(`SELECT f.id,f.activa,to_char(f.hora_salida,'HH24:MI') hora,(SELECT max(minutos_desde_origen) FROM transporte.ruta_paradas p WHERE p.ruta_id=f.ruta_id) duracion FROM transporte.frecuencias f WHERE f.id=$1 AND f.cooperativa_id=$2`,[fid,c])).rows[0];
 const b=(await db.query('SELECT id,activo,grupo_id FROM transporte.buses WHERE id=$1 AND cooperativa_id=$2 FOR UPDATE',[bid,c])).rows[0];exigir(f?.activa&&b?.activo,'Selecciona una frecuencia y un bus activos de tu cooperativa.');exigir(f.duracion>0,'Define los tiempos de las paradas antes de planificar.');
 const salida=new Date(dia+'T'+f.hora+':00-05:00').toISOString(),llegada=new Date(Date.parse(salida)+f.duracion*60000).toISOString(),liberacion=new Date(Date.parse(llegada)+30*60000).toISOString();
 exigir(Date.parse(salida)>Date.now(),'La salida debe estar en el futuro.');
 exigir((await db.query('SELECT 1 FROM transporte.frecuencia_grupo WHERE frecuencia_id=$1 AND grupo_id=$2',[fid,b.grupo_id])).rowCount,'El grupo del bus no está habilitado para esta frecuencia.');
 const plano=(await db.query("SELECT id FROM transporte.planos p WHERE p.bus_id=$1 AND p.publicado AND EXISTS(SELECT 1 FROM transporte.plano_celdas pc WHERE pc.plano_id=p.id AND pc.tipo='ASIENTO' AND pc.activa) ORDER BY numero_version DESC LIMIT 1",[bid])).rows[0];exigir(plano,'El bus necesita un plano publicado con asientos.');
 exigir(!(await db.query("SELECT 1 FROM transporte.grupo_dias_parada WHERE grupo_id=$1 AND dia_iso=extract(isodow FROM $2::date)",[b.grupo_id,dia])).rowCount,'El grupo del bus está en parada ese día.');
 exigir(!(await db.query("SELECT 1 FROM transporte.indisponibilidades_bus WHERE bus_id=$1 AND tstzrange(desde,hasta,'[)') && tstzrange($2::timestamptz,$3::timestamptz,'[)')",[bid,salida,liberacion])).rowCount,'El bus está indisponible en ese horario.');
 exigir(!(await db.query("SELECT 1 FROM transporte.viajes WHERE cooperativa_id=$1 AND estado<>'CANCELADO' AND ($2::uuid IS NULL OR id<>$2) AND ((bus_id=$3 AND tstzrange(salida,liberacion_bus,'[)') && tstzrange($4::timestamptz,$5::timestamptz,'[)')) OR (frecuencia_id=$6 AND (salida AT TIME ZONE 'America/Guayaquil')::date=$7::date))",[c,excepto,bid,salida,liberacion,fid,dia])).rowCount,'Ya existe una salida de esa frecuencia o un horario ocupado para el bus (incluye 30 minutos de margen).');
 return {salida,llegada,liberacion,planoId:plano.id};
}

async function guardarTarifas(db:PoolClient,c:string,d:any){
  const id=uuid(d.frecuenciaId),f=await versionFrecuencia(db,c,id,d.version);
  exigir(Array.isArray(d.tarifas)&&d.tarifas.length>0&&d.tarifas.length<=300,'Añade entre una y 300 tarifas.');
  // Only rows explicitly selected by ID are replaced; other tramos and future periods remain intact.
  for(const t of d.tarifas){const g=uuid(t.grupo_id),clase=uuid(t.clase_id),imp=uuid(t.impuesto_id),origen=entero(t.origen_orden,0,29),destino=entero(t.destino_orden,1,29);exigir(destino>origen,'El destino debe estar después del origen.');
   exigir((await db.query('SELECT 1 FROM transporte.ruta_paradas WHERE ruta_id=$1 AND orden=ANY($2::int[])',[f.ruta_id,[origen,destino]])).rowCount===2,'El tramo no pertenece a esta frecuencia.');
   exigir((await db.query('SELECT 1 FROM transporte.frecuencia_grupo WHERE frecuencia_id=$1 AND grupo_id=$2',[id,g])).rowCount===1,'El grupo no está habilitado para esta frecuencia.');
   exigir((await db.query("SELECT 1 FROM transporte.impuestos WHERE id=$1 AND activo AND concepto='TRANSPORTE_TERRESTRE'",[imp])).rowCount===1,'Selecciona un impuesto de transporte autorizado.');
   const precio=entero(t.precio,1),servicio=entero(t.servicio??0);const impServicio=t.impuesto_servicio_id?uuid(t.impuesto_servicio_id):null;
   if(servicio)exigir((await db.query("SELECT 1 FROM transporte.impuestos WHERE id=$1 AND activo AND concepto='SERVICIO_ADICIONAL'",[impServicio])).rowCount===1,'Selecciona el impuesto del servicio adicional.');
   const desde=fecha(t.desde),hasta=t.hasta?fecha(t.hasta):null;exigir(!hasta||hasta>desde,'La vigencia hasta debe ser posterior a desde (fecha final excluida).');
   if(t.id){const r=await db.query('UPDATE transporte.tarifas SET activa=false,updated_at=now() WHERE id=$1 AND cooperativa_id=$2 AND frecuencia_id=$3 AND activa RETURNING id',[uuid(t.id),c,id]);if(!r.rowCount)throw new ErrorOperacion(409,'La tarifa cambió. Recarga antes de guardar.');}
   await db.query(`INSERT INTO transporte.tarifas(cooperativa_id,frecuencia_id,grupo_id,clase_id,origen_orden,destino_orden,precio_centavos,servicio_centavos,impuesto_id,impuesto_servicio_id,vigencia)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,daterange($11::date,$12::date,'[)'))`,[c,id,g,clase,origen,destino,precio,servicio,imp,impServicio,desde,hasta]);
  }
  await db.query('UPDATE transporte.frecuencias SET version=version+1 WHERE id=$1',[id]);return {mensaje:'Tarifas guardadas. Las cotizaciones existentes conservan sus importes.'};

}
async function guardarBeneficio(db:PoolClient,c:string,d:any){
  exigir(['NINO','TERCERA_EDAD','DISCAPACIDAD'].includes(d.codigo),'Beneficio no reconocido.');const bp=d.descuento_bp===null?null:entero(d.descuento_bp,0,10000);const condiciones=typeof d.condiciones==='string'?d.condiciones.trim():'';
  exigir(typeof d.activo==='boolean'&&(!d.activo||(bp!==null&&condiciones.length>0)),'Define el porcentaje y las condiciones antes de activar.');exigir(condiciones.length<=1000&&!/[<>]/.test(condiciones),'Condiciones inválidas.');
  const min=d.edad_min===null?null:entero(d.edad_min,0,130),max=d.edad_max_exclusiva===null?null:entero(d.edad_max_exclusiva,1,131);exigir(min===null||max===null||max>min,'Revisa los límites de edad.');if(d.codigo==='NINO'&&d.activo)exigir(min!==null&&max!==null,'Define las edades del beneficio infantil.');const desde=fecha(d.desde),hasta=d.hasta?fecha(d.hasta):null;exigir(!hasta||hasta>desde,'La vigencia final debe ser posterior a la inicial.');
  if(d.id){const r=await db.query('SELECT id FROM transporte.beneficios WHERE id=$1 AND cooperativa_id=$2 AND updated_at::text=$3 FOR UPDATE',[uuid(d.id),c,d.revision]);if(!r.rowCount)throw new ErrorOperacion(409,'El beneficio cambió. Recarga la vista.');await db.query('UPDATE transporte.beneficios SET activo=false,updated_at=clock_timestamp() WHERE id=$1',[d.id]);}
  await db.query(`INSERT INTO transporte.beneficios(cooperativa_id,codigo,nombre,descuento_bp,edad_min,edad_max_exclusiva,condiciones,activo,vigencia)VALUES($1,$2,$3,$4,$5,$6,$7,$8,daterange($9::date,$10::date,'[)'))`,[c,d.codigo,({NINO:'Niño',TERCERA_EDAD:'Tercera edad',DISCAPACIDAD:'Persona con discapacidad'} as Record<string,string>)[d.codigo],bp,min,max,condiciones,d.activo,desde,hasta]);return {mensaje:'Beneficio guardado con sus condiciones y vigencia.'};

}
