
import type {
  FrecuenciaANT,
  EstadoFrecuencia,
  TipoViajeFrecuencia,
} from "../../types/frecuencia.types";

export function filtrarFrecuencias(
  frecuencias: FrecuenciaANT[],
  busqueda: string,
  estado: "TODAS" | EstadoFrecuencia,
  tipo: "TODOS" | TipoViajeFrecuencia
): FrecuenciaANT[] {
  const termino = busqueda.trim().toLowerCase();

  return frecuencias.filter((frecuencia) => {
    const texto =
      `${frecuencia.origen} ${frecuencia.destino} ${frecuencia.numeroResolucion}`.toLowerCase();

    return (
      texto.includes(termino) &&
      (estado === "TODAS" || frecuencia.estado === estado) &&
      (tipo === "TODOS" || frecuencia.tipo === tipo)
    );
  });
}
