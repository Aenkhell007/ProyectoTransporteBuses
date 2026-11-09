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

// Recursos comerciales del inicio. Los archivos permanecen organizados por uso.
export const FOTOS_INICIO = {
  portada: "/images/home/hero-gran-continental.png",
  servicioEjecutivo: "/images/home/servicio-premium.png",
  servicioConfort: "/images/home/servicio-confort.png",
  sobreNosotros: "/images/home/sobre-nosotros.png",
} as const;

export const FOTOS_DESTINOS: Readonly<Record<string, string>> = {
  quito: "/images/destinos/destino-quito.png",
  guayaquil: "/images/destinos/destino-guayaquil.png",
  cuenca: "/images/destinos/destino-cuenca.png",
  ambato: "/images/destinos/destino-ambato.png",
  loja: "/images/destinos/destino-loja.png",
};

/** Los IDs dependen de la base; la ilustración se asocia al nombre de la ciudad. */
export function fotoDestino(nombre: string): string | undefined {
  const clave = nombre.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return Object.prototype.hasOwnProperty.call(FOTOS_DESTINOS, clave)
    ? FOTOS_DESTINOS[clave]
    : undefined;
}
