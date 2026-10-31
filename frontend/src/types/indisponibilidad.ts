export interface Indisponibilidad {
  id: string;
  bus_id: string;
  /** Fecha y hora ISO con desfase, por ejemplo 2026-11-05T08:00:00-05:00. */
  desde: string;
  hasta: string;
  motivo: string;
}

/** Valores del formulario: fechas de un input datetime-local (AAAA-MM-DDTHH:mm). */
export interface IndisponibilidadForm {
  desde: string;
  hasta: string;
  motivo: string;
}