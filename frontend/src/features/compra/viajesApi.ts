import type { ListaPaginada } from "../../types/compra/api";
import type {
  ClaseAsientoCodigo,
  Cooperativa,
  DetalleViaje,
  ViajeResultado,
} from "../../types/compra/viajes";
import type { CriteriosBusqueda } from "./busqueda";
import type { FiltrosViajes } from "./filtrosViajes";
import { apiCompra } from "./cliente";
export function buscarViajes(
  criterios: CriteriosBusqueda,
  filtros: FiltrosViajes,
  cursor: string | null,
): Promise<ListaPaginada<ViajeResultado>> {
  const p = new URLSearchParams({
    origen_ciudad_id: criterios.origen,
    destino_ciudad_id: criterios.destino,
    fecha: criterios.fecha,
    cantidad: String(criterios.cantidad),
  });
  for (const [k, v] of Object.entries(filtros))
    if (v !== "" && v !== null) p.set(k, String(v));
  if (cursor) p.set("cursor", cursor);
  return apiCompra(`/viajes?${p}`);
}
export function obtenerDetalleViaje(
  viajeId: string,
  _fecha: string,
  origenOrden: number,
  destinoOrden: number,
  _clase: ClaseAsientoCodigo | "",
): Promise<DetalleViaje> {
  return apiCompra(
    `/viajes/${encodeURIComponent(viajeId)}?origen_orden=${origenOrden}&destino_orden=${destinoOrden}`,
  );
}
export const verificarViaje = (
  viaje: ViajeResultado,
  fecha: string,
  clase: ClaseAsientoCodigo | "",
) =>
  obtenerDetalleViaje(
    viaje.viaje_id,
    fecha,
    viaje.origen_orden,
    viaje.destino_orden,
    clase,
  );
export const obtenerOpcionesFiltro = () =>
  apiCompra<{
    cooperativas: Cooperativa[];
    chasis: string[];
    carrocerias: string[];
  }>("/catalogos/filtros-viajes");

// Tipo conservado para los fixtures aislados; los servicios reales no importan esos fixtures.
export interface ViajeReservable {
  viaje: import("../../types/compra/reserva").ReservaPendiente["viaje"];
  bus: import("../../types/compra/reserva").ReservaPendiente["bus"];
  tarifas: Partial<Record<ClaseAsientoCodigo, number>>;
}
