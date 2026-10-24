import { mapaAsientosMock } from './mapaAsientos';
import type { CeldaMapa, MapaViaje } from '../types/mapaViaje';

/**
 * Imita plano_disponible(viaje, origen, destino): una celda con una ocupación que se
 * cruza con el tramo pedido queda RESERVADO; las demás, DISPONIBLE.
 */
export function simularPlanoDisponible(origen: number, destino: number): MapaViaje {
  const codigos = new Map(mapaAsientosMock.clases.map((k) => [k.id, k.codigo]));

  return {
    planoId: mapaAsientosMock.plano_id,
    celdas: mapaAsientosMock.celdas.map(
      (c): CeldaMapa => {
        const ocupada = c.ocupaciones.some(
          (o) => o.origen_orden < destino && o.destino_orden > origen,
        );
        return {
          id: c.id,
          piso: c.piso,
          fila: c.fila,
          columna: c.columna,
          tipo: c.tipo,
          codigo: c.codigo,
          clase: c.clase_id ? (codigos.get(c.clase_id) ?? null) : null,
          estado: ocupada ? 'RESERVADO' : 'DISPONIBLE',
        };
      },
    ),
  };
}