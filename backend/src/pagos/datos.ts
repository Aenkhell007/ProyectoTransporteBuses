import type {PoolClient} from 'pg';
import type { DatosPago } from "../../../shared/pagos";

// Una compra conserva la identidad del servicio vendido aunque después se edite el catálogo.
export function conservarDatosCompra(datos: DatosPago): DatosPago {
  const s = datos.compra?.viajeSnapshot;
  if (!s) return datos;
  const objeto = (v: unknown) =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const texto = (v: unknown, anterior: string) =>
    typeof v === "string" ? v : anterior;
  const bus = objeto(s.bus),
    coop = objeto(s.cooperativa),
    origen = objeto(s.terminalOrigen),
    destino = objeto(s.terminalDestino),
    v = datos.viaje;
  return {
    ...datos,
    viaje: {
      ...v,
      cooperativa: texto(coop.nombre, v.cooperativa),
      origen: texto(origen.ciudad, v.origen),
      destino: texto(destino.ciudad, v.destino),
      terminalOrigen: texto(origen.terminal, v.terminalOrigen),
      terminalDestino: texto(destino.terminal, v.terminalDestino),
      unidad: texto(bus.unidad, v.unidad),
      placa: texto(bus.placa, v.placa),
      chasis: texto(bus.chasis, v.chasis),
      carroceria: texto(bus.carroceria, v.carroceria),
      servicio: texto(bus.grupo, v.servicio),
    },
  };
}

export async function conEstadoReembolsos(db:PoolClient,datos:DatosPago):Promise<DatosPago>{
 if(!datos.compra)return datos;
 const filas: {estado:string;codigo:string;piso:number}[]=(await db.query('SELECT transporte.asientos_reembolso($1) datos',[datos.reserva.id])).rows[0].datos;
 const totales=(await db.query("SELECT coalesce(sum(monto_centavos)FILTER(WHERE estado IN('SOLICITADO','APROBADO')),0) pendiente,coalesce(sum(monto_centavos)FILTER(WHERE estado='EJECUTADO'),0) ejecutado FROM transporte.solicitudes_reembolso WHERE compra_id=$1",[datos.compra.id])).rows[0];
 const cancelados=filas.filter(f=>f.estado==='LIBERADO').map(f=>f.piso+':'+f.codigo);
 return {...datos,pasajeros:datos.compra.estado==='CONFIRMADA'?datos.pasajeros.filter(p=>!cancelados.includes(p.piso+':'+p.asiento)):datos.pasajeros,reembolsos:{cancelados,enTramiteCentavos:Number(totales.pendiente),ejecutadoCentavos:Number(totales.ejecutado)}};
}
