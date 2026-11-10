import { http } from './http';
import type { GrupoBus } from '../types/bus';

export interface ConfiguracionCooperativa {
  lema: string | null;
  color_primario: string;
  color_secundario: string;
  color_texto: string;
  soporte_email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  direccion: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  sobre_nosotros: string | null;
  version: number;
}

export async function listarGruposBus(): Promise<GrupoBus[]> {
  const respuesta = await http<{ data: GrupoBus[] }>('/grupos-bus');
  return respuesta.data;
}

export function obtenerConfiguracionCooperativa() {
  return http<ConfiguracionCooperativa>('/configuracion/cooperativa');
}

export function guardarConfiguracionCooperativa(datos: Partial<ConfiguracionCooperativa>) {
  return http<ConfiguracionCooperativa>('/configuracion/cooperativa', {
    method: 'PUT',
    body: JSON.stringify(datos),
  });
}
