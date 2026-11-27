import { consultarLote } from '../lecturas';
import express, { type Request } from 'express';
import type { PoolClient } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { conSesion } from '../sesion';
import { uuid } from '../pagos/validacion';
import { origenPermitido } from '../origen';
import { ErrorEditor, exigir, validarBus, validarGlobal, validarIdentidad } from './validacionEditor';

function sesion<T>(req: Request, fn: (db: PoolClient) => Promise<T>) {
  const t = req.cookies?.transporte_sesion;
  if (typeof t !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(t)) throw new ErrorEditor(401, 'Inicia sesión para continuar.');
  return conSesion(t, fn);
}
export function crearEditorRouter(sesionEditor: typeof sesion = sesion) {
const editorRouter = express.Router();
// Montado antes del parser general; limita también fotos codificadas en JSON.
editorRouter.use(express.json({ limit: '10mb' }));
editorRouter.use((req, _res, next) => {
  if (req.method !== 'GET') {
    if (!origenPermitido(req.get('origin'))) return next(new ErrorEditor(403, 'Origen no autorizado.'));
  }
  next();
});
async function cooperativa(db: PoolClient, permiso: string, seleccion?: unknown) {
  if (seleccion !== undefined) {
    exigir(typeof seleccion === 'string', 'Selecciona una cooperativa válida.');
    const id = uuid(seleccion);
    const r = await db.query('SELECT id FROM transporte.cooperativas WHERE id=$1 AND activa AND transporte.puede($2,id)', [id, permiso]);
    if (!r.rowCount) throw new ErrorEditor(403, 'No tienes permiso para esta cooperativa o está inactiva.');
    return id;
  }
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
async function prepararImagen(archivo: any, categoria: 'LOGO' | 'FOTO_BUS') {
  exigir(archivo && typeof archivo.base64 === 'string' && archivo.base64.length <= 7_500_000, 'Imagen inválida o demasiado grande.');
  const buffer = Buffer.from(archivo.base64, 'base64');
  exigir(buffer.length > 0 && buffer.length <= 5 * 1024 * 1024, 'La imagen supera el tamaño permitido (máximo 5 MB).');
  // No se aceptan SVG en el servidor: el navegador los convierte a PNG.
  let contenido: Buffer;
  const maxDim = categoria === 'LOGO' ? 1024 : 2048;
  try {
    const meta = await sharp(buffer, { limitInputPixels: 8192 * 8192 }).metadata();
    exigir(['png', 'jpeg', 'webp'].includes(meta.format ?? '') && !meta.pages, 'Usa una imagen estática PNG, JPG o WebP.');
    contenido = await sharp(buffer, { limitInputPixels: 8192 * 8192 }).rotate().resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  } catch { throw new ErrorEditor(422, 'No se pudo validar la imagen. Usa PNG, JPG o WebP estático.'); }
  exigir(contenido.length <= 5 * 1024 * 1024, 'La imagen procesada es demasiado grande.');
  return {
    id: randomUUID(),
    contenido,
    sha256: createHash('sha256').update(contenido).digest('hex'),
  };
}
async function imagen(db: PoolClient, coop: string, archivo: any, categoria: 'LOGO' | 'FOTO_BUS') {
  const prep = await prepararImagen(archivo, categoria);
  await db.query(`INSERT INTO transporte.archivos(id,propietario_id,cooperativa_id,categoria,ruta_privada,mime,bytes,sha256,validado_servidor)
    VALUES($1,transporte.actor(),$2,$3,$4,'image/png',$5,$6,true)`, [prep.id, coop, categoria, `flota-db/${prep.id}`, prep.contenido.length, prep.sha256]);
  await db.query('INSERT INTO transporte.flota_imagen_contenidos(archivo_id,contenido) VALUES($1,$2)', [prep.id, prep.contenido]);
  return prep.id;
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

function campoTexto(valor: unknown, nombre: string, max: number, requerido = true) {
  exigir(typeof valor === 'string' && (!requerido || valor.trim().length > 0) && valor.trim().length <= max && !/[<>\x00-\x1f]/.test(valor), `Revisa el campo ${nombre}.`);
  return valor.trim();
}

async function identidad(db: PoolClient, c: string) {
  const [configRes, oficinasRes] = await Promise.all([
    db.query(`SELECT c.nombre,c.razon_social,c.ruc,c.ambito_operacion,c.provincia,c.version AS identidad_version,k.* FROM transporte.cooperativas c
      JOIN transporte.config_cooperativa k ON k.cooperativa_id=c.id WHERE c.id=$1`, [c]),
    db.query(`SELECT id,nombre,direccion,coalesce(telefono,'') telefono,activa FROM transporte.oficinas WHERE cooperativa_id=$1 ORDER BY nombre`, [c]),
  ]);
  const r = configRes.rows[0];
  if (!r) throw new ErrorEditor(404, 'La cooperativa no tiene configuración.');
  return { version: r.version, identidadVersion: r.identidad_version, nombre: r.nombre, razonSocial: r.razon_social, ruc: r.ruc,
    ambitoOperacion: r.ambito_operacion ?? 'INTERPROVINCIAL', provincia: r.provincia ?? '',
    lema: r.lema ?? '', logoUrl: r.logo_archivo_id ? urlImagen(r.logo_archivo_id) : '', primario: r.color_primario, secundario: r.color_secundario,
    texto: r.color_texto, email: r.soporte_email ?? '', telefono: r.telefono ?? '', whatsapp: r.whatsapp ?? '', direccion: r.direccion ?? '', facebook: r.facebook_url ?? '', instagram: r.instagram_url ?? '',
    oficinas: oficinasRes.rows };
}
// El administrador global puede elegir un ámbito sin tener una membresía local.
editorRouter.get('/ambitos/:permiso', async (req, res, next) => {
  try {
    const permiso=req.params.permiso;
    exigir(['config.admin','flota.admin','operacion.admin'].includes(String(permiso)), 'Permiso de editor inválido.');
    res.json(await sesionEditor(req,async db=>{
      const r=await db.query('SELECT id,nombre FROM transporte.cooperativas WHERE activa AND transporte.puede($1,id) ORDER BY nombre,id',[permiso]);
      if (!r.rowCount) throw new ErrorEditor(403,'No tienes permiso para este editor en una cooperativa activa.');
      return {cooperativas:r.rows};
    }));
  }catch(e){next(e);}
});
editorRouter.get('/identidad/ambitos', async (req, res, next) => {
  try { res.json(await sesionEditor(req, async db => {
    const r = await db.query("SELECT id,nombre FROM transporte.cooperativas WHERE activa AND transporte.puede('config.admin',id) ORDER BY nombre,id");
    if (!r.rowCount) throw new ErrorEditor(403, 'No tienes permiso para configurar una cooperativa activa.');
    return { cooperativas: r.rows };
  })); } catch (e) { next(e); }
});
editorRouter.get('/identidad', async (req, res, next) => {
  try { res.json(await sesionEditor(req, async db => identidad(db, await cooperativa(db, 'config.admin', req.query.cooperativaId)))); } catch (e) { next(e); }
});
editorRouter.put('/identidad', async (req, res, next) => {
  try { const d = req.body?.datos; validarIdentidad(d); res.json(await sesionEditor(req, async db => {
    const c = await cooperativa(db, 'config.admin', req.query.cooperativaId);
    await db.query('SELECT id FROM transporte.cooperativas WHERE id=$1 FOR UPDATE', [c]);
    await db.query('SELECT id FROM transporte.config_cooperativa WHERE cooperativa_id=$1 FOR UPDATE', [c]);
    const actual = await identidad(db, c); version(actual.version, d.version); version(actual.identidadVersion, d.identidadVersion);
    const logo = req.body.logo ? await imagen(db, c, req.body.logo, 'LOGO') : null;
    await db.query('SELECT transporte.actualizar_identidad_cooperativa($1,$2,$3,$4,$5)', [c, d.identidadVersion, d.nombre, d.razonSocial, d.ruc]);
    if (d.ambitoOperacion !== undefined) {
      const prov = typeof d.provincia === 'string' && d.provincia.trim() ? d.provincia.trim() : null;
      await db.query('SELECT transporte.actualizar_ambito_cooperativa($1,$2,$3)', [c, d.ambitoOperacion, prov]);
    }
    await db.query(`UPDATE transporte.config_cooperativa SET lema=$2,color_primario=$3,color_secundario=$4,color_texto=$5,soporte_email=$6,telefono=$7,whatsapp=$8,direccion=$9,facebook_url=$10,instagram_url=$11,
      logo_archivo_id=COALESCE($12,logo_archivo_id),version=version+1,updated_at=now() WHERE cooperativa_id=$1`, [c,d.lema,d.primario,d.secundario,d.texto,d.email,d.telefono,d.whatsapp,d.direccion,d.facebook,d.instagram,logo]);
    return identidad(db, c);
  })); } catch (e) { next(e); }
});

async function detalleBus(db: PoolClient, c: string, id: string) {
  const [buses, planos, celdas, fotosBus, equipos] = await consultarLote(db, [
    {sql:'SELECT * FROM transporte.buses WHERE id=$1 AND cooperativa_id=$2',valores:[id,c]},
    {sql:`SELECT p.*,EXISTS(SELECT 1 FROM transporte.viajes v WHERE v.plano_id=p.id AND v.estado<>'CANCELADO') AS usado
      FROM transporte.planos p WHERE bus_id=$1 AND cooperativa_id=$2 ORDER BY numero_version DESC LIMIT 1`,valores:[id,c]},
    {sql:`SELECT piso,fila,columna,tipo,codigo,clase_id FROM transporte.plano_celdas WHERE activa AND plano_id=(
      SELECT id FROM transporte.planos WHERE bus_id=$1 AND cooperativa_id=$2 ORDER BY numero_version DESC LIMIT 1) ORDER BY piso,fila,columna`,valores:[id,c]},
    {sql:'SELECT archivo_id AS id FROM transporte.bus_fotos WHERE bus_id=$1 AND cooperativa_id=$2 ORDER BY orden',valores:[id,c]},
    {sql:'SELECT equipamiento_id FROM transporte.bus_equipamiento WHERE bus_id=$1 AND cooperativa_id=$2',valores:[id,c]},
  ]);
  const b=buses[0], p=planos[0];
  if (!b) throw new ErrorEditor(404, 'Bus no disponible.');
  const fotos=fotosBus.map(r=>({id:r.id,url:urlImagen(r.id),nombre:'Fotografía del bus'}));
  const servicios=equipos.map(r=>r.equipamiento_id);
  return { id:b.id,version:b.version,unidad:b.unidad,placa:b.placa,chasis:b.chasis,carroceria:b.carroceria,correo:b.correo_contacto??'',grupoId:b.grupo_id,propietario:b.propietario??'',activo:b.activo,
    pisos:p?.pisos??1,filas:Math.max(1,...celdas.map(r=>r.fila)),celdas,servicios,fotos,planoEnUso:Boolean(p?.usado || p?.publicado) };
}
const MARCAS_CHASIS_BASE = ['Mercedes-Benz', 'Hino', 'Scania', 'Volvo', 'Yutong', 'Volkswagen'];
const MARCAS_CARROCERIA_BASE = ['Marcopolo', 'Varela', 'Miral', 'Cepeda', 'Irizar', 'Yutong'];

editorRouter.get('/buses', async(req,res,next)=>{
  try { res.json(await sesionEditor(req,async db=>{
    const c=await cooperativa(db,'flota.admin',req.query.cooperativaId);
    const loteLectura=await consultarLote(db,[
      {sql:`SELECT b.id,b.unidad,b.placa,b.activo,b.chasis,b.carroceria,b.grupo_id,
        coalesce(gb.nombre,'') AS grupo_nombre,
        coalesce(lp.pisos,1)::int AS pisos,
        coalesce(lp.asientos_normal,0)::int AS asientos_normal,
        coalesce(lp.asientos_vip,0)::int AS asientos_vip,
        (coalesce(lp.tiene_bloque_doble,false) OR coalesce(eq.tiene_bano_eq,false)) AS tiene_bano,
        (SELECT bf.archivo_id FROM transporte.bus_fotos bf WHERE bf.bus_id=b.id AND bf.cooperativa_id=b.cooperativa_id ORDER BY bf.orden LIMIT 1) AS foto_archivo_id,
        coalesce(eq.servicios,'{}'::text[]) AS servicios
      FROM transporte.buses b
      LEFT JOIN transporte.grupos_bus gb ON gb.id=b.grupo_id
      LEFT JOIN LATERAL (
        SELECT p.id,p.pisos,p.numero_version,
          count(pc.id) FILTER (WHERE pc.tipo='ASIENTO' AND ca.codigo='NORMAL') AS asientos_normal,
          count(pc.id) FILTER (WHERE pc.tipo='ASIENTO' AND ca.codigo<>'NORMAL') AS asientos_vip,
          EXISTS (
            SELECT 1 FROM transporte.plano_celdas p1
            JOIN transporte.plano_celdas p2 ON p2.plano_id=p1.plano_id AND p2.piso=p1.piso AND p2.fila=p1.fila AND p2.columna=p1.columna+1
            WHERE p1.plano_id=p.id AND p1.activa AND p2.activa AND p1.tipo='BLOQUE' AND p2.tipo='BLOQUE'
          ) AS tiene_bloque_doble
        FROM transporte.planos p
        LEFT JOIN transporte.plano_celdas pc ON pc.plano_id=p.id AND pc.activa
        LEFT JOIN transporte.clases_asiento ca ON ca.id=pc.clase_id
        WHERE p.bus_id=b.id AND p.cooperativa_id=b.cooperativa_id
        GROUP BY p.id,p.pisos,p.numero_version
        ORDER BY p.numero_version DESC
        LIMIT 1
      ) lp ON true
      LEFT JOIN LATERAL (
        SELECT coalesce(array_agg(e.nombre ORDER BY e.nombre),'{}'::text[]) AS servicios,
          bool_or(lower(e.nombre) LIKE '%baño%' OR lower(e.nombre) LIKE '%bano%') AS tiene_bano_eq
        FROM transporte.bus_equipamiento be
        JOIN transporte.equipamientos e ON e.id=be.equipamiento_id
        WHERE be.bus_id=b.id AND be.cooperativa_id=b.cooperativa_id
      ) eq ON true
      WHERE b.cooperativa_id=$1
      ORDER BY b.unidad`,valores:[c]},
      {sql:'SELECT id,nombre FROM transporte.grupos_bus WHERE cooperativa_id=$1 AND activo ORDER BY nombre',valores:[c]},
      {sql:'SELECT id,codigo,nombre FROM transporte.clases_asiento ORDER BY codigo',valores:[]},
      {sql:'SELECT id,nombre FROM transporte.equipamientos ORDER BY nombre',valores:[]},
      {sql:'SELECT ambito_operacion,provincia FROM transporte.cooperativas WHERE id=$1',valores:[c]}
    ]);
    let chasis = new Set<string>(MARCAS_CHASIS_BASE);
    let carrocerias = new Set<string>(MARCAS_CARROCERIA_BASE);
    for (const b of loteLectura[0]) {
      if (typeof b.chasis === 'string' && b.chasis.trim()) chasis.add(b.chasis.trim());
      if (typeof b.carroceria === 'string' && b.carroceria.trim()) carrocerias.add(b.carroceria.trim());
    }
    await db.query('SAVEPOINT sp_marcas_bus');
    try {
      const m = (await db.query("SELECT nombre, tipo FROM transporte.marcas_bus WHERE activa ORDER BY nombre")).rows;
      for (const row of m) {
        if (row.tipo === 'CHASIS' || row.tipo === 'AMBAS') chasis.add(row.nombre);
        if (row.tipo === 'CARROCERIA' || row.tipo === 'AMBAS') carrocerias.add(row.nombre);
      }
      await db.query('RELEASE SAVEPOINT sp_marcas_bus');
    } catch {
      await db.query('ROLLBACK TO SAVEPOINT sp_marcas_bus');
      await db.query('RELEASE SAVEPOINT sp_marcas_bus');
    }
    const coopInfo = (loteLectura[4] as any[])?.[0];
    return {
      buses: loteLectura[0].map((b: any) => ({
        ...b,
        foto_url: b.foto_archivo_id ? urlImagen(b.foto_archivo_id) : null,
      })),
      grupos: loteLectura[1],
      clases: loteLectura[2],
      servicios: loteLectura[3],
      ambitoOperacion: (coopInfo?.ambito_operacion ?? 'INTERPROVINCIAL') as 'INTERPROVINCIAL' | 'URBANA' | 'RURAL',
      chasis: [...chasis].sort((a, b) => a.localeCompare(b, 'es')),
      carrocerias: [...carrocerias].sort((a, b) => a.localeCompare(b, 'es')),
    };
  })); }catch(e){next(e);}
});
editorRouter.get('/buses/:id',async(req,res,next)=>{
  try{res.json(await sesionEditor(req,async db=>detalleBus(db,await cooperativa(db,'flota.admin',req.query.cooperativaId),uuid(req.params.id))));}catch(e){next(e);}
});
editorRouter.put('/buses',async(req,res,next)=>{
  try{
    const d=req.body?.datos; validarBus(d);
    exigir(Array.isArray(req.body.fotos) && req.body.fotos.length+d.fotos.length<=6,'Se permiten seis fotografías.');
    res.json(await sesionEditor(req,async db=>{
      const c=await cooperativa(db,'flota.admin',req.query.cooperativaId); let id=d.id?uuid(d.id):randomUUID();
      if(d.id){const b=(await db.query('SELECT version FROM transporte.buses WHERE id=$1 AND cooperativa_id=$2 FOR UPDATE',[id,c])).rows[0];if(!b)throw new ErrorEditor(404,'Bus no disponible.');version(b.version,d.version);}
      // Serializa también altas concurrentes de la misma unidad.
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${c}:flota`]);
      const [loteValidacion, fotosPreparadas] = await Promise.all([
        consultarLote(db, [
          { sql: 'SELECT 1 FROM transporte.grupos_bus WHERE id=$1 AND cooperativa_id=$2 AND activo', valores: [uuid(d.grupoId), c] },
          { sql: 'SELECT 1 FROM transporte.buses WHERE cooperativa_id=$1 AND lower(unidad)=lower($2) AND id<>$3', valores: [c, d.unidad.trim(), id] },
          { sql: 'SELECT 1 FROM transporte.buses WHERE upper(placa)=upper($1) AND id<>$2', valores: [d.placa.trim(), id] },
          { sql: 'SELECT id FROM transporte.clases_asiento', valores: [] },
          { sql: 'SELECT id FROM transporte.equipamientos', valores: [] },
          d.id && !d.activo
            ? { sql: "SELECT 1 FROM transporte.viajes WHERE bus_id=$1 AND estado<>'CANCELADO' AND salida>now() LIMIT 1", valores: [id] }
            : { sql: 'SELECT NULL WHERE false', valores: [] },
          { sql: 'SELECT ambito_operacion FROM transporte.cooperativas WHERE id=$1', valores: [c] },
        ]),
        Promise.all((req.body.fotos as any[]).map(f => prepararImagen(f, 'FOTO_BUS'))),
      ]);
      exigir(loteValidacion[0].length,'Grupo no disponible.');
      if(loteValidacion[1].length)throw new ErrorEditor(409,'La unidad ya existe.');
      if(loteValidacion[2].length)throw new ErrorEditor(409,'La placa ya está registrada en otra unidad.');
      const clases=new Set(loteValidacion[3].map((r:any)=>r.id));
      exigir(d.celdas.every((cel:any)=>cel.tipo!=='ASIENTO'||clases.has(cel.clase_id)),'Clase de asiento no disponible.');
      const equipos=new Set(loteValidacion[4].map((r:any)=>r.id));
      exigir(d.servicios.every((v:unknown)=>equipos.has(v)),'Servicio no disponible.');
      if(d.id && !d.activo && loteValidacion[5].length)throw new ErrorEditor(409,'El bus tiene viajes futuros; no se puede desactivar.');
      const ambitoCoop = String(loteValidacion[6]?.[0]?.ambito_operacion ?? 'INTERPROVINCIAL').toUpperCase();
      const puertas = (d.celdas as any[]).filter((cel: any) => cel.tipo === 'PUERTA');
      if (puertas.length > 0) {
        exigir(
          ['URBANA', 'RURAL'].includes(ambitoCoop),
          'Solo los buses de cooperativas urbanas o rurales pueden asignar puertas en el plano.',
        );
        exigir(
          puertas.length <= 4,
          'Un bus urbano o rural puede tener como máximo 3 puertas en total (delantera + 2 puertas adicionales).',
        );
      }
      const valores=[id,c,d.grupoId,d.unidad.trim(),d.placa.trim().toUpperCase(),d.chasis.trim(),d.carroceria.trim(),d.correo||null,d.propietario||null,d.activo];
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
        if (d.celdas.length) {
          await db.query(
            `INSERT INTO transporte.plano_celdas(cooperativa_id,plano_id,piso,fila,columna,tipo,codigo,clase_id)
             SELECT $1,$2,u.piso,u.fila,u.columna,u.tipo,u.codigo,u.clase_id
             FROM unnest($3::int[],$4::int[],$5::int[],$6::text[],$7::text[],$8::uuid[]) AS u(piso,fila,columna,tipo,codigo,clase_id)`,
            [
              c,
              p.id,
              d.celdas.map((cel: any) => cel.piso),
              d.celdas.map((cel: any) => cel.fila),
              d.celdas.map((cel: any) => cel.columna),
              d.celdas.map((cel: any) => cel.tipo),
              d.celdas.map((cel: any) => cel.codigo ?? null),
              d.celdas.map((cel: any) => cel.clase_id ?? null),
            ],
          );
        }
        await db.query('UPDATE transporte.planos SET publicado=true WHERE id=$1',[p.id]);
      }
      await db.query('DELETE FROM transporte.bus_equipamiento WHERE bus_id=$1 AND cooperativa_id=$2',[id,c]);
      if(d.servicios.length){
        await db.query(
          'INSERT INTO transporte.bus_equipamiento(cooperativa_id,bus_id,equipamiento_id) SELECT $1,$2,u FROM unnest($3::uuid[]) AS u',
          [c,id,d.servicios],
        );
      }
      const propias=new Set(actual?.fotos.map(f=>f.id)??[]);
      exigir(d.fotos.every((f:any)=>propias.has(f.id)) && new Set(d.fotos.map((f:any)=>f.id)).size===d.fotos.length,'Fotografía no disponible.');
      await db.query('DELETE FROM transporte.bus_fotos WHERE bus_id=$1 AND cooperativa_id=$2',[id,c]);
      if(fotosPreparadas.length){
        await db.query(
          `INSERT INTO transporte.archivos(id,propietario_id,cooperativa_id,categoria,ruta_privada,mime,bytes,sha256,validado_servidor)
           SELECT u.id,transporte.actor(),$1,'FOTO_BUS','flota-db/'||u.id,'image/png',u.bytes,u.sha256,true
           FROM unnest($2::uuid[],$3::int[],$4::text[]) AS u(id,bytes,sha256)`,
          [c, fotosPreparadas.map(f=>f.id), fotosPreparadas.map(f=>f.contenido.length), fotosPreparadas.map(f=>f.sha256)],
        );
        await db.query(
          `INSERT INTO transporte.flota_imagen_contenidos(archivo_id,contenido)
           SELECT u.id,u.contenido FROM unnest($1::uuid[],$2::bytea[]) AS u(id,contenido)`,
          [fotosPreparadas.map(f=>f.id), fotosPreparadas.map(f=>f.contenido)],
        );
      }
      const ids=[...d.fotos.map((f:any)=>f.id), ...fotosPreparadas.map(f=>f.id)];
      if(ids.length){
        await db.query(
          'INSERT INTO transporte.bus_fotos(cooperativa_id,bus_id,archivo_id,orden) SELECT $1,$2,u.archivo_id,u.orden::int FROM unnest($3::uuid[]) WITH ORDINALITY AS u(archivo_id,orden)',
          [c,id,ids],
        );
      }
      return detalleBus(db,c,id);
    }));
  }catch(e){next(e);}
});

editorRouter.get('/compatibilidades',async(req,res,next)=>{
  try{res.json(await sesionEditor(req,async db=>{
    const c=await cooperativa(db,'operacion.admin',req.query.cooperativaId);
    const [frecuencias,relaciones,buses,gruposRaw]=await consultarLote(db,[
      {sql:`SELECT f.id,f.codigo,to_char(f.hora_salida,'HH24:MI') hora,f.activa,f.version,
      (SELECT t.nombre FROM transporte.ruta_paradas p JOIN transporte.terminales t ON t.id=p.terminal_id WHERE p.ruta_id=f.ruta_id ORDER BY p.orden LIMIT 1) origen,
      (SELECT t.nombre FROM transporte.ruta_paradas p JOIN transporte.terminales t ON t.id=p.terminal_id WHERE p.ruta_id=f.ruta_id ORDER BY p.orden DESC LIMIT 1) destino
      FROM transporte.frecuencias f WHERE f.cooperativa_id=$1 ORDER BY f.codigo`,valores:[c]},
      {sql:'SELECT frecuencia_id,grupo_id FROM transporte.frecuencia_grupo WHERE cooperativa_id=$1',valores:[c]},
      {sql:'SELECT id,unidad,activo,grupo_id FROM transporte.buses WHERE cooperativa_id=$1',valores:[c]},
      {sql:'SELECT id,nombre,descripcion,activo FROM transporte.grupos_bus WHERE cooperativa_id=$1 ORDER BY nombre',valores:[c]},
    ]);
    const grupos=gruposRaw.map(g=>({...g,descripcion:g.descripcion??'',buses:buses.filter(b=>b.grupo_id===g.id),frecuenciaIds:relaciones.filter(r=>r.grupo_id===g.id).map(r=>r.frecuencia_id)}));
    return {frecuencias,grupos};
  }));}catch(e){next(e);}
});
editorRouter.put('/compatibilidades',async(req,res,next)=>{
  try{res.json(await sesionEditor(req,async db=>{
    const c=await cooperativa(db,'operacion.admin',req.query.cooperativaId),d=req.body,id=uuid(d.frecuenciaId);
    exigir(Array.isArray(d.grupoIds)&&d.grupoIds.length>=1&&d.grupoIds.length<=50&&new Set(d.grupoIds).size===d.grupoIds.length,'Asigna entre uno y 50 grupos activos sin repetir.');
    const grupoIds=d.grupoIds.map(uuid);
    const f=(await db.query('SELECT version,activa FROM transporte.frecuencias WHERE id=$1 AND cooperativa_id=$2 FOR UPDATE',[id,c])).rows[0];
    if(!f)throw new ErrorEditor(404,'Frecuencia no disponible.');version(f.version,d.version);exigir(f.activa,'La frecuencia está inactiva.');
    if (grupoIds.length) {
      const validos=(await db.query('SELECT id FROM transporte.grupos_bus WHERE cooperativa_id=$1 AND activo AND id=ANY($2::uuid[])',[c,grupoIds])).rowCount;
      exigir(validos===grupoIds.length,'Grupo inactivo o de otra cooperativa.');
    }
    const incompatibles=(await db.query(`SELECT 1 FROM transporte.viajes v JOIN transporte.buses b ON b.id=v.bus_id WHERE v.frecuencia_id=$1 AND v.estado IN('BORRADOR','PUBLICADO','EN_RUTA') AND NOT(b.grupo_id=ANY($2::uuid[])) LIMIT 1`,[id,grupoIds])).rowCount;
    exigir(!incompatibles,'Hay viajes activos asignados a un grupo que intentas quitar.');
    await db.query('DELETE FROM transporte.frecuencia_grupo WHERE frecuencia_id=$1 AND cooperativa_id=$2',[id,c]);
    if (grupoIds.length) {
      await db.query('INSERT INTO transporte.frecuencia_grupo(cooperativa_id,frecuencia_id,grupo_id) SELECT $1,$2,g FROM unnest($3::uuid[]) AS g',[c,id,grupoIds]);
    }
    await db.query('UPDATE transporte.frecuencias SET version=version+1,updated_at=now() WHERE id=$1',[id]);
    return {...d,version:f.version+1};
  }));}catch(e){next(e);}
});

function textoGrupo(valor: unknown, campo: string, maximo: number, obligatorio = true) {
  exigir(typeof valor === 'string', 'Revisa ' + campo + '.');
  const texto = valor.trim();
  exigir(texto.length <= maximo && (!obligatorio || texto.length > 0), 'Revisa ' + campo + '.');
  return texto;
}

editorRouter.get('/grupos', async (req, res, next) => {
  try {
    res.json(await sesionEditor(req, async db => {
      const c = await cooperativa(db, 'flota.admin', req.query.cooperativaId);
      const grupos = (await db.query(`
        SELECT g.id, g.nombre, coalesce(g.descripcion,'') descripcion, g.activo,
          (SELECT count(*)::int FROM transporte.buses b WHERE b.grupo_id=g.id) buses,
          (SELECT count(*)::int FROM transporte.frecuencia_grupo fg WHERE fg.grupo_id=g.id) frecuencias
        FROM transporte.grupos_bus g WHERE g.cooperativa_id=$1 ORDER BY g.nombre`, [c])).rows;
      return { grupos };
    }));
  } catch (e) { next(e); }
});

editorRouter.post('/grupos', async (req, res, next) => {
  try {
    res.status(201).json(await sesionEditor(req, async db => {
      const c = await cooperativa(db, 'flota.admin', req.query.cooperativaId);
      const nombre = textoGrupo(req.body?.nombre, 'Nombre del grupo', 100);
      const descripcion = textoGrupo(req.body?.descripcion ?? '', 'Descripción', 500, false);
      const activo = typeof req.body?.activo === 'boolean' ? req.body.activo : true;
      const r = (await db.query(
        'INSERT INTO transporte.grupos_bus(cooperativa_id,nombre,descripcion,activo) VALUES($1,$2,$3,$4) RETURNING id,nombre,coalesce(descripcion,\'\') descripcion,activo',
        [c, nombre, descripcion || null, activo]
      )).rows[0];
      return { grupo: { ...r, buses: 0, frecuencias: 0 }, mensaje: 'Grupo creado.' };
    }));
  } catch (e) { next(e); }
});

editorRouter.put('/grupos/:id', async (req, res, next) => {
  try {
    res.json(await sesionEditor(req, async db => {
      const c = await cooperativa(db, 'flota.admin', req.query.cooperativaId);
      const id = uuid(req.params.id);
      const nombre = textoGrupo(req.body?.nombre, 'Nombre del grupo', 100);
      const descripcion = textoGrupo(req.body?.descripcion ?? '', 'Descripción', 500, false);
      const activo = typeof req.body?.activo === 'boolean' ? req.body.activo : true;
      const r = (await db.query(
        'UPDATE transporte.grupos_bus SET nombre=$1,descripcion=$2,activo=$3,updated_at=now() WHERE id=$4 AND cooperativa_id=$5 RETURNING id,nombre,coalesce(descripcion,\'\') descripcion,activo',
        [nombre, descripcion || null, activo, id, c]
      )).rows[0];
      if (!r) throw new ErrorEditor(404, 'Grupo no disponible.');
      return { grupo: r, mensaje: 'Grupo actualizado.' };
    }));
  } catch (e) { next(e); }
});

editorRouter.get('/oficinas', async (req, res, next) => {
  try {
    res.json(await sesionEditor(req, async db => {
      const c = await cooperativa(db, 'config.admin', req.query.cooperativaId);
      const oficinas = (await db.query(
        "SELECT id,nombre,direccion,coalesce(telefono,'') telefono,activa FROM transporte.oficinas WHERE cooperativa_id=$1 ORDER BY nombre",
        [c]
      )).rows;
      return { oficinas };
    }));
  } catch (e) { next(e); }
});

editorRouter.post('/oficinas', async (req, res, next) => {
  try {
    res.status(201).json(await sesionEditor(req, async db => {
      const c = await cooperativa(db, 'config.admin', req.query.cooperativaId);
      const nombre = campoTexto(req.body?.nombre, 'Nombre de la oficina', 100);
      const direccion = campoTexto(req.body?.direccion, 'Dirección', 300);
      const telefono = campoTexto(req.body?.telefono ?? '', 'Teléfono', 25, false);
      const activa = typeof req.body?.activa === 'boolean' ? req.body.activa : true;
      const r = (await db.query(
        "INSERT INTO transporte.oficinas(cooperativa_id,nombre,direccion,telefono,activa) VALUES($1,$2,$3,$4,$5) RETURNING id,nombre,direccion,coalesce(telefono,'') telefono,activa",
        [c, nombre, direccion, telefono || null, activa]
      )).rows[0];
      return { oficina: r, mensaje: 'Oficina registrada.' };
    }));
  } catch (e) { next(e); }
});

editorRouter.put('/oficinas/:id', async (req, res, next) => {
  try {
    res.json(await sesionEditor(req, async db => {
      const c = await cooperativa(db, 'config.admin', req.query.cooperativaId);
      const id = uuid(req.params.id);
      const nombre = campoTexto(req.body?.nombre, 'Nombre de la oficina', 100);
      const direccion = campoTexto(req.body?.direccion, 'Dirección', 300);
      const telefono = campoTexto(req.body?.telefono ?? '', 'Teléfono', 25, false);
      const activa = typeof req.body?.activa === 'boolean' ? req.body.activa : true;
      const r = (await db.query(
        "UPDATE transporte.oficinas SET nombre=$1,direccion=$2,telefono=$3,activa=$4,updated_at=now() WHERE id=$5 AND cooperativa_id=$6 RETURNING id,nombre,direccion,coalesce(telefono,'') telefono,activa",
        [nombre, direccion, telefono || null, activa, id, c]
      )).rows[0];
      if (!r) throw new ErrorEditor(404, 'Oficina no disponible.');
      return { oficina: r, mensaje: 'Oficina actualizada.' };
    }));
  } catch (e) { next(e); }
});

editorRouter.use((e:any,_req:Request,res:express.Response,_next:express.NextFunction)=>{
  const status=e.status??(e.code==='28000'?401:e.code==='42501'?403:['23505','23P01','40001'].includes(e.code)?409:['22P02','23514'].includes(e.code)?422:500);
  if(status===500)console.error('Editores Mikel',e.code??e.message);
  res.status(status).json({error:e instanceof ErrorEditor?e.message:status===401?'Inicia sesión para continuar.':status===403?'No tienes permiso para esta operación.':status===409?'Los datos entran en conflicto. Actualiza y revisa.':status===422?'Revisa los campos enviados.':'No se pudo procesar la solicitud.'});
});

return editorRouter;
}
export const editorRouter = crearEditorRouter();
