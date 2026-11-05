import type { Cotizacion } from "../../types/compra/cotizacion";
import type {
  BeneficioVigente,
  ReservaPendiente,
} from "../../types/compra/reserva";
import {
  beneficiosDemo,
  cancelarSimulada,
  cotizarSimulado,
  persistirSimuladas,
  reservaSimulada,
} from "../../mocks/compra/reserva";
import { ErrorCompra } from "./errores";
import { copiar, esperar } from "./simulacion";

// Servicios simulados de la vista 5. Cuando exista el servidor se reemplazan por http()
// (frontend/src/services/http.ts) contra GET /reservas/:id/resumen,
// POST /reservas/:id/cotizacion, POST /reservas/:id/aceptar-cotizacion y DELETE /reservas/:id.

/** GET /reservas/:id/resumen. Devuelve la reserva tal como está; no completa pasajeros de ejemplo. */
export async function obtenerResumen(
  reservaId: string,
): Promise<ReservaPendiente> {
  await esperar(450);
  return copiar(reservaSimulada(reservaId));
}

export async function obtenerBeneficiosResumen(): Promise<BeneficioVigente[]> {
  await esperar(200);
  return copiar(beneficiosDemo);
}

/** POST /reservas/:id/cotizacion: nueva versión con las tarifas vigentes. */
export async function recotizar(reservaId: string): Promise<Cotizacion> {
  await esperar(450);
  return copiar(cotizarSimulado(reservaSimulada(reservaId)));
}

/** POST /reservas/:id/aceptar-cotizacion. Imita el 409 de aceptar_cotizacion() si la versión no es la última. */
export async function aceptarCotizacion(
  reservaId: string,
  version: number,
): Promise<void> {
  await esperar(500);
  const reserva = reservaSimulada(reservaId);
  if (
    !reserva.cotizacion ||
    reserva.cotizacion.version !== version ||
    new Date(reserva.expires_at).getTime() <= Date.now()
  ) {
    throw new ErrorCompra(409, {
      codigo: "COTIZACION_DESACTUALIZADA",
      mensaje:
        "El total cambió desde que abriste el resumen. Revisa la nueva cotización y vuelve a confirmar.",
    });
  }
  reserva.aceptada_version = version;
  persistirSimuladas();
}

/** DELETE /reservas/:id: libera los asientos retenidos. */
export async function cancelarReservaResumen(reservaId: string): Promise<void> {
  await esperar(400);
  cancelarSimulada(reservaId);
}
