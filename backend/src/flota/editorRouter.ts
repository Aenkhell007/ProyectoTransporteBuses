import express, { type Request } from 'express';
import type { PoolClient } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { conSesion } from '../sesion';
import { uuid } from '../pagos/validacion';
import { ErrorEditor, exigir, validarBus, validarGlobal, validarIdentidad } from './validacionEditor';

function sesion<T>(req: Request, fn: (db: PoolClient) => Promise<T>) {
  const t = req.cookies?.transporte_sesion;
  if (typeof t !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(t)) throw new ErrorEditor(401, 'Inicia sesión para continuar.');
  return conSesion(t, fn);
}
export function crearEditorRouter(sesionEditor: typeof sesion = sesion) {
const editorRouter = express.Router();
// Montado antes del parser general; limita también fotos codificadas en JSON.
editorRouter.use(express.json({ limit: '45mb' }));
editorRouter.use((req, _res, next) => {
  if (req.method !== 'GET') {
    const origen = req.get('origin');
    const permitidos = new Set([process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173', 'http://localhost:5173']);
    if (!origen || !permitidos.has(origen)) return next(new ErrorEditor(403, 'Origen no autorizado.'));
  }
  next();
});
async function cooperativa(db: PoolClient, permiso: string) {
  const r = await db.query(`SELECT DISTINCT m.cooperativa_id FROM transporte.membresias m
    JOIN transporte.cooperativas c ON c.id=m.cooperativa_id AND c.activa
    WHERE m.usuario_id=transporte.actor() AND m.activa AND transporte.puede($1,m.cooperativa_id)`, [permiso]);
  if (r.rows.length !== 1) throw new ErrorEditor(403, r.rows.length ? 'Selecciona un ámbito único de cooperativa antes de continuar.' : 'No tienes permiso para esta operación.');
  return r.rows[0].cooperativa_id as string;
}
function version(actual: number, enviado: unknown) {
  if (actual !== enviado) throw new ErrorEditor(409, 'Los datos cambiaron. Actualiza la vista antes de guardar.');
}
const urlImagen = (id: string) => `/api/mikel/imagenes/${id}`;
async function imagen(db: PoolClient, coop: string, archivo: any, categoria: 'LOGO' | 'FOTO_BUS') {
  exigir(archivo && typeof archivo.base64 === 'string' && archivo.base64.length <= 7_000_000, 'Imagen inválida o demasiado grande.');
  const buffer = Buffer.from(archivo.base64, 'base64');
  exigir(buffer.length > 0 && buffer.length <= (categoria === 'LOGO' ? 2 : 5) * 1024 * 1024, 'La imagen supera el tamaño permitido.');
  // No se aceptan SVG en el servidor: el navegador los convierte a PNG.
  let contenido: Buffer;
  try {
    const meta = await sharp(buffer, { limitInputPixels: 8192 * 8192 }).metadata();
    exigir(['png', 'jpeg', 'webp'].includes(meta.format ?? '') && !meta.pages, 'Usa una imagen estática PNG, JPG o WebP.');
    contenido = await sharp(buffer, { limitInputPixels: 8192 * 8192 }).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  } catch { throw new ErrorEditor(422, 'No se pudo validar la imagen. Usa PNG, JPG o WebP estático.'); }
  exigir(contenido.length <= 5 * 1024 * 1024, 'La imagen procesada es demasiado grande.');
  const id = randomUUID();
  await db.query(`INSERT INTO transporte.archivos(id,propietario_id,cooperativa_id,categoria,ruta_privada,mime,bytes,sha256,validado_servidor)
    VALUES($1,transporte.actor(),$2,$3,$4,'image/png',$5,$6,true)`, [id, coop, categoria, `flota-db/${id}`, contenido.length, createHash('sha256').update(contenido).digest('hex')]);
  await db.query('INSERT INTO transporte.flota_imagen_contenidos(archivo_id,contenido) VALUES($1,$2)', [id, contenido]);
  return id;
}

editorRouter.get('/imagenes/:id', async (req, res, next) => {
  try {
    const r = await sesionEditor(req, async db => (await db.query(`SELECT i.contenido FROM transporte.flota_imagen_contenidos i
      JOIN transporte.archivos a ON a.id=i.archivo_id WHERE i.archivo_id=$1 AND a.categoria IN('LOGO','FOTO_BUS')`, [uuid(req.params.id)])).rows[0]);
    if (!r) throw new ErrorEditor(404, 'Imagen no disponible.');
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(r.contenido);
  } catch (e) { next(e); }
});

editorRouter.get('/global', async (req, res, next) => {
  try { res.json(await sesionEditor(req, async db => {
    if (!(await db.query("SELECT transporte.puede('config.global') AS permitido")).rows[0].permitido) throw new ErrorEditor(403, 'No tienes permiso para esta operación.');
    const r = (await db.query("SELECT valor,version FROM transporte.config_global WHERE clave='editor_sistema'")).rows[0];
    if (!r) throw new ErrorEditor(503, 'Falta aplicar la migración de configuración.');
    return { datos: { ...r.valor, version: r.version }, canales: { correo: Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL), whatsapp: false }, admiteMfa: false };
  })); } catch (e) { next(e); }
});
editorRouter.put('/global', async (req, res, next) => {
  try { validarGlobal(req.body); res.json(await sesionEditor(req, async db => {
    if (!(await db.query("SELECT transporte.puede('config.global') AS permitido")).rows[0].permitido) throw new ErrorEditor(403, 'No tienes permiso para esta operación.');
    const row = (await db.query("SELECT version FROM transporte.config_global WHERE clave='editor_sistema' FOR UPDATE")).rows[0];
    if (!row) throw new ErrorEditor(503, 'Falta aplicar la migración.');
    version(row.version, req.body.version);
    exigir(!req.body.correo || Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL), 'El correo no está configurado en el servidor.');
    const { idioma, moneda, zonaHoraria, sesionHoras, mfaAdministradores, formatos, maxArchivoMB, correo, whatsapp } = req.body; const valor = { idioma, moneda, zonaHoraria, sesionHoras, mfaAdministradores, formatos, maxArchivoMB, correo, whatsapp };
    const r = (await db.query("UPDATE transporte.config_global SET valor=$1,version=version+1,updated_at=now() WHERE clave='editor_sistema' RETURNING version", [valor])).rows[0];
    await db.query("UPDATE transporte.config_global SET valor=to_jsonb($1::text),version=version+1,updated_at=now() WHERE clave='zona_horaria'", [valor.zonaHoraria]);
    return { ...valor, version: r.version };
  })); } catch (e) { next(e); }
});

async function identidad(db: PoolClient, c: string) {
  const r = (await db.query(`SELECT c.nombre,c.razon_social,c.ruc,c.version AS identidad_version,k.* FROM transporte.cooperativas c
    JOIN transporte.config_cooperativa k ON k.cooperativa_id=c.id WHERE c.id=$1`, [c])).rows[0];
  if (!r) throw new ErrorEditor(404, 'La cooperativa no tiene configuración.');
  return { version: r.version, identidadVersion: r.identidad_version, nombre: r.nombre, razonSocial: r.razon_social, ruc: r.ruc,
    lema: r.lema ?? '', logoUrl: r.logo_archivo_id ? urlImagen(r.logo_archivo_id) : '', primario: r.color_primario, secundario: r.color_secundario,
    texto: r.color_texto, email: r.soporte_email ?? '', telefono: r.telefono ?? '', whatsapp: r.whatsapp ?? '', direccion: r.direccion ?? '', facebook: r.facebook_url ?? '', instagram: r.instagram_url ?? '' };
}
editorRouter.get('/identidad', async (req, res, next) => {
  try { res.json(await sesionEditor(req, async db => identidad(db, await cooperativa(db, 'config.admin')))); } catch (e) { next(e); }
});
editorRouter.put('/identidad', async (req, res, next) => {
  try { const d = req.body?.datos; validarIdentidad(d); res.json(await sesionEditor(req, async db => {
    const c = await cooperativa(db, 'config.admin');
    await db.query('SELECT id FROM transporte.cooperativas WHERE id=$1 FOR UPDATE', [c]);
    await db.query('SELECT id FROM transporte.config_cooperativa WHERE cooperativa_id=$1 FOR UPDATE', [c]);
    const actual = await identidad(db, c); version(actual.version, d.version); version(actual.identidadVersion, d.identidadVersion);
    const logo = req.body.logo ? await imagen(db, c, req.body.logo, 'LOGO') : null;
    await db.query('UPDATE transporte.cooperativas SET nombre=$2,razon_social=$3,ruc=$4,version=version+1,updated_at=now() WHERE id=$1', [c, d.nombre.trim(), d.razonSocial.trim(), d.ruc]);
    await db.query(`UPDATE transporte.config_cooperativa SET lema=$2,color_primario=$3,color_secundario=$4,color_texto=$5,soporte_email=$6,telefono=$7,whatsapp=$8,direccion=$9,facebook_url=$10,instagram_url=$11,
      logo_archivo_id=COALESCE($12,logo_archivo_id),version=version+1,updated_at=now() WHERE cooperativa_id=$1`, [c,d.lema,d.primario,d.secundario,d.texto,d.email,d.telefono,d.whatsapp,d.direccion,d.facebook,d.instagram,logo]);
    return identidad(db, c);
  })); } catch (e) { next(e); }
});

async function detalleBus(db: PoolClient, c: string, id: string) {
  const b = (await db.query('SELECT * FROM transporte.buses WHERE id=$1 AND cooperativa_id=$2', [id,c])).rows[0];
  if (!b) throw new ErrorEditor(404, 'Bus no disponible.');
  const p = (await db.query(`SELECT p.*,EXISTS(SELECT 1 FROM transporte.viajes v WHERE v.plano_id=p.id AND v.estado<>'CANCELADO') AS usado
    FROM transporte.planos p WHERE bus_id=$1 AND cooperativa_id=$2 ORDER BY numero_version DESC LIMIT 1`,[id,c])).rows[0];
  const celdas = p ? (await db.query('SELECT piso,fila,columna,tipo,codigo,clase_id FROM transporte.plano_celdas WHERE plano_id=$1 AND activa ORDER BY piso,fila,columna',[p.id])).rows : [];
  const fotos = (await db.query('SELECT archivo_id AS id FROM transporte.bus_fotos WHERE bus_id=$1 AND cooperativa_id=$2 ORDER BY orden',[id,c])).rows.map(r=>({id:r.id,url:urlImagen(r.id),nombre:'Fotografía del bus'}));
  const servicios = (await db.query('SELECT equipamiento_id FROM transporte.bus_equipamiento WHERE bus_id=$1 AND cooperativa_id=$2',[id,c])).rows.map(r=>r.equipamiento_id);
  return { id:b.id,version:b.version,unidad:b.unidad,placa:b.placa,chasis:b.chasis,carroceria:b.carroceria,correo:b.correo_contacto??'',grupoId:b.grupo_id,propietario:b.propietario??'',activo:b.activo,
    pisos:p?.pisos??1,filas:Math.max(1,...celdas.map(r=>r.fila)),celdas,servicios,fotos,planoEnUso:Boolean(p?.usado || p?.publicado) };
}
editorRouter.get('/buses', async(req,res,next)=>{
  try { res.json(await sesionEditor(req,async db=>{
    const c=await cooperativa(db,'flota.admin');
    return { buses:(await db.query('SELECT id,unidad,placa,activo FROM transporte.buses WHERE cooperativa_id=$1 ORDER BY unidad',[c])).rows,
      grupos:(await db.query('SELECT id,nombre FROM transporte.grupos_bus WHERE cooperativa_id=$1 AND activo ORDER BY nombre',[c])).rows,
      clases:(await db.query('SELECT id,codigo,nombre FROM transporte.clases_asiento ORDER BY codigo')).rows,
      servicios:(await db.query('SELECT id,nombre FROM transporte.equipamientos ORDER BY nombre')).rows };
  })); }catch(e){next(e);}
});
editorRouter.get('/buses/:id',async(req,res,next)=>{
  try{res.json(await sesionEditor(req,async db=>detalleBus(db,await cooperativa(db,'flota.admin'),uuid(req.params.id))));}catch(e){next(e);}
});
editorRouter.put('/buses',async(req,res,next)=>{
  try{
    const d=req.body?.datos; validarBus(d);
    exigir(Array.isArray(req.body.fotos) && req.body.fotos.length+d.fotos.length<=6,'Se permiten seis fotografías.');
    res.json(await sesionEditor(req,async db=>{
      const c=await cooperativa(db,'flota.admin'); let id=d.id?uuid(d.id):randomUUID();
      if(d.id){const b=(await db.query('SELECT version FROM transporte.buses WHERE id=$1 AND cooperativa_id=$2 FOR UPDATE',[id,c])).rows[0];if(!b)throw new ErrorEditor(404,'Bus no disponible.');version(b.version,d.version);}
      // Serializa también altas concurrentes de la misma unidad.
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${c}:flota`]);
      exigir((await db.query('SELECT 1 FROM transporte.grupos_bus WHERE id=$1 AND cooperativa_id=$2 AND activo',[uuid(d.grupoId),c])).rowCount,'Grupo no disponible.');
      if((await db.query('SELECT 1 FROM transporte.buses WHERE cooperativa_id=$1 AND lower(unidad)=lower($2) AND id<>$3',[c,d.unidad.trim(),id])).rowCount)throw new ErrorEditor(409,'La unidad ya existe.');
      const clases=new Set((await db.query('SELECT id FROM transporte.clases_asiento')).rows.map(r=>r.id));
      exigir(d.celdas.every((cel:any)=>cel.tipo!=='ASIENTO'||clases.has(cel.clase_id)),'Clase de asiento no disponible.');
      const equipos=new Set((await db.query('SELECT id FROM transporte.equipamientos')).rows.map(r=>r.id));
      exigir(d.servicios.every((v:unknown)=>equipos.has(v)),'Servicio no disponible.');
      if(d.id && !d.activo && (await db.query("SELECT 1 FROM transporte.viajes WHERE bus_id=$1 AND estado<>'CANCELADO' AND salida>now() LIMIT 1",[id])).rowCount)throw new ErrorEditor(409,'El bus tiene viajes futuros; no se puede desactivar.');
      const valores=[id,c,d.grupoId,d.unidad.trim(),d.placa,d.chasis.trim(),d.carroceria.trim(),d.correo||null,d.propietario||null,d.activo];
      if(d.id)await db.query('UPDATE transporte.buses SET grupo_id=$3,unidad=$4,placa=$5,chasis=$6,carroceria=$7,correo_contacto=$8,propietario=$9,activo=$10,version=version+1,updated_at=now() WHERE id=$1 AND cooperativa_id=$2',valores);
      else await db.query('INSERT INTO transporte.buses(id,cooperativa_id,grupo_id,unidad,placa,chasis,carroceria,correo_contacto,propietario,activo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',valores);
      const actual=d.id?await detalleBus(db,c,id):null;
      const normalizar=(celdas:any[])=>celdas.map(({piso,fila,columna,tipo,codigo,clase_id})=>({piso,fila,columna,tipo,codigo,clase_id})).sort((a,b)=>a.piso-b.piso||a.fila-b.fila||a.columna-b.columna);
      const cambio=!actual||actual.pisos!==d.pisos||JSON.stringify(normalizar(actual.celdas))!==JSON.stringify(normalizar(d.celdas));
      if(cambio){
        if(actual?.planoEnUso && req.body.crearVersion!==true)throw new ErrorEditor(409,'El plano está publicado o en uso. Confirma una nueva versión.');
        // Cada modificación genera versión: jamás modifica planos históricos.
        const p=(await db.query(`INSERT INTO transporte.planos(cooperativa_id,bus_id,numero_version,nombre,pisos)
          SELECT $1,$2,COALESCE(max(numero_version),0)+1,'Plano de la unidad',$3 FROM transporte.planos WHERE bus_id=$2 RETURNING id`,[c,id,d.pisos])).rows[0];
        for(const cel of d.celdas)await db.query('INSERT INTO transporte.plano_celdas(cooperativa_id,plano_id,piso,fila,columna,tipo,codigo,clase_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[c,p.id,cel.piso,cel.fila,cel.columna,cel.tipo,cel.codigo,cel.clase_id]);
        await db.query('UPDATE transporte.planos SET publicado=true WHERE id=$1',[p.id]);
      }
      await db.query('DELETE FROM transporte.bus_equipamiento WHERE bus_id=$1 AND cooperativa_id=$2',[id,c]);
      for(const equipo of d.servicios)await db.query('INSERT INTO transporte.bus_equipamiento(cooperativa_id,bus_id,equipamiento_id) VALUES($1,$2,$3)',[c,id,equipo]);
      const propias=new Set(actual?.fotos.map(f=>f.id)??[]);
      exigir(d.fotos.every((f:any)=>propias.has(f.id)) && new Set(d.fotos.map((f:any)=>f.id)).size===d.fotos.length,'Fotografía no disponible.');
      await db.query('DELETE FROM transporte.bus_fotos WHERE bus_id=$1 AND cooperativa_id=$2',[id,c]);
      const ids=d.fotos.map((f:any)=>f.id);
      for(const foto of req.body.fotos)ids.push(await imagen(db,c,foto,'FOTO_BUS'));
      for(let i=0;i<ids.length;i++)await db.query('INSERT INTO transporte.bus_fotos(cooperativa_id,bus_id,archivo_id,orden) VALUES($1,$2,$3,$4)',[c,id,ids[i],i+1]);
      return detalleBus(db,c,id);
    }));
  }catch(e){next(e);}
});

editorRouter.get('/compatibilidades',async(req,res,next)=>{
  try{res.json(await sesionEditor(req,async db=>{
    const c=await cooperativa(db,'operacion.admin');
    const frecuencias=(await db.query(`SELECT f.id,f.codigo,to_char(f.hora_salida,'HH24:MI') hora,f.activa,f.version,
      (SELECT t.nombre FROM transporte.ruta_paradas p JOIN transporte.terminales t ON t.id=p.terminal_id WHERE p.ruta_id=f.ruta_id ORDER BY p.orden LIMIT 1) origen,
      (SELECT t.nombre FROM transporte.ruta_paradas p JOIN transporte.terminales t ON t.id=p.terminal_id WHERE p.ruta_id=f.ruta_id ORDER BY p.orden DESC LIMIT 1) destino
      FROM transporte.frecuencias f WHERE f.cooperativa_id=$1 ORDER BY f.codigo`,[c])).rows;
    const relaciones=(await db.query('SELECT frecuencia_id,grupo_id FROM transporte.frecuencia_grupo WHERE cooperativa_id=$1',[c])).rows;
    const buses=(await db.query('SELECT id,unidad,activo,grupo_id FROM transporte.buses WHERE cooperativa_id=$1',[c])).rows;
    const grupos=(await db.query('SELECT id,nombre,descripcion,activo FROM transporte.grupos_bus WHERE cooperativa_id=$1 ORDER BY nombre',[c])).rows.map(g=>({...g,descripcion:g.descripcion??'',buses:buses.filter(b=>b.grupo_id===g.id),frecuenciaIds:relaciones.filter(r=>r.grupo_id===g.id).map(r=>r.frecuencia_id)}));
    return {frecuencias,grupos};
  }));}catch(e){next(e);}
});
editorRouter.put('/compatibilidades',async(req,res,next)=>{
  try{res.json(await sesionEditor(req,async db=>{
    const c=await cooperativa(db,'operacion.admin'),d=req.body,id=uuid(d.frecuenciaId);
    exigir(Array.isArray(d.grupoIds)&&d.grupoIds.length<=200&&new Set(d.grupoIds).size===d.grupoIds.length,'Grupos inválidos.');
    const f=(await db.query('SELECT version,activa FROM transporte.frecuencias WHERE id=$1 AND cooperativa_id=$2 FOR UPDATE',[id,c])).rows[0];
    if(!f)throw new ErrorEditor(404,'Frecuencia no disponible.');version(f.version,d.version);exigir(f.activa,'La frecuencia está inactiva.');
    for(const g of d.grupoIds)exigir((await db.query('SELECT 1 FROM transporte.grupos_bus WHERE id=$1 AND cooperativa_id=$2 AND activo',[uuid(g),c])).rowCount,'Grupo inactivo o de otra cooperativa.');
    await db.query('DELETE FROM transporte.frecuencia_grupo WHERE frecuencia_id=$1 AND cooperativa_id=$2',[id,c]);
    for(const g of d.grupoIds)await db.query('INSERT INTO transporte.frecuencia_grupo(cooperativa_id,frecuencia_id,grupo_id) VALUES($1,$2,$3)',[c,id,g]);
    await db.query('UPDATE transporte.frecuencias SET version=version+1,updated_at=now() WHERE id=$1',[id]);
    return {...d,version:f.version+1};
  }));}catch(e){next(e);}
});

editorRouter.use((e:any,_req:Request,res:express.Response,_next:express.NextFunction)=>{
  const status=e.status??(e.code==='28000'?401:e.code==='42501'?403:['23505','23P01'].includes(e.code)?409:['22P02','23514'].includes(e.code)?422:500);
  if(status===500)console.error('Editores Mikel',e.code??e.message);
  res.status(status).json({error:e instanceof ErrorEditor?e.message:status===401?'Inicia sesión para continuar.':status===403?'No tienes permiso para esta operación.':status===409?'Los datos entran en conflicto. Actualiza y revisa.':status===422?'Revisa los campos enviados.':'No se pudo procesar la solicitud.'});
});

return editorRouter;
}
export const editorRouter = crearEditorRouter();
