import type { ClaseAsientoCodigo, TipoViaje } from "../../types/compra/viajes";

export type FranjaHoraria = "MADRUGADA" | "MANANA" | "TARDE" | "NOCHE";
export type OrdenViajes = "salida" | "precio";

export interface FiltrosViajes {
  cooperativa: string;
  clase: ClaseAsientoCodigo | "";
  chasis: string;
  carroceria: string;
  tipo_viaje: TipoViaje | "";
  hora: FranjaHoraria | "";
  precio_min: number | null;
  precio_max: number | null;
  orden: OrdenViajes;
}

export const FILTROS_VACIOS: FiltrosViajes = {
  cooperativa: "",
  clase: "",
  chasis: "",
  carroceria: "",
  tipo_viaje: "",
  hora: "",
  precio_min: null,
  precio_max: null,
  orden: "salida",
};

export const CLASES: { valor: ClaseAsientoCodigo; nombre: string }[] = [
  { valor: "NORMAL", nombre: "Normal" },
  { valor: "EJECUTIVO", nombre: "VIP (Ejecutivo)" },
];

export const TIPOS_VIAJE: { valor: TipoViaje; nombre: string }[] = [
  { valor: "DIRECTO", nombre: "Directo" },
  { valor: "CON_PARADAS", nombre: "Con paradas" },
];

/** Franjas de hora local de salida: [desde, hasta) en horas. */
export const FRANJAS: {
  valor: FranjaHoraria;
  nombre: string;
  desde: number;
  hasta: number;
}[] = [
  {
    valor: "MADRUGADA",
    nombre: "Madrugada (00:00 - 05:59)",
    desde: 0,
    hasta: 6,
  },
  { valor: "MANANA", nombre: "Mañana (06:00 - 11:59)", desde: 6, hasta: 12 },
  { valor: "TARDE", nombre: "Tarde (12:00 - 17:59)", desde: 12, hasta: 18 },
  { valor: "NOCHE", nombre: "Noche (18:00 - 23:59)", desde: 18, hasta: 24 },
];

export const ORDENES: { valor: OrdenViajes; nombre: string }[] = [
  { valor: "salida", nombre: "Hora de salida (más temprano)" },
  { valor: "precio", nombre: "Precio (más bajo)" },
];

/** Límites del control de precio en centavos; solo acotan el control, no son tarifas. */
export const PRECIO_CONTROL = { min: 0, max: 10000, paso: 100 };

const CLAVES = [
  "cooperativa",
  "clase",
  "chasis",
  "carroceria",
  "tipo_viaje",
  "hora",
  "precio_min",
  "precio_max",
  "orden",
] as const;

function centavos(texto: string | null): number | null {
  if (texto === null || !/^\d{1,9}$/.test(texto)) return null;
  return Number(texto);
}

/** Lee los filtros de la URL e ignora los valores que no están permitidos. */
export function filtrosDesdeUrl(params: URLSearchParams): FiltrosViajes {
  const clase = params.get("clase");
  const tipo = params.get("tipo_viaje");
  const hora = params.get("hora");
  const orden = params.get("orden");
  return {
    cooperativa: params.get("cooperativa") ?? "",
    clase: CLASES.some((c) => c.valor === clase)
      ? (clase as ClaseAsientoCodigo)
      : "",
    chasis: (params.get("chasis") ?? "").slice(0, 60),
    carroceria: (params.get("carroceria") ?? "").slice(0, 60),
    tipo_viaje: TIPOS_VIAJE.some((t) => t.valor === tipo)
      ? (tipo as TipoViaje)
      : "",
    hora: FRANJAS.some((f) => f.valor === hora) ? (hora as FranjaHoraria) : "",
    precio_min: centavos(params.get("precio_min")),
    precio_max: centavos(params.get("precio_max")),
    orden: ORDENES.some((o) => o.valor === orden)
      ? (orden as OrdenViajes)
      : "salida",
  };
}

/** Escribe los filtros en la URL conservando los criterios de búsqueda. */
export function aplicarFiltrosEnUrl(
  params: URLSearchParams,
  filtros: FiltrosViajes,
): URLSearchParams {
  const siguiente = new URLSearchParams(params);
  for (const clave of CLAVES) siguiente.delete(clave);
  for (const clave of CLAVES) {
    const valor = filtros[clave];
    if (valor === null || valor === "") continue;
    if (clave === "orden" && valor === "salida") continue;
    siguiente.set(clave, String(valor));
  }
  return siguiente;
}

export function validarFiltros(filtros: FiltrosViajes): string | null {
  if (
    filtros.precio_min !== null &&
    filtros.precio_max !== null &&
    filtros.precio_min > filtros.precio_max
  ) {
    return "El precio mínimo no puede ser mayor que el máximo.";
  }
  return null;
}

export function hayFiltrosActivos(filtros: FiltrosViajes): boolean {
  return CLAVES.some((clave) =>
    clave === "orden"
      ? filtros.orden !== "salida"
      : filtros[clave] !== FILTROS_VACIOS[clave],
  );
}
