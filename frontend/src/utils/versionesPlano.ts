import type { VersionPlano } from '../types/versionesPlano';
import { renumerar } from './plano';

/**
 * La base (tg_plano_inmutable) rechaza insertar, mover o borrar celdas si algún viaje no
 * cancelado usa el plano. Publicar no cambia esa regla.
 */
export function planoEditable(version: VersionPlano): boolean {
  return version.viajes_en_uso === 0;
}

/**
 * Crea una versión nueva, sin viajes y sin publicar, copiando las celdas de otra. Es lo que
 * hay que hacer para cambiar un plano que ya está en uso.
 */
export function crearNuevaVersion(
  versiones: VersionPlano[],
  origen: VersionPlano,
  id: string,
): VersionPlano {
  const siguiente = Math.max(0, ...versiones.map((v) => v.numero_version)) + 1;
  return {
    id,
    numero_version: siguiente,
    nombre: `${origen.nombre} v${siguiente}`,
    pisos: origen.pisos,
    publicado: false,
    viajes_en_uso: 0,
    celdas: renumerar(origen.celdas.map((c) => ({ ...c }))),
  };
}