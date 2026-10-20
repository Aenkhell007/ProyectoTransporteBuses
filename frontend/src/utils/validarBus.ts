import type { Bus, BusFormData } from '../types/bus';

export type ErroresBus = Partial<Record<keyof BusFormData, string>>;

const FORMATO_PLACA = /^[A-Z]{3}-\d{3,4}$/;
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida un bus según docs/api/flota-endpoints.md. La unicidad se comprueba aquí
 * solo contra la lista local; el backend (y la base) siguen siendo la fuente de verdad.
 */
export function validarBus(datos: BusFormData, existentes: Bus[]): ErroresBus {
  const errores: ErroresBus = {};
  const unidad = datos.unidad.trim();
  const placa = datos.placa.trim().toUpperCase();

  if (!unidad) errores.unidad = 'La unidad es obligatoria.';
  else if (existentes.some((b) => b.unidad === unidad)) errores.unidad = 'Ya existe un bus con esa unidad.';

  if (!placa) errores.placa = 'La placa es obligatoria.';
  else if (!FORMATO_PLACA.test(placa)) errores.placa = 'Formato esperado: ABC-1234.';
  else if (existentes.some((b) => b.placa === placa)) errores.placa = 'Ya existe un bus con esa placa.';

  if (!datos.chasis.trim()) errores.chasis = 'El chasis es obligatorio.';
  if (!datos.carroceria.trim()) errores.carroceria = 'La carrocería es obligatoria.';
  if (!datos.grupo_id) errores.grupo_id = 'Elige un grupo.';
  if (datos.correo_contacto.trim() && !FORMATO_CORREO.test(datos.correo_contacto.trim())) {
    errores.correo_contacto = 'Correo inválido.';
  }
  return errores;
}