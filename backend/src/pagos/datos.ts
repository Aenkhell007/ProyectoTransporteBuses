import type { DatosPago } from "../../../shared/pagos";

// Una compra conserva la identidad del servicio vendido aunque después se edite el catálogo.
export function conservarDatosCompra(datos: DatosPago): DatosPago {
  const s = datos.compra?.viajeSnapshot;
  if (!s) return datos;
  const objeto = (v: unknown) =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const texto = (v: unknown, anterior: string) =>
    typeof v === "string" ? v : anterior;
  const bus = objeto(s.bus),
    coop = objeto(s.cooperativa),
    origen = objeto(s.terminalOrigen),
    destino = objeto(s.terminalDestino),
    v = datos.viaje;
  return {
    ...datos,
    viaje: {
      ...v,
      cooperativa: texto(coop.nombre, v.cooperativa),
      origen: texto(origen.ciudad, v.origen),
      destino: texto(destino.ciudad, v.destino),
      terminalOrigen: texto(origen.terminal, v.terminalOrigen),
      terminalDestino: texto(destino.terminal, v.terminalDestino),
      unidad: texto(bus.unidad, v.unidad),
      placa: texto(bus.placa, v.placa),
      chasis: texto(bus.chasis, v.chasis),
      carroceria: texto(bus.carroceria, v.carroceria),
      servicio: texto(bus.grupo, v.servicio),
    },
  };
}
