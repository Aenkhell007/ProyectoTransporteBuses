export class ErrorConfiguracion extends Error {
  constructor(public status: number, mensaje: string) { super(mensaje); }
}
export function exigirPago(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new ErrorConfiguracion(422, mensaje);
}
export const FORMATOS: Record<string, string> = { JPG: 'image/jpeg', PNG: 'image/png', PDF: 'application/pdf' };
export function textoPago(valor: unknown, nombre: string, maximo: number, requerido = true) {
  exigirPago(typeof valor === 'string', `${nombre}: ingresa un texto válido.`);
  const texto = valor.trim();
  exigirPago((!requerido || texto.length > 0) && texto.length <= maximo && !/[\u0000-\u001f<>]/.test(texto), `${nombre}: revisa el contenido y la longitud.`);
  return texto;
}
export function validarPolitica(datos: any, limites: { formatos: string[]; maximoMB: number }) {
  exigirPago(Number.isSafeInteger(datos?.version) && datos.version >= 0, 'Actualiza la configuración antes de guardar.');
  exigirPago(Array.isArray(datos.formatos) && datos.formatos.length > 0 && datos.formatos.length <= 3 && new Set(datos.formatos).size === datos.formatos.length && datos.formatos.every((f: unknown) => typeof f === 'string' && limites.formatos.includes(f)), 'Selecciona formatos autorizados por la configuración global.');
  exigirPago(Number.isInteger(datos.maximoMB) && datos.maximoMB >= 1 && datos.maximoMB <= limites.maximoMB, `El tamaño máximo permitido es ${limites.maximoMB} MB.`);
  exigirPago(typeof datos.referenciaObligatoria === 'boolean', 'Indica si la referencia es obligatoria.');
  exigirPago(Array.isArray(datos.cuentas) && datos.cuentas.length <= 100 && Array.isArray(datos.metodos), 'Configuración incompleta.');
  exigirPago(datos.cuentas.every((c: unknown) => c && typeof c === 'object') && datos.metodos.every((m: unknown) => m && typeof m === 'object'), 'Configuración incompleta.');
  exigirPago(datos.cuentas.filter((c: any) => c.predeterminada).length <= 1, 'Solo puede haber una cuenta predeterminada.');
  exigirPago(datos.cuentas.every((c: any) => typeof c?.activa === 'boolean' && typeof c.predeterminada === 'boolean' && (!c.predeterminada || c.activa)), 'La cuenta predeterminada debe estar activa.');
}
