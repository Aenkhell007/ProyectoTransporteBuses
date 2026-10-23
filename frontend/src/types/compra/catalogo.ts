// GET /catalogos/ciudades (tabla ciudades, solo activas).
export interface Ciudad {
  id: string;
  nombre: string;
  provincia: string;
}

/** Destino destacado del inicio. El precio es referencial por pasajero, no una cotización. */
export interface DestinoDestacado {
  ciudad_id: string;
  nombre: string;
  tarifa_desde_centavos: number;
}

// POST /contacto -> enviar_contacto().
export interface SolicitudContacto {
  cooperativa_id: string | null;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  consentimiento_version: string;
}
