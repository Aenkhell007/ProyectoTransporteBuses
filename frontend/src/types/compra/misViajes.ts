// GET /mis-viajes: v_mis_viajes más reservas con pago en verificación (docs/api/compra-endpoints.md).

export type SeccionMisViajes = "proximos" | "historial";

/** Estado que ve el cliente; combina el de la compra, la reserva y la fecha de salida. */
export type EstadoMiViaje =
  | "CONFIRMADA"
  | "PAGO_EN_VERIFICACION"
  | "FINALIZADO"
  | "CANCELADA"
  | "REEMBOLSADA";

/** Estado del boleto (tabla boletos). */
export type EstadoDocumento =
  | "PENDIENTE_EMISION"
  | "LISTO"
  | "ERROR"
  | "ANULADO";

export interface MiViaje {
  /** COMPRA sale de v_mis_viajes; RESERVA es una reserva pendiente con comprobante en revisión. */
  tipo: "COMPRA" | "RESERVA";
  compra_id: string | null;
  reserva_id: string;
  codigo: string;
  estado: EstadoMiViaje;
  salida: string;
  llegada: string;
  origen: { ciudad: string; terminal: string };
  destino: { ciudad: string; terminal: string };
  grupo: string;
  pisos: number;
  pisos_asientos: number[];
  pasajeros: string[];
  asientos: string[];
  /** Total pagado de la compra (compras.total_pagado_centavos). */
  total_pagado_centavos: number | null;
  /** Monto que el cliente reportó en el comprobante; no es dinero confirmado. */
  monto_reportado_centavos: number | null;
  boleto_id: string | null;
  estado_documento: EstadoDocumento | null;
  foto_url: string | null;
}

export interface FiltrosMisViajes {
  seccion: SeccionMisViajes;
  estado: EstadoMiViaje | "";
  q: string;
  desde: string;
  hasta: string;
}
