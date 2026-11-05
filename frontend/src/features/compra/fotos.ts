// Fotos de la flota de Gran Continental (frontend/public/images/compra), entregadas por el
// equipo para las vistas 1, 1.1 y 2. La versión de 800 px es para tarjetas; la completa,
// para portada y secciones anchas. Cuando exista bus_fotos, cada viaje trae su propia foto_url.

export const FOTOS_BUS = {
  dosPisos: {
    completa: "/images/compra/bus-dos-pisos.webp",
    tarjeta: "/images/compra/bus-dos-pisos-800.webp",
  },
  unPiso: {
    completa: "/images/compra/bus-un-piso.webp",
    tarjeta: "/images/compra/bus-un-piso-800.webp",
  },
} as const;

/** Foto de tarjeta de un bus de Gran Continental según sus pisos. */
export function fotoTarjetaBus(pisos: number): string {
  return pisos >= 2 ? FOTOS_BUS.dosPisos.tarjeta : FOTOS_BUS.unPiso.tarjeta;
}
