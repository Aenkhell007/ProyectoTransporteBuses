import { leerArchivo } from '../pagos/archivos';
import { nombreSeguro, ErrorPago } from '../pagos/validacion';
import { conservarDatosCompra } from '../pagos/datos';
import type { DatosPago } from '../../../shared/pagos';
import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sesionOficina, ErrorOficina, fechaConsulta } from './acceso';
import { accesoOficina, listarReservas, alcanceReserva } from './consultas';

export const oficinaRouter = Router();
oficinaRouter.use('/oficina', (req: Request, res: Response, next: NextFunction) => {
  res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if (!['GET','HEAD'].includes(req.method)) {
    const origen = req.get('origin');
    if (!origen || ![process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173','http://localhost:5173'].includes(origen) || req.get('sec-fetch-site')==='cross-site')
      return next(new ErrorOficina(403,'Origen no autorizado.'));
  }
  next();
});
oficinaRouter.get('/oficina/contexto', async (req,res,next) => {
  try { res.json(await sesionOficina(req, async db => ({oficinas:await accesoOficina(db)}))); } catch(e) { next(e); }
});
oficinaRouter.get('/oficina/resumen', async (req,res,next) => {
  try {
    const fecha = fechaConsulta(req.query.fecha,new Date().toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'}));
    res.json(await sesionOficina(req, async db => {
      const reservas = await listarReservas(db);
      const hoy = reservas.filter(r => r.confirmado_at && new Date(r.confirmado_at).toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'})===fecha);
      const pendientes = reservas.filter(r=>r.comprobante_estado==='EN_REVISION');
      const salidas = (await db.query(`SELECT v.id,b.unidad,v.salida,
        (SELECT count(*)::int FROM transporte.plano_celdas pc WHERE pc.plano_id=v.plano_id AND pc.tipo='ASIENTO') AS capacidad,
        (SELECT count(*)::int FROM transporte.reserva_asientos ra WHERE ra.viaje_id=v.id AND ra.estado='CONFIRMADO') AS vendidos,
        (SELECT ci.nombre FROM transporte.ruta_paradas rp JOIN transporte.terminales t ON t.id=rp.terminal_id JOIN transporte.ciudades ci ON ci.id=t.ciudad_id WHERE rp.ruta_id=f.ruta_id ORDER BY rp.orden LIMIT 1) AS origen,
        (SELECT ci.nombre FROM transporte.ruta_paradas rp JOIN transporte.terminales t ON t.id=rp.terminal_id JOIN transporte.ciudades ci ON ci.id=t.ciudad_id WHERE rp.ruta_id=f.ruta_id ORDER BY rp.orden DESC LIMIT 1) AS destino
        FROM transporte.viajes v JOIN transporte.buses b ON b.id=v.bus_id JOIN transporte.frecuencias f ON f.id=v.frecuencia_id
        WHERE v.estado='PUBLICADO' AND v.salida>now() AND (v.salida AT TIME ZONE 'America/Guayaquil')::date=$1::date
        AND transporte.puede('cooperativa.leer',v.cooperativa_id) ORDER BY v.salida LIMIT 20`,[fecha])).rows;
      return {
        kpis:{ventasHoy:hoy.reduce((s,r)=>s+Number(r.pagado_centavos),0)/100,asientosVendidos:hoy.reduce((s,r)=>s+r.cantidad,0),comprobantesPendientes:pendientes.length,reservasConfirmadas:hoy.length},
        comprobantesPendientes:pendientes.map(r=>({id:r.comprobante_id,reserva:r.compra_codigo??r.id,cliente:r.cliente,viaje:r.ruta,monto:Number(r.reportado_centavos)/100,estado:'En verificación'})),
        proximasSalidas:salidas.map(v=>({id:v.id,ruta:`${v.origen} → ${v.destino}`,hora:new Date(v.salida).toLocaleTimeString('es-EC',{timeZone:'America/Guayaquil',hour:'2-digit',minute:'2-digit',hour12:false}),unidad:v.unidad,asientosVendidos:v.vendidos,capacidad:v.capacidad}))
      };
    }));
  } catch(e) { next(e); }
});

oficinaRouter.get('/oficina/reservas', async (req,res,next)=>{
 try { res.json(await sesionOficina(req,async db=>({reservas:await listarReservas(db)}))); } catch(e){next(e);}
});
oficinaRouter.get('/oficina/reservas/:id', async(req,res,next)=>{
 try { res.json(await sesionOficina(req,async db=>{
 const r=(await db.query(`SELECT r.id FROM transporte.reservas r WHERE r.id=$1 AND ${alcanceReserva()}`,[identificador(req.params.id)])).rows[0];
 if(!r) throw new ErrorOficina(404,'Reserva no disponible en tu ámbito.');
 return (await db.query('SELECT transporte.compra_resumen($1) AS datos',[r.id])).rows[0].datos;
 })); }catch(e){next(e);}
});
export function identificador(v:unknown):string {
 if(typeof v!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) throw new ErrorOficina(422,'Identificador no válido.');
 return v;
}

oficinaRouter.get('/oficina/comprobantes', async(req,res,next)=>{
 try {res.json(await sesionOficina(req,async db=>({comprobantes:(await listarReservas(db,true)).filter(r=>r.comprobante_id)})));}catch(e){next(e);}
});
oficinaRouter.get('/oficina/comprobantes/:id', async(req,res,next)=>{
 try {res.json(await sesionOficina(req,async db=>{
 const fila=(await listarReservas(db,true)).find(r=>r.comprobante_id===identificador(req.params.id));
 if(!fila) throw new ErrorOficina(404,'Comprobante no disponible.');
 const d=(await db.query('SELECT transporte.consultar_pago_cliente($1) AS datos',[fila.id])).rows[0].datos as DatosPago;
 return {comprobante:fila,compra:conservarDatosCompra(d)};
 }));}catch(e){next(e);}
});
oficinaRouter.get('/oficina/comprobantes/:id/archivo',async(req,res,next)=>{
 try {const a=await sesionOficina(req,async db=>{
 const r=(await db.query(`SELECT a.ruta_privada,a.mime FROM transporte.comprobantes cp JOIN transporte.intentos_pago i ON i.id=cp.intento_id JOIN transporte.reservas r ON r.id=i.reserva_id JOIN transporte.archivos a ON a.id=cp.archivo_id WHERE cp.id=$1 AND ${alcanceReserva()}`,[identificador(req.params.id)])).rows[0];
 if(!r)throw new ErrorOficina(404,'Archivo no disponible.');return r;
 });res.type(a.mime).set('Content-Disposition',`${req.query.descargar==='1'?'attachment':'inline'}; filename="${nombreSeguro(a.ruta_privada.split('/').pop())}"`).send(await leerArchivo(a.ruta_privada));}catch(e){next(e);}
});
oficinaRouter.use((e: unknown,_req: Request,res: Response,_next: NextFunction) => {
  const code = (e as {code?:string})?.code;
  const status = e instanceof ErrorOficina || e instanceof ErrorPago ? e.status : code==='28000'?401:code==='42501'?403:['P0001','23505','23P01'].includes(code??'')?409:['22P02','22007'].includes(code??'')?422:503;
  res.status(status).json({error:e instanceof ErrorOficina?e.message:status===401?'La sesión venció. Inicia sesión.':status===403?'No tienes permiso para esta operación.':status===409?'El estado cambió. Actualiza la consulta antes de reintentar.':'No se pudo completar la operación.'});
});

