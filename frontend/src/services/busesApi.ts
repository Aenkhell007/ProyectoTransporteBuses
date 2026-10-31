import type { Bus, BusFormData } from '../types/bus';
import { http } from './http';
import type { Lista } from './http';

// La API recibe solo los campos con valor: propietario y correo son opcionales.
function cuerpoBus(datos: Partial<BusFormData>) {
  const limpio: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(datos)) {
    if (typeof valor === 'string' && valor.trim() !== '') limpio[clave] = valor.trim();
  }
  return JSON.stringify(limpio);
}

/** GET /buses. Por defecto solo activos; con activo=false, los desactivados. */
export async function listarBuses(activo = true): Promise<Bus[]> {
  const respuesta = await http<Lista<Bus>>(`/buses?activo=${activo}`);
  return respuesta.data;
}

/** GET /buses/:id */
export function obtenerBus(id: string): Promise<Bus> {
  return http<Bus>(`/buses/${id}`);
}

/** POST /buses (201). Errores: 400, 409 (placa o unidad duplicada). */
export function crearBus(datos: BusFormData): Promise<Bus> {
  return http<Bus>('/buses', { method: 'POST', body: cuerpoBus(datos) });
}

/** PUT /buses/:id (200). Al menos un campo. Errores: 400, 404, 409. */
export function actualizarBus(id: string, datos: Partial<BusFormData>): Promise<Bus> {
  return http<Bus>(`/buses/${id}`, { method: 'PUT', body: cuerpoBus(datos) });
}

/** DELETE /buses/:id (204). Desactiva el bus, no lo elimina. Error 409 si tiene viajes o reservas. */
export function desactivarBus(id: string): Promise<void> {
  return http<void>(`/buses/${id}`, { method: 'DELETE' });
}