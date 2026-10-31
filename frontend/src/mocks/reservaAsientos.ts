import { ErrorCompra } from '../features/compra/errores';

export interface SolicitudReserva {
  viaje_id: string;
  origen_orden: number;
  destino_orden: number;
  asiento_ids: string[];
}

export interface RespuestaReserva {
  reserva_id: string;
  expires_at: string;
}

export type ModoSimulacion = 'ok' | 'conflicto' | 'invalido' | 'red';

// La base retiene los asientos 15 minutos (config_global: retencion_minutos).
const RETENCION_MINUTOS = 15;

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

/**
 * Imita POST /reservas (reservar_asientos). Los modos permiten ver los errores del
 * contrato: conflicto = 409 ASIENTO_NO_DISPONIBLE, invalido = 422 ASIENTOS_INVALIDOS y
 * red = sin conexión (status 0).
 */
export async function simularReserva(
  solicitud: SolicitudReserva,
  modo: ModoSimulacion = 'ok',
): Promise<RespuestaReserva> {
  await esperar(400);

  if (modo === 'red') throw new ErrorCompra(0);

  if (modo === 'conflicto') {
    throw new ErrorCompra(409, {
      codigo: 'ASIENTO_NO_DISPONIBLE',
      mensaje: 'Uno de los asientos ya no está disponible. Actualiza la disponibilidad y elige otro.',
    });
  }

  const repetidos = new Set(solicitud.asiento_ids).size !== solicitud.asiento_ids.length;
  if (modo === 'invalido' || solicitud.asiento_ids.length === 0 || repetidos) {
    throw new ErrorCompra(422, {
      codigo: 'ASIENTOS_INVALIDOS',
      mensaje: 'La selección de asientos no es válida.',
    });
  }

  return {
    reserva_id: crypto.randomUUID(),
    expires_at: new Date(Date.now() + RETENCION_MINUTOS * 60000).toISOString(),
  };
}