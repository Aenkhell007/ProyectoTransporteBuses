// GET /viajes (buscar_viajes) y GET /viajes/:id. Ver docs/api/compra-endpoints.md.

/** Códigos de clases_asiento. Tanto VIP como EJECUTIVO se muestran como VIP. */
export type ClaseAsientoCodigo = "NORMAL" | "VIP" | "EJECUTIVO";
export type TipoViaje = "DIRECTO" | "CON_PARADAS";

export type ServicioBus =
  | "AIRE"
  | "ASIENTO_CAMA"
  | "ASIENTO_RECLINABLE"
  | "WIFI"
  | "BANO"
  | "PANTALLAS"
  | "ENCHUFES"
  | "PORTAEQUIPAJE"
  | "COMIDA";

export interface BusViaje {
  id: string;
  unidad: string;
  placa: string;
  chasis: string;
  carroceria: string;
  /** Grupo comercial del bus (grupos_bus.nombre). */
  grupo: string;
  plano_id: string;
  pisos: number;
  foto_url: string | null;
  servicios: ServicioBus[];
}

export interface ParadaViaje {
  orden: number;
  ciudad: string;
  terminal: string;
}

export interface ViajeResultado {
  viaje_id: string;
  cooperativa: string;
  salida: string;
  llegada: string;
  origen_orden: number;
  destino_orden: number;
  tipo_viaje: TipoViaje;
  clases: ClaseAsientoCodigo[];
  origen: ParadaViaje;
  destino: ParadaViaje;
  bus: BusViaje;
  /** Asientos libres en el tramo, no número de resultados. */
  plazas_disponibles: number;
  disponibles_normal?: number;
  disponibles_vip?: number;
  /** Precio mínimo por pasajero en el tramo. No es una cotización. */
  tarifa_desde_centavos: number;
}

export interface DetalleViaje {
  viaje_id: string;
  tipo_viaje: TipoViaje;
  salida: string;
  llegada: string;
  bus: BusViaje;
  /** Todas las paradas de la ruta con su hora estimada de paso. */
  paradas: (ParadaViaje & { hora: string })[];
  plazas_disponibles: number;
  tarifa_desde_centavos: number;
  tarifas_clase?: Partial<Record<ClaseAsientoCodigo, number>>;
}

export interface Cooperativa {
  id: string;
  nombre: string;
}
