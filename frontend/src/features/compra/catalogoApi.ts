import type { Ciudad, DestinoDestacado, SolicitudContacto } from '../../types/compra/catalogo';
import { ciudadesMock, destinosDestacadosMock } from '../../mocks/compra/catalogo';
import { ErrorCompra } from './errores';
import { copiar, esperar } from './simulacion';

// Servicios simulados. Cuando exista el servidor se reemplazan por http() (PR #34):
// GET /catalogos/ciudades y POST /contacto (docs/api/compra-endpoints.md).

export async function obtenerCiudades(): Promise<Ciudad[]> {
  await esperar();
  return copiar(ciudadesMock);
}

export async function obtenerDestinosDestacados(): Promise<DestinoDestacado[]> {
  await esperar(250);
  return copiar(destinosDestacadosMock);
}

/** Simula enviar_contacto(). Un correo terminado en @falla.test simula un error de red. */
export async function enviarContacto(solicitud: SolicitudContacto): Promise<{ id: string }> {
  await esperar(700);
  if (solicitud.email.trim().toLowerCase().endsWith('@falla.test')) {
    throw new ErrorCompra(0, { codigo: 'SIN_CONEXION', mensaje: 'Sin conexión' });
  }
  return { id: crypto.randomUUID() };
}
