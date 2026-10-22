// Fechas del módulo de compra, siempre en la zona horaria de la cooperativa (config_global).
export const ZONA_HORARIA = 'America/Guayaquil';

const formatoDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit',
});
const formatoHora = new Intl.DateTimeFormat('es-EC', {
  timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Fecha de hoy en Ecuador como YYYY-MM-DD. */
export function hoyEnEcuador(ahora = new Date()): string {
  return formatoDia.format(ahora);
}

/** Día de calendario en Ecuador (YYYY-MM-DD) de un instante ISO con zona. */
export function diaEnEcuador(instanteIso: string): string {
  return formatoDia.format(new Date(instanteIso));
}

/** true si el texto es una fecha de calendario real (rechaza 2026-02-30). */
export function esFechaValida(fecha: string): boolean {
  const partes = FECHA_ISO.exec(fecha);
  if (!partes) return false;
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

function partesDeFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return { anio, mes, dia, diaSemana };
}

/** "2026-10-10" -> "Sáb, 10 de octubre de 2026". */
export function formatearFechaLarga(fecha: string): string {
  if (!esFechaValida(fecha)) return fecha;
  const { anio, mes, dia, diaSemana } = partesDeFecha(fecha);
  return `${DIAS[diaSemana]}, ${dia} de ${MESES[mes - 1]} de ${anio}`;
}

/** "2026-10-10" -> "Sáb, 10 oct 2026". */
export function formatearFechaCorta(fecha: string): string {
  if (!esFechaValida(fecha)) return fecha;
  const { anio, mes, dia, diaSemana } = partesDeFecha(fecha);
  return `${DIAS[diaSemana]}, ${dia} ${MESES_CORTOS[mes - 1]} ${anio}`;
}

/** "1992-03-15" -> "15/03/1992". */
export function formatearFechaNumerica(fecha: string): string {
  if (!esFechaValida(fecha)) return fecha;
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Hora local de Ecuador "06:00" de un instante ISO. */
export function formatearHora(instanteIso: string): string {
  return formatoHora.format(new Date(instanteIso));
}

/** Minutos completos entre dos instantes. */
export function minutosEntre(desdeIso: string, hastaIso: string): number {
  return Math.round((new Date(hastaIso).getTime() - new Date(desdeIso).getTime()) / 60000);
}

/** 510 -> "8h 30min"; 480 -> "8h". */
export function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto}min`;
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
}

/**
 * Edad cumplida en una fecha de referencia (ambas YYYY-MM-DD).
 * Solo informa al cliente: la elegibilidad del beneficio la decide cotizar() a la fecha de salida.
 */
export function edadEnFecha(nacimiento: string, referencia: string): number | null {
  if (!esFechaValida(nacimiento) || !esFechaValida(referencia)) return null;
  const n = partesDeFecha(nacimiento);
  const r = partesDeFecha(referencia);
  let edad = r.anio - n.anio;
  if (r.mes < n.mes || (r.mes === n.mes && r.dia < n.dia)) edad -= 1;
  return edad;
}
