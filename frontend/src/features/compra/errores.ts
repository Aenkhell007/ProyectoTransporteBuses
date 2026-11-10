import type { ErrorApiCuerpo, ErrorCampo } from "../../types/compra/api";

/** Error de una petición del módulo de compra. status 0 = sin conexión. */
export class ErrorCompra extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly erroresCampo: ErrorCampo[];

  constructor(status: number, cuerpo: Partial<ErrorApiCuerpo> = {}) {
    super(cuerpo.mensaje ?? "Error de la solicitud");
    this.name = "ErrorCompra";
    this.status = status;
    this.codigo = cuerpo.codigo ?? "DESCONOCIDO";
    this.erroresCampo = cuerpo.errores_campo ?? [];
  }
}

/** Mensaje para mostrar al cliente según el código HTTP. Nunca expone detalles del servidor. */
export function mensajeDeError(error: unknown): string {
  if (!(error instanceof ErrorCompra))
    return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  switch (error.status) {
    case 0:
      return "No hay conexión con el servidor. Revisa tu red y vuelve a intentarlo; lo que escribiste se conserva.";
    case 401:
      return "Tu sesión no es válida. Inicia sesión para continuar.";
    case 403:
      return "No tienes permiso para realizar esta acción.";
    case 404:
      return "No encontramos la información solicitada.";
    case 409:
      return (
        error.message ||
        "La información cambió. Actualiza la disponibilidad y vuelve a intentarlo."
      );
    case 422:
      return error.message || "Revisa los datos marcados.";
    default:
      return "El servidor no pudo completar la solicitud. Inténtalo más tarde.";
  }
}

/** Errores 422 indexados por nombre de campo, para mostrarlos junto a cada control. */
export function erroresPorCampo(error: unknown): Record<string, string> {
  if (!(error instanceof ErrorCompra)) return {};
  return Object.fromEntries(
    error.erroresCampo.map((e) => [e.campo, e.mensaje]),
  );
}
