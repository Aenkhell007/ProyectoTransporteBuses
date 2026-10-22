import { esFechaValida } from "./fechas";

/** Valor de config_global.limite_pasajeros. Cuando exista la API vendrá del servidor. */
export const LIMITE_PASAJEROS = 10;

/** Valores del formulario tal como se escriben (texto). */
export interface FormularioBusqueda {
  origen: string;
  destino: string;
  fecha: string;
  cantidad: string;
}

/** Criterios validados que viajan en la URL de la vista 2. */
export interface CriteriosBusqueda {
  origen: string;
  destino: string;
  fecha: string;
  cantidad: number;
}

export type ErroresBusqueda = Partial<Record<keyof FormularioBusqueda, string>>;

export const FORMULARIO_VACIO: FormularioBusqueda = {
  origen: "",
  destino: "",
  fecha: "",
  cantidad: "1",
};

export function validarBusqueda(
  formulario: FormularioBusqueda,
  ciudadesValidas: ReadonlySet<string>,
  hoy: string,
): { criterios: CriteriosBusqueda | null; errores: ErroresBusqueda } {
  const errores: ErroresBusqueda = {};
  const { origen, destino, fecha } = formulario;

  if (!origen) errores.origen = "Selecciona la ciudad de origen.";
  else if (!ciudadesValidas.has(origen))
    errores.origen = "Elige una ciudad de la lista.";

  if (!destino) errores.destino = "Selecciona la ciudad de destino.";
  else if (!ciudadesValidas.has(destino))
    errores.destino = "Elige una ciudad de la lista.";
  else if (destino === origen)
    errores.destino = "El destino debe ser distinto del origen.";

  if (!fecha) errores.fecha = "Selecciona la fecha de viaje.";
  else if (!esFechaValida(fecha)) errores.fecha = "La fecha no es válida.";
  else if (fecha < hoy) errores.fecha = "La fecha no puede ser anterior a hoy.";

  const cantidad = Number(formulario.cantidad);
  if (
    !/^\d+$/.test(formulario.cantidad) ||
    cantidad < 1 ||
    cantidad > LIMITE_PASAJEROS
  ) {
    errores.cantidad = `Elige entre 1 y ${LIMITE_PASAJEROS} pasajeros.`;
  }

  if (Object.keys(errores).length > 0) return { criterios: null, errores };
  return { criterios: { origen, destino, fecha, cantidad }, errores };
}

/** Lee los criterios de la URL sin validarlos; la pantalla valida antes de consultar. */
export function formularioDesdeUrl(
  params: URLSearchParams,
): FormularioBusqueda {
  return {
    origen: params.get("origen") ?? "",
    destino: params.get("destino") ?? "",
    fecha: params.get("fecha") ?? "",
    cantidad: params.get("cantidad") ?? "1",
  };
}

export function criteriosAUrl(
  criterios: CriteriosBusqueda,
  extra: Record<string, string> = {},
): URLSearchParams {
  const params = new URLSearchParams({
    origen: criterios.origen,
    destino: criterios.destino,
    fecha: criterios.fecha,
    cantidad: String(criterios.cantidad),
  });
  for (const [clave, valor] of Object.entries(extra))
    if (valor) params.set(clave, valor);
  return params;
}
