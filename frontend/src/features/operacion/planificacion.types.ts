/** DTO provisionales de UI. No sustituyen el schema Prisma ni autorizan publicar. */
export type EstadoAsignacion = "BORRADOR" | "PUBLICADO" | "CANCELADO";

export interface FrecuenciaPlanificable {
  id: string;
  cooperativaId: string;
  activa: boolean;
  gruposHabilitados: readonly string[];
  tarifaConfigurada: boolean;
}

export interface BusPlanificable {
  id: string;
  cooperativaId: string;
  grupoId: string;
  activo: boolean;
  planoDisponible: boolean;
  diasDescanso: readonly string[]; // YYYY-MM-DD, calendario local de la cooperativa
}

export interface AsignacionPlanificada {
  id: string;
  busId: string;
  inicioISO: string; // ISO 8601 con zona horaria explícita
  finISO: string;
  estado: EstadoAsignacion;
}

export interface SolicitudAsignacion {
  frecuencia: FrecuenciaPlanificable;
  bus: BusPlanificable;
  inicioISO: string;
  finISO: string;
}

export type ErrorPlanificacion =
  | "HORARIO_INVALIDO"
  | "FRECUENCIA_INACTIVA"
  | "BUS_INACTIVO"
  | "COOPERATIVA_INCOMPATIBLE"
  | "GRUPO_NO_HABILITADO"
  | "BUS_EN_DESCANSO"
  | "SIN_PLANO"
  | "SIN_TARIFA"
  | "SOLAPAMIENTO";

export interface ResultadoPlanificacion {
  valida: boolean;
  errores: ErrorPlanificacion[];
  asignacionesEnConflicto: string[];
}

export interface PropuestaBorrador {
  frecuenciaId: string;
  busId: string;
  inicioISO: string;
  finISO: string;
  estado: "BORRADOR";
}
