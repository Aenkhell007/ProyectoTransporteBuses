import type { CeldaPlano } from './plano';

export interface VersionPlano {
  id: string;
  numero_version: number;
  nombre: string;
  pisos: number;
  publicado: boolean;
  /** Viajes no cancelados que usan esta versión. Si es mayor que 0, la base no deja editarla. */
  viajes_en_uso: number;
  celdas: CeldaPlano[];
}