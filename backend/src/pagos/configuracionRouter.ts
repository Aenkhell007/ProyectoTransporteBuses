import express from 'express';
import type { Request } from 'express';
import type { PoolClient } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { conSesion } from '../sesion';
import { ErrorPago, uuid } from './validacion';
import { ErrorConfiguracion, exigirPago, FORMATOS, textoPago, validarPolitica } from './configuracionValidacion';

async function sesion<T>(req: Request, trabajo: (db: PoolClient) => Promise<T>) {
  const token = req.cookies?.transporte_sesion;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new ErrorConfiguracion(401, 'Inicia sesión para continuar.');
  return conSesion(token, trabajo);
}
async function ambito(db: PoolClient, id: string) {
  const r = await db.query("SELECT id,nombre FROM transporte.cooperativas WHERE id=$1 AND activa AND transporte.puede('pagos.configurar',id)", [id]);
  if (!r.rows.length) throw new ErrorConfiguracion(403, 'No tienes permiso para configurar los pagos de esta cooperativa.');
  return r.rows[0];
}
async function limitesGlobales(db: PoolClient) {
  const r = (await db.query('SELECT transporte.limites_editor() AS valor')).rows[0]?.valor;
  const formatos = ['JPG', 'PNG', 'PDF'].filter(f => !Array.isArray(r?.formatos) || r.formatos.includes(f));
  return { formatos, maximoMB: Math.min(5, Number(r?.maxArchivoMB) || 5) };
}
export async function leerConfiguracion(db: PoolClient, coop: string) {
  const cooperativa = await ambito(db, coop);
  const politica = (await db.query('SELECT * FROM transporte.politica_comprobantes WHERE cooperativa_id=$1', [coop])).rows[0];
  const cuentas = (await db.query(`SELECT c.*,b.nombre banco FROM transporte.cuentas_bancarias c JOIN transporte.bancos b ON b.id=c.banco_id WHERE c.cooperativa_id=$1 ORDER BY c.predeterminada DESC,c.created_at,c.id`, [coop])).rows.map(c => ({
    id: c.id, version: c.version, bancoId: c.banco_id, banco: c.banco, tipo: c.tipo === 'CORRIENTE' ? 'Corriente' : 'Ahorros', numero: c.numero, titular: c.titular,
    ruc: c.documento_titular, alias: c.alias ?? '', moneda: 'USD', activa: c.activa, predeterminada: c.predeterminada,
    qrId: c.qr_archivo_id, qrSrc: c.qr_archivo_id ? `/api/configuracion/pagos/${coop}/cuentas/${c.id}/qr?v=${c.version}` : '',
  }));
  const metodos = (await db.query(`SELECT m.codigo,m.nombre,m.tipo,m.adaptador_disponible,coalesce(c.habilitado,false) habilitado,coalesce(c.instrucciones,'') instrucciones FROM transporte.metodos_pago m LEFT JOIN transporte.cooperativa_metodos_pago c ON c.metodo_id=m.id AND c.cooperativa_id=$1 ORDER BY m.codigo`, [coop])).rows.map(m => ({
    codigo: m.codigo, nombre: m.nombre, descripcion: m.tipo === 'PASARELA' ? 'Proveedor pendiente de integración técnica.' : m.codigo === 'BANCO' ? 'Transferencia o depósito con revisión del comprobante.' : 'Cobro presencial por el personal autorizado.',
    habilitado: m.habilitado && m.adaptador_disponible && ['BANCO', 'EFECTIVO'].includes(m.codigo), disponible: m.adaptador_disponible && ['BANCO', 'EFECTIVO'].includes(m.codigo),
    instrucciones: m.instrucciones, estado: m.tipo === 'PASARELA' ? 'Pendiente de conexión' : undefined,
  }));
  return { cooperativa, version: politica?.version ?? 0, cuentas, metodos, formatos: politica ? Object.keys(FORMATOS).filter(f => politica.mimes.includes(FORMATOS[f])) : ['JPG', 'PNG', 'PDF'],
    maximoMB: Math.min(5, Number(politica?.max_bytes ?? 5242880) / 1048576), referenciaObligatoria: politica?.referencia_obligatoria ?? false,
    bancos: (await db.query('SELECT id,nombre FROM transporte.bancos WHERE activo ORDER BY nombre')).rows, limites: await limitesGlobales(db) };
}
async function guardarQr(db: PoolClient, coop: string, valor: unknown) {
  exigirPago(typeof valor === 'string' && valor.length > 0 && valor.length <= 7_000_000 && /^[A-Za-z0-9+/]+={0,2}$/.test(valor), 'El QR debe ser una imagen JPG o PNG de hasta 5 MB.');
  const buffer = Buffer.from(valor, 'base64');
  exigirPago(buffer.length <= 5242880, 'El QR supera los 5 MB.');
  let contenido: Buffer;
  try {
    const meta = await sharp(buffer, { limitInputPixels: 24_000_000 }).metadata();
    exigirPago(['png', 'jpeg'].includes(meta.format ?? '') && (!meta.pages || meta.pages === 1), 'QR: usa una imagen JPG o PNG estática.');
    contenido = await sharp(buffer, { limitInputPixels: 24_000_000 }).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  } catch { throw new ErrorConfiguracion(422, 'QR inválido. Usa una imagen JPG o PNG estática.'); }
  exigirPago(contenido.length <= 5242880, 'El QR procesado supera los 5 MB.');
  const id = randomUUID();
  await db.query(`INSERT INTO transporte.archivos(id,propietario_id,cooperativa_id,categoria,ruta_privada,mime,bytes,sha256,validado_servidor) VALUES($1,transporte.actor(),$2,'QR_BANCARIO',$3,'image/png',$4,$5,true)`, [id, coop, `pagos-qr-db/${id}`, contenido.length, createHash('sha256').update(contenido).digest('hex')]);
  await db.query('INSERT INTO transporte.pagos_qr_contenidos(archivo_id,cooperativa_id,contenido) VALUES($1,$2,$3)', [id, coop, contenido]);
  return id;
}
export async function guardarConfiguracion(db: PoolClient, coop: string, datos: any) {
  await ambito(db, coop);
  await db.query("SELECT pg_advisory_xact_lock(hashtext('configuracion-pagos'),hashtext($1))", [coop]);
  const actual = await leerConfiguracion(db, coop);
  if (actual.version !== datos?.version) throw new ErrorConfiguracion(409, 'La configuración cambió. Recarga antes de guardar; tus cambios siguen visibles.');
  validarPolitica(datos, actual.limites);
  const ids = datos.cuentas.map((c: any) => uuid(c.id));
  exigirPago(new Set(ids).size === ids.length, 'Hay cuentas duplicadas en la solicitud.');
  exigirPago(actual.cuentas.every(c => ids.includes(c.id)), 'No se pueden eliminar cuentas con historial; desactívalas.');
  const bancos = (await db.query('SELECT id,nombre,activo FROM transporte.bancos')).rows;
  const validas: any[] = [];
  const claves = new Set<string>();
  for (const c of datos.cuentas) {
    const anterior = actual.cuentas.find(a => a.id === c.id);
    if (anterior && anterior.version !== c.version) throw new ErrorConfiguracion(409, 'Una cuenta cambió. Recarga antes de guardar.');
    const banco = bancos.find(b => b.id === c.bancoId || (!c.bancoId && b.nombre === c.banco));
    exigirPago(banco && (banco.activo || (!c.activa && anterior?.bancoId === banco.id)), 'Selecciona un banco activo del catálogo.');
    const numero = textoPago(c.numero, 'Número de cuenta', 50);
    const ruc = textoPago(c.ruc, 'RUC del titular', 30);
    // Las cuentas académicas existentes se conservan; las altas y ediciones exigen datos válidos.
    exigirPago((anterior?.numero === numero && anterior?.ruc === ruc) || (/^\d{4,50}$/.test(numero) && /^\d{13}$/.test(ruc)), 'Cuenta: ingresa entre 4 y 50 dígitos y un RUC de 13 dígitos.');
    const clave = `${banco.id}/${c.tipo}/${numero}`;
    exigirPago(!claves.has(clave), 'Esta cuenta bancaria ya está agregada.'); claves.add(clave);
    exigirPago(['Corriente', 'Ahorros'].includes(c.tipo) && (!c.moneda || c.moneda === 'USD'), 'Tipo de cuenta o moneda no permitido.');
    validas.push({ ...c, bancoId: banco.id, numero, ruc, titular: textoPago(c.titular, 'Titular', 200), alias: textoPago(c.alias ?? '', 'Alias', 100, false), anterior });
  }
  exigirPago(new Set(datos.metodos.map((m: any) => m.codigo)).size === actual.metodos.length && datos.metodos.length === actual.metodos.length, 'Envía el catálogo completo de métodos, sin duplicados.');
  for (const m of datos.metodos) {
    const original = actual.metodos.find(a => a.codigo === m.codigo);
    exigirPago(original && typeof m.habilitado === 'boolean' && (!m.habilitado || original.disponible), 'No se puede activar un proveedor sin adaptador y verificación técnica.');
    textoPago(m.instrucciones ?? '', 'Instrucciones', 1000, false);
  }
  const bancoHabilitado = datos.metodos.some((m: any) => m.codigo === 'BANCO' && m.habilitado);
  const activas = validas.filter(c => c.activa);
  exigirPago(!bancoHabilitado || activas.length > 0, 'Activa al menos una cuenta para habilitar Transferencia / Depósito.');
  // La primera cuenta activa pasa a ser predeterminada si todavía no se eligió una.
  if (activas.length && !activas.some(c => c.predeterminada)) activas[0].predeterminada = true;
  await db.query('UPDATE transporte.cuentas_bancarias SET predeterminada=false WHERE cooperativa_id=$1 AND predeterminada', [coop]);
  for (const c of validas) {
    let qrId = c.anterior?.qrId ?? null;
    if (c.quitarQr === true) qrId = null;
    if (c.qrBase64 !== undefined) qrId = await guardarQr(db, coop, c.qrBase64);
    if (c.anterior) await db.query(`UPDATE transporte.cuentas_bancarias SET banco_id=$3,tipo=$4,numero=$5,titular=$6,documento_titular=$7,alias=$8,activa=$9,predeterminada=$10,qr_archivo_id=$11,version=version+1,updated_at=now() WHERE cooperativa_id=$1 AND id=$2`, [coop, c.id, c.bancoId, c.tipo === 'Corriente' ? 'CORRIENTE' : 'AHORROS', c.numero, c.titular, c.ruc, c.alias || null, c.activa, c.predeterminada, qrId]);
    else await db.query(`INSERT INTO transporte.cuentas_bancarias(cooperativa_id,id,banco_id,tipo,numero,titular,documento_titular,alias,activa,predeterminada,qr_archivo_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [coop, c.id, c.bancoId, c.tipo === 'Corriente' ? 'CORRIENTE' : 'AHORROS', c.numero, c.titular, c.ruc, c.alias || null, c.activa, c.predeterminada, qrId]);
  }
  for (const m of datos.metodos) await db.query(`INSERT INTO transporte.cooperativa_metodos_pago(cooperativa_id,metodo_id,habilitado,instrucciones) SELECT $1,id,$3,$4 FROM transporte.metodos_pago WHERE codigo=$2 ON CONFLICT(cooperativa_id,metodo_id) DO UPDATE SET habilitado=excluded.habilitado,instrucciones=excluded.instrucciones,updated_at=now()`, [coop, m.codigo, m.habilitado, (m.instrucciones ?? '').trim()]);
  await db.query(`INSERT INTO transporte.politica_comprobantes(cooperativa_id,max_bytes,mimes,referencia_obligatoria,version) VALUES($1,$2,$3,$4,1) ON CONFLICT(cooperativa_id) DO UPDATE SET max_bytes=excluded.max_bytes,mimes=excluded.mimes,referencia_obligatoria=excluded.referencia_obligatoria,version=politica_comprobantes.version+1,updated_at=now()`, [coop, datos.maximoMB * 1048576, datos.formatos.map((f: string) => FORMATOS[f]), datos.referenciaObligatoria]);
  return leerConfiguracion(db, coop);
}
export function crearConfiguracionPagosRouter(contexto: typeof sesion = sesion) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (!['GET', 'HEAD'].includes(req.method) && (!req.get('origin') || ![process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173', 'http://127.0.0.1:5173', 'http://localhost:5173'].includes(req.get('origin')!) || req.get('sec-fetch-site') === 'cross-site')) return next(new ErrorConfiguracion(403, 'Origen de solicitud no permitido.'));
    next();
  });
  router.use(express.json({ limit: '8mb' }));
  router.get('/cooperativas', async (req, res, next) => {
    try { res.json(await contexto(req, async db => ({ cooperativas: (await db.query("SELECT id,nombre FROM transporte.cooperativas WHERE activa AND transporte.puede('pagos.configurar',id) ORDER BY nombre")).rows }))); } catch (e) { next(e); }
  });
  router.get('/:coop', async (req, res, next) => {
    try { res.json(await contexto(req, db => leerConfiguracion(db, uuid(req.params.coop)))); } catch (e) { next(e); }
  });
  router.put('/:coop', async (req, res, next) => {
    try { res.json(await contexto(req, db => guardarConfiguracion(db, uuid(req.params.coop), req.body))); } catch (e) { next(e); }
  });
  router.get('/:coop/cuentas/:id/qr', async (req, res, next) => {
    try {
      const contenido = await contexto(req, async db => {
        const coop = uuid(req.params.coop); await ambito(db, coop);
        const r = await db.query('SELECT q.contenido FROM transporte.pagos_qr_contenidos q JOIN transporte.cuentas_bancarias c ON c.qr_archivo_id=q.archivo_id AND c.cooperativa_id=q.cooperativa_id WHERE c.cooperativa_id=$1 AND c.id=$2', [coop, uuid(req.params.id)]);
        if (!r.rows.length) throw new ErrorConfiguracion(404, 'QR no disponible.'); return r.rows[0].contenido;
      });
      res.type('png').send(contenido);
    } catch (e) { next(e); }
  });
  router.use((e: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (e instanceof ErrorConfiguracion || e instanceof ErrorPago) return res.status(e.status).json({ error: e.message });
    const code = (e as { code?: string })?.code;
    const status = (e as { status?: number })?.status;
    if (status === 413 || status === 400) return res.status(status).json({ error: status === 413 ? 'La imagen o solicitud es demasiado grande.' : 'JSON no válido.' });
    if (code === '23505') return res.status(409).json({ error: 'La cuenta ya existe o los datos cambiaron. Recarga la configuración.' });
    if (code === '28000') return res.status(401).json({ error: 'La sesión venció. Inicia sesión nuevamente.' });
    if (code === '42501') return res.status(403).json({ error: 'No tienes permiso para guardar esta configuración.' });
    res.status(503).json({ error: 'No se pudo consultar o guardar la configuración. Revisa la conexión y las migraciones.' });
  });
  return router;
}
export const configuracionPagosRouter = crearConfiguracionPagosRouter();
