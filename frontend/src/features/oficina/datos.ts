export interface ReservaOficina {
 id:string;cooperativa_id:string;oficina_id:string|null;viaje_id:string;estado:string;estado_actual:string;
 created_at:string;expires_at:string;total_centavos:string|number|null;cantidad:number;salida:string;
 cooperativa:string;cliente:string;email:string;telefono:string;compra_id:string|null;compra_codigo:string|null;
 pagado_centavos:string|number|null;confirmado_at:string|null;comprobante_id:string|null;comprobante_estado:string|null;
 comprobante_version:number|null;motivo:string|null;referencia:string|null;recibido:string|null;archivo_id:string|null;
 mime:string|null;bytes:string|null;reportado_centavos:string|number|null;cuenta_snapshot:Record<string,unknown>|null;
 asientos:string|null;ruta:string;
}
export function pagoEstado(r:ReservaOficina){return r.pagado_centavos!=null?'Pagado':r.comprobante_estado==='EN_REVISION'?'En revisión':r.comprobante_estado==='RECHAZADO'?'Rechazado':'Pendiente';}
