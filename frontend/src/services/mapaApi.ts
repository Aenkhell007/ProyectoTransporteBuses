import type { MapaAsientos } from '../types/flota';
import { http } from './http';

/**
 * GET /viajes/:viajeId/mapa-asientos?origen_orden=..&destino_orden=..
 * Es solo de consulta: la disponibilidad real se verifica de nuevo, de forma
 * transaccional, al crear la reserva.
 */
export function obtenerMapaAsientos(
  viajeId: string,
  origenOrden: number,
  destinoOrden: number,
): Promise<MapaAsientos> {
  const consulta = new URLSearchParams({
    origen_orden: String(origenOrden),
    destino_orden: String(destinoOrden),
  });
  return http<MapaAsientos>(`/viajes/${viajeId}/mapa-asientos?${consulta.toString()}`);
}