import type {
  AsignacionPlanificada,
  ErrorPlanificacion,
  PropuestaBorrador,
  ResultadoPlanificacion,
  SolicitudAsignacion,
  BusPlanificable,
  FrecuenciaPlanificable,
} from "./planificacion.types";

const MARCA_FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;

/** Valida un instante con zona explícita, sin depender de la zona del navegador. */
export function instanteEnMs(valor: string): number | null {
  const partes = MARCA_FECHA_ISO.exec(valor);
  if (!partes) return null;
  const [, anio, mes, dia, horas, minutos, segundos = "0"] = partes;
  const fechaUTC = new Date(Date.UTC(+anio, +mes - 1, +dia));
  if (
    fechaUTC.getUTCFullYear() !== +anio ||
    fechaUTC.getUTCMonth() !== +mes - 1 ||
    fechaUTC.getUTCDate() !== +dia ||
    +horas > 23 || +minutos > 59 || +segundos > 59
  ) return null;
  const instante = Date.parse(valor);
  return Number.isFinite(instante) ? instante : null;
}

/** Un borrador jamás constituye una salida vendible. */
export function validarDatosAsignacion(
  solicitud: SolicitudAsignacion,
  paraPublicar = false,
): ErrorPlanificacion[] {
  const { frecuencia, bus, inicioISO, finISO } = solicitud;
  const errores: ErrorPlanificacion[] = [];
  const inicio = instanteEnMs(inicioISO);
  const fin = instanteEnMs(finISO);
  if (inicio === null || fin === null || fin <= inicio) errores.push("HORARIO_INVALIDO");
  if (!frecuencia.activa) errores.push("FRECUENCIA_INACTIVA");
  if (!bus.activo) errores.push("BUS_INACTIVO");
  if (bus.cooperativaId !== frecuencia.cooperativaId) errores.push("COOPERATIVA_INCOMPATIBLE");
  if (!frecuencia.gruposHabilitados.includes(bus.grupoId)) errores.push("GRUPO_NO_HABILITADO");
  if (inicio !== null && bus.diasDescanso.includes(inicioISO.slice(0, 10))) errores.push("BUS_EN_DESCANSO");
  if (paraPublicar && !bus.planoDisponible) errores.push("SIN_PLANO");
  if (paraPublicar && !frecuencia.tarifaConfigurada) errores.push("SIN_TARIFA");
  return errores;
}

/** Busca colisiones por bus, incluidos los borradores, con margen operativo. */
export function detectarSolapamientos(
  solicitud: SolicitudAsignacion,
  asignaciones: readonly AsignacionPlanificada[],
  margenMinutos = 30,
): string[] {
  const inicio = instanteEnMs(solicitud.inicioISO);
  const fin = instanteEnMs(solicitud.finISO);
  if (inicio === null || fin === null || fin <= inicio) return [];
  const margenMs = Number.isFinite(margenMinutos) && margenMinutos >= 0
    ? margenMinutos * 60_000 : 0;
  return asignaciones.filter((existente) => {
    if (existente.busId !== solicitud.bus.id || existente.estado === "CANCELADO") return false;
    const desde = instanteEnMs(existente.inicioISO);
    const hasta = instanteEnMs(existente.finISO);
    return desde !== null && hasta !== null && hasta > desde &&
      inicio < hasta + margenMs && desde < fin + margenMs;
  }).map((existente) => existente.id);
}

/** Validación de UX: la API debe repetir las reglas con bloqueo transaccional. */
export function validarPlanificacion(
  solicitud: SolicitudAsignacion,
  asignaciones: readonly AsignacionPlanificada[],
  opciones: { paraPublicar?: boolean; margenMinutos?: number } = {},
): ResultadoPlanificacion {
  const errores = validarDatosAsignacion(solicitud, opciones.paraPublicar ?? false);
  const asignacionesEnConflicto = detectarSolapamientos(
    solicitud, asignaciones, opciones.margenMinutos ?? 30,
  );
  if (asignacionesEnConflicto.length) errores.push("SOLAPAMIENTO");
  return { valida: errores.length === 0, errores, asignacionesEnConflicto };
}

/** Propone un único borrador elegible; nunca publica ni reserva un bus. */
export function proponerBorrador(
  frecuencia: FrecuenciaPlanificable,
  buses: readonly BusPlanificable[],
  inicioISO: string,
  finISO: string,
  asignaciones: readonly AsignacionPlanificada[],
  margenMinutos = 30,
): PropuestaBorrador | null {
  for (const bus of buses) {
    const solicitud = { frecuencia, bus, inicioISO, finISO };
    if (validarPlanificacion(solicitud, asignaciones, { margenMinutos }).valida) {
      return { frecuenciaId: frecuencia.id, busId: bus.id, inicioISO, finISO, estado: "BORRADOR" };
    }
  }
  return null;
}
