import type { ParadaOrdenada, TarifaTramo } from "../../types/paradasTramos";

export function ordenarParadas(paradas: readonly ParadaOrdenada[]): ParadaOrdenada[] {
  return [...paradas].sort((a, b) => a.orden - b.orden);
}

export function obtenerTarifasVigentes(tarifas: readonly TarifaTramo[]): TarifaTramo[] {
  return tarifas.filter((tarifa) => tarifa.vigente);
}
