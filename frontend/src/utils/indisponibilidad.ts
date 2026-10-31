import type { Bus } from '../types/bus';
import type { Indisponibilidad, IndisponibilidadForm } from '../types/indisponibilidad';

export type ErroresIndisponibilidad = Partial<Record<keyof IndisponibilidadForm, string>>;

/** Convierte un valor datetime-local a ISO con el desfase de Ecuador (sin horario de verano). */
export function aIso(valor: string): string {
  return `${valor.slice(0, 16)}:00-05:00`;
}

/** Validaciones del contrato: motivo obligatorio y hasta posterior a desde. */
export function validarIndisponibilidad(datos: IndisponibilidadForm): ErroresIndisponibilidad {
  const errores: ErroresIndisponibilidad = {};
  if (!datos.desde) errores.desde = 'La fecha de inicio es obligatoria.';
  if (!datos.hasta) errores.hasta = 'La fecha final es obligatoria.';
  if (datos.desde && datos.hasta && Date.parse(aIso(datos.hasta)) <= Date.parse(aIso(datos.desde))) {
    errores.hasta = 'La fecha final debe ser posterior a la inicial.';
  }
  if (!datos.motivo.trim()) errores.motivo = 'El motivo es obligatorio.';
  return errores;
}

/**
 * Imita GET /buses/disponibles solo con las indisponibilidades: un bus activo queda disponible
 * si ningún período suyo se cruza con [desde, hasta). El endpoint real también excluye los
 * buses con viajes que se solapan.
 */
export function busesDisponibles(
  buses: Bus[],
  indisponibilidades: Indisponibilidad[],
  desde: string,
  hasta: string,
): Bus[] {
  const inicio = Date.parse(desde);
  const fin = Date.parse(hasta);
  return buses.filter(
    (bus) =>
      bus.activo &&
      !indisponibilidades.some(
        (i) => i.bus_id === bus.id && Date.parse(i.desde) < fin && Date.parse(i.hasta) > inicio,
      ),
  );
}