import type { PoolClient } from "pg";
import type { DatosPago } from "../../../shared/pagos";
import { conservarDatosCompra } from "../pagos/datos";

export interface FiltrosListaViajes {seccion:string;estado:string;q:string;desde:string;hasta:string;cursor:number}
// Además de RLS, se exige que la reserva pertenezca al actor autenticado.
// El ID de cliente nunca procede de un parámetro del navegador.
export async function listarViajesPropios(db:PoolClient,f:FiltrosListaViajes){
 const r=await db.query(`WITH propios AS (
  SELECT r.id,v.salida,COALESCE(c.codigo::text,r.id::text) codigo,d.datos->'viaje'->>'destino' destino,d.datos,
   CASE WHEN c.estado='REEMBOLSADA' THEN 'REEMBOLSADA' WHEN c.estado='CANCELADA' OR r.estado='CANCELADA' THEN 'CANCELADA'
    WHEN c.estado='CONFIRMADA' THEN CASE WHEN v.salida>now() THEN 'CONFIRMADA' ELSE 'FINALIZADO' END
    WHEN r.estado='VENCIDA' OR r.expires_at<=now() THEN 'VENCIDA'
    WHEN i.estado='RECHAZADO' THEN 'RECHAZADA' WHEN i.estado='EN_REVISION' THEN 'PAGO_EN_VERIFICACION' ELSE 'PENDIENTE_PAGO' END estado
  FROM transporte.reservas r JOIN transporte.viajes v ON v.id=r.viaje_id
  LEFT JOIN LATERAL(SELECT transporte.consultar_pago_cliente(r.id) datos)d ON true
  LEFT JOIN transporte.compras c ON c.reserva_id=r.id
  LEFT JOIN LATERAL(SELECT estado FROM transporte.intentos_pago WHERE reserva_id=r.id ORDER BY (estado IN('PENDIENTE','EN_REVISION','APROBADO')) DESC,created_at DESC,id DESC LIMIT 1)i ON true
  WHERE r.cliente_id=transporte.actor()
 ), filtrados AS(SELECT * FROM propios WHERE
  CASE WHEN salida>now() AND estado IN('CONFIRMADA','PAGO_EN_VERIFICACION','PENDIENTE_PAGO','RECHAZADA') THEN 'proximos' ELSE 'historial' END=$1
  AND ($2='' OR estado=$2) AND ($3='' OR codigo ILIKE '%'||$3||'%' OR destino ILIKE '%'||$3||'%')
  AND ($4='' OR (salida AT TIME ZONE 'America/Guayaquil')::date >= nullif($4,'')::date)
  AND ($5='' OR (salida AT TIME ZONE 'America/Guayaquil')::date <= nullif($5,'')::date)
 ) SELECT id,estado,datos FROM filtrados ORDER BY CASE WHEN $1='proximos' THEN salida END ASC,CASE WHEN $1='historial' THEN salida END DESC,id OFFSET $6 LIMIT 13`,[f.seccion,f.estado,f.q,f.desde,f.hasta,f.cursor]);
 const data=[];
 for(const item of r.rows.slice(0,12)){
  const d=conservarDatosCompra(item.datos as DatosPago);
  data.push(tarjetaViaje(d,item.estado));
 }
 return {data,next_cursor:r.rows.length>12?String(f.cursor+12):null};
}
export function tarjetaViaje(d:DatosPago,estado:string){
 return {tipo:d.compra?'COMPRA':'RESERVA',compra_id:d.compra?.id??null,reserva_id:d.reserva.id,codigo:d.compra?.codigo??d.reserva.id,estado,
 salida:d.viaje.salida,llegada:d.viaje.llegada,origen:{ciudad:d.viaje.origen,terminal:d.viaje.terminalOrigen},destino:{ciudad:d.viaje.destino,terminal:d.viaje.terminalDestino},
 grupo:d.viaje.servicio,pisos:d.viaje.pisos,pisos_asientos:[...new Set(d.pasajeros.map(p=>p.piso))],pasajeros:d.pasajeros.map(p=>p.nombre),asientos:d.pasajeros.map(p=>p.asiento),
 total_pagado_centavos:d.compra?.totalPagadoCentavos??null,monto_reportado_centavos:null,monto_esperado_centavos:d.cotizacion?(d.intento?.totalCentavos??d.reserva.total_centavos):null,
 boleto_id:d.documento?.id??null,estado_documento:d.documento?.estado??null,archivo_id:d.documento?.estado==='LISTO'?d.documento.archivoId:null,foto_url:null};
}
