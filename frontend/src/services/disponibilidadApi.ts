import type { Bus } from '../types/bus';
import { http } from './http';
import type { Lista } from './http';

export interface Indisponibilidad {
  id: string;
  bus_id: string;
  desde: string;
  hasta: string;
  motivo: string;
}

/** GET /buses/disponibles?desde=..&hasta=.. (fechas ISO). Error 400 si desde >= hasta. */
export async function listarBusesDisponibles(desde: string, hasta: string): Promise<Bus[]> {
  const consulta = new URLSearchParams({ desde, hasta });
  const respuesta = await http<Lista<Bus>>(`/buses/disponibles?${consulta.toString()}`);
  return respuesta.data;
}

/** GET /buses/:id/indisponibilidades */
export async function listarIndisponibilidades(busId: string): Promise<Indisponibilidad[]> {
  const respuesta = await http<Lista<Indisponibilidad>>(`/buses/${busId}/indisponibilidades`);
  return respuesta.data;
}

/** POST /buses/:id/indisponibilidades (201). hasta debe ser posterior a desde. */
export function crearIndisponibilidad(
  busId: string,
  datos: { desde: string; hasta: string; motivo: string },
): Promise<Indisponibilidad> {
  return http<Indisponibilidad>(`/buses/${busId}/indisponibilidades`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}