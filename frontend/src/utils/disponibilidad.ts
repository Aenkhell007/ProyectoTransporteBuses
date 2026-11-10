import type { Celda } from '../types/flota';

/**
 * Un asiento está libre para el recorrido origen -> destino si ninguna
 * ocupación cumple: origen_orden < destino y destino_orden > origen.
 * Es solo de consulta: el backend verifica de nuevo al reservar.
 */
export function asientoDisponible(celda: Celda, origen: number, destino: number): boolean {
  if (celda.tipo !== 'ASIENTO' || !celda.activa) return false;
  return !celda.ocupaciones.some(
    (o) => o.origen_orden < destino && o.destino_orden > origen,
  );
}