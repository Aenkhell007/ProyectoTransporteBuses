import type { CeldaPlano, ClaseAsiento } from '../types/plano';
import { celdasParaApi } from '../utils/plano';
import { http } from './http';
import type { Lista } from './http';

export interface PlanoResumen {
  id: string;
  numero_version: number;
  nombre: string;
  pisos: number;
  publicado: boolean;
}

export interface PlanoDetalle extends PlanoResumen {
  celdas: CeldaPlano[];
}

/** GET /clases-asiento */
export async function listarClasesAsiento(): Promise<ClaseAsiento[]> {
  const respuesta = await http<Lista<ClaseAsiento>>('/clases-asiento');
  return respuesta.data;
}

/** GET /buses/:id/planos */
export async function listarPlanos(busId: string): Promise<PlanoResumen[]> {
  const respuesta = await http<Lista<PlanoResumen>>(`/buses/${busId}/planos`);
  return respuesta.data;
}

/** POST /buses/:id/planos (201). Crea una versión nueva sin publicar. pisos: 1 a 3. */
export function crearPlano(
  busId: string,
  datos: { nombre: string; pisos: number },
): Promise<PlanoResumen> {
  return http<PlanoResumen>(`/buses/${busId}/planos`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

/** GET /planos/:id con todas sus celdas. */
export function obtenerPlano(planoId: string): Promise<PlanoDetalle> {
  return http<PlanoDetalle>(`/planos/${planoId}`);
}

/** PUT /planos/:id/celdas. Reemplaza la grilla; solo si el plano no está publicado. */
export function guardarCeldas(planoId: string, celdas: CeldaPlano[]): Promise<PlanoDetalle> {
  return http<PlanoDetalle>(`/planos/${planoId}/celdas`, {
    method: 'PUT',
    body: JSON.stringify(celdasParaApi(celdas)),
  });
}

/** POST /planos/:id/publicar. Desde entonces el plano no se edita. Error 409 si ya estaba publicado. */
export function publicarPlano(planoId: string): Promise<PlanoResumen> {
  return http<PlanoResumen>(`/planos/${planoId}/publicar`, { method: 'POST' });
}