import { exigir } from './validacion';

type Asignacion = {
  frecuenciaId: string;
  busId: string;
  conductor: string | null;
  dia: string;
  salida: string;
  liberacion: string;
};

export function detectarConflictosEnLote(asignaciones: readonly Asignacion[]) {
  const frecuenciasPorDia = new Set<string>();
  for (const [indice, actual] of asignaciones.entries()) {
    const clave = `${actual.frecuenciaId}:${actual.dia}`;
    exigir(!frecuenciasPorDia.has(clave), 'No dupliques la misma frecuencia el mismo día.');
    frecuenciasPorDia.add(clave);

    for (const previa of asignaciones.slice(0, indice)) {
      const solapan = Date.parse(previa.salida) < Date.parse(actual.liberacion)
        && Date.parse(actual.salida) < Date.parse(previa.liberacion);
      if (!solapan) continue;
      exigir(actual.busId !== previa.busId, 'El bus tiene dos asignaciones superpuestas en el lote.');
      exigir(!actual.conductor || actual.conductor !== previa.conductor,
        'El conductor tiene dos asignaciones superpuestas en el lote.');
    }
  }
}
