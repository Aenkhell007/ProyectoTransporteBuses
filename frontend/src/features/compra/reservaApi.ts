import type { Cotizacion } from "../../types/compra/cotizacion";
import type {
  BeneficioVigente,
  PasajeroDatos,
  PerfilComprador,
  ReservaPendiente,
  SolicitudPasajeros,
} from "../../types/compra/reserva";
import {
  beneficiosDemo,
  cancelarSimulada,
  cotizarSimulado,
  guardarPasajerosSimulado,
  perfilDemo,
  reservaSimulada,
} from "../../mocks/compra/reserva";
import { ErrorCompra } from "./errores";
import { copiar, esperar } from "./simulacion";

// Servicios simulados de la vista 4. Cuando exista el servidor se reemplazan por http()
// (frontend/src/services/http.ts) contra:
// GET /reservas/:id/resumen, PUT /reservas/:id/pasajeros, POST /reservas/:id/cotizacion
// y DELETE /reservas/:id (docs/api/compra-endpoints.md).

export async function obtenerReserva(
  reservaId: string,
): Promise<ReservaPendiente> {
  await esperar(400);
  return copiar(reservaSimulada(reservaId));
}

/** Perfil del usuario autenticado (módulo de Matías). */
export async function obtenerPerfil(): Promise<PerfilComprador> {
  await esperar(300);
  return copiar(perfilDemo);
}

/** Beneficios configurados para la cooperativa del viaje (tabla beneficios). */
export async function obtenerBeneficios(): Promise<BeneficioVigente[]> {
  await esperar(250);
  return copiar(beneficiosDemo);
}

/**
 * PUT /reservas/:id/pasajeros. Un correo de contacto terminado en @falla.test simula
 * un error de red para probar que la pantalla conserva lo escrito.
 */
export async function guardarPasajeros(
  reservaId: string,
  solicitud: SolicitudPasajeros,
): Promise<PasajeroDatos[]> {
  await esperar(600);
  if (solicitud.contacto.email.trim().toLowerCase().endsWith("@falla.test")) {
    throw new ErrorCompra(0, {
      codigo: "SIN_CONEXION",
      mensaje: "Sin conexión",
    });
  }
  const reserva = reservaSimulada(reservaId);
  guardarPasajerosSimulado(reserva, solicitud.pasajeros);
  reserva.contacto = copiar(solicitud.contacto);
  return copiar(reserva.pasajeros);
}

/** POST /reservas/:id/cotizacion: crea una nueva versión con los importes del servidor. */
export async function cotizarReserva(reservaId: string): Promise<Cotizacion> {
  await esperar(500);
  return copiar(cotizarSimulado(reservaSimulada(reservaId)));
}

/** DELETE /reservas/:id: libera los asientos retenidos. */
export async function cancelarReserva(reservaId: string): Promise<void> {
  await esperar(400);
  cancelarSimulada(reservaId);
}

/**
 * Simula la subida del respaldo de un beneficio. La API real debe validar tipo, tamaño
 * y contenido antes de registrar el archivo (GUIA_COMPLETA.md §9); el endpoint está pendiente.
 */
export async function subirRespaldo(
  archivo: File,
): Promise<{ archivo_id: string }> {
  await esperar(500);
  const tipos = ["application/pdf", "image/jpeg", "image/png"];
  if (!tipos.includes(archivo.type)) {
    throw new ErrorCompra(415, {
      codigo: "TIPO_NO_ADMITIDO",
      mensaje: "Adjunta un PDF, JPG o PNG.",
    });
  }
  return { archivo_id: crypto.randomUUID() };
}
