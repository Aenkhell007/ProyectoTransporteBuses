import type { ParadaOrdenada, TarifaTramo } from "../../types/paradasTramos";

export function ordenarParadas(paradas: readonly ParadaOrdenada[]): ParadaOrdenada[] {
  return [...paradas].sort((a, b) => a.orden - b.orden);
}

export function obtenerTarifasVigentes(tarifas: readonly TarifaTramo[]): TarifaTramo[] {
  return tarifas.filter((tarifa) => tarifa.vigente);
}

export function obtenerTarifasValidas(
  paradas: readonly ParadaOrdenada[],
  tarifas: readonly TarifaTramo[]
): TarifaTramo[] {
  const paradasPorId = new Map(paradas.map((p) => [p.id, p]));

  return obtenerTarifasVigentes(tarifas).filter((tarifa) => {
    const origen = paradasPorId.get(tarifa.paradaOrigenId);
    const destino = paradasPorId.get(tarifa.paradaDestinoId);

    if (!origen || !destino) return false;

    return (
      Number.isFinite(tarifa.precioBase) &&
      tarifa.precioBase > 0 &&
      origen.frecuenciaId === tarifa.frecuenciaId &&
      destino.frecuenciaId === tarifa.frecuenciaId &&
      origen.ciudad === tarifa.ciudadOrigen &&
      destino.ciudad === tarifa.ciudadDestino &&
      origen.orden === tarifa.ordenOrigen &&
      destino.orden === tarifa.ordenDestino &&
      origen.orden < destino.orden &&
      origen.habilitadaEmbarque &&
      destino.habilitadaDesembarque
    );
  });
}
