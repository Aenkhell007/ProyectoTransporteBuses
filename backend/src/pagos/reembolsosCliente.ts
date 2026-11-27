import express,{type Request} from 'express';
import type {PoolClient} from 'pg';
import {conSesion} from '../sesion';
import {consultarLote} from '../lecturas';
import {ErrorPago,uuid} from './validacion';
import {conservarDatosCompra,aplicarEstadoReembolsos} from './datos';
import type {DatosPago} from '../../../shared/pagos';
import { origenPermitido } from '../origen';
function sesion<T>(req:Request,fn:(db:PoolClient)=>Promise<T>){const t=req.cookies?.transporte_sesion;if(typeof t!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(t))throw new ErrorPago(401,'Inicia sesión para continuar.');return conSesion(t,fn);}
function seleccion(v:unknown){if(v===undefined||v===null)return null;const ids=typeof v==='string'?v.split(','):v;if(!Array.isArray(ids)||ids.length<1||ids.length>50)throw new ErrorPago(422,'Selecciona pasajeros válidos.');const lista=ids.map(uuid);if(new Set(lista).size!==lista.length)throw new ErrorPago(422,'No repitas pasajeros.');return lista;}
async function propia(db:PoolClient,id:string){const r=(await db.query('SELECT c.id,c.politica_reembolso_id FROM transporte.compras c JOIN transporte.reservas r ON r.id=c.reserva_id WHERE r.id=$1 AND r.cliente_id=transporte.actor()',[id])).rows[0];if(!r)throw new ErrorPago(404,'Compra no disponible para esta cuenta.');return r;}
export function crearReembolsosClienteRouter(contexto:typeof sesion=sesion){const router=express.Router();
router.use('/:id/reembolso',express.json({limit:'8kb'}));
router.use('/:id/reembolso',(req,res,next)=>{res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!origenPermitido(req.get('origin')))return next(new ErrorPago(403,'Origen no autorizado.'));next();});
router.get('/:id/reembolso',async(req,res,next)=>{try{res.json(await contexto(req,async db=>{
 const rid=uuid(req.params.id),c=await propia(db,rid);
 const asientosSel=seleccion(req.query.asientos);
 const [pagoRows,predRows,elegRows,solRows,polRows,asientosRows,totalesRows]=await consultarLote(db,[
  {sql:'SELECT transporte.consultar_pago_cliente($1) AS datos',valores:[rid]},
  {sql:'SELECT transporte.cuenta_predeterminada_cliente($1) AS id',valores:[rid]},
  {sql:'SELECT transporte.elegibilidad_reembolso_asientos($1,$2::uuid[]) AS datos',valores:[c.id,asientosSel]},
  {sql:'SELECT id,estado,motivo,monto_centavos,porcentaje_bp,decision_motivo,created_at FROM transporte.solicitudes_reembolso WHERE compra_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',valores:[c.id]},
  {sql:'SELECT transporte.politica_reembolso_compra($1) AS datos',valores:[rid]},
  {sql:'SELECT transporte.asientos_reembolso($1) AS datos',valores:[rid]},
  {sql:"SELECT coalesce(sum(monto_centavos) FILTER (WHERE estado IN('SOLICITADO','APROBADO')),0) AS pendiente, coalesce(sum(monto_centavos) FILTER (WHERE estado='EJECUTADO'),0) AS ejecutado FROM transporte.solicitudes_reembolso WHERE compra_id=$1",valores:[c.id]},
 ]);
 const datosBase=conservarDatosCompra(pagoRows[0].datos as DatosPago);
 const predeterminada=predRows[0]?.id;
 datosBase.cuentas.sort((a,b)=>Number(b.id===predeterminada)-Number(a.id===predeterminada));
 const asientos=(asientosRows[0]?.datos??[]) as {estado:string;codigo:string;piso:number}[];
 const pago=aplicarEstadoReembolsos(datosBase,asientos,totalesRows[0] as {pendiente?:string|number;ejecutado?:string|number}|undefined);
 const elegibilidad=elegRows[0]?.datos;
 const solicitud=solRows[0]??null;
 const politica=polRows[0]?.datos;
 return {pago,elegibilidad,solicitud,politica,asientos};
}));}catch(e){next(e);}});
router.post('/:id/reembolso',async(req,res,next)=>{try{const {motivo,clave,asientos}=req.body??{};if(typeof motivo!=='string'||!motivo.trim()||motivo.length>500)throw new ErrorPago(422,'Escribe el motivo (máximo 500 caracteres).');const key=uuid(clave);res.status(201).json(await contexto(req,async db=>{
 const c=await propia(db,uuid(req.params.id));await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[c.id+':reembolso']);
 const previa=(await db.query("SELECT id,solicitado_por,clave_intento,motivo FROM transporte.solicitudes_reembolso WHERE compra_id=$1 AND estado IN('SOLICITADO','APROBADO') ORDER BY created_at DESC LIMIT 1",[c.id])).rows[0];
 if(previa&&previa.clave_intento!==key)throw new ErrorPago(409,'Esta compra ya tiene una solicitud de reembolso en trámite.');
 return (await db.query('SELECT transporte.solicitar_reembolso_asientos($1,$2,$3,$4::uuid[]) id',[c.id,motivo.trim(),key,seleccion(asientos)])).rows[0];
}));}catch(e){next(e);}});
router.use((e:any,_req:Request,res:express.Response,_next:express.NextFunction)=>{const status=e instanceof ErrorPago?e.status:e.code==='28000'?401:e.code==='42501'?404:['23514','22P02'].includes(e.code)?422:['23505','P0001','40001'].includes(e.code)?409:503;res.status(status).json({error:e instanceof ErrorPago?e.message:status===401?'La sesión venció.':status===404?'Compra no disponible.':status===409?'La solicitud o la elegibilidad cambió. Actualiza la consulta.':'No se pudo consultar el reembolso.'});});return router;}
export const reembolsosClienteRouter=crearReembolsosClienteRouter();
