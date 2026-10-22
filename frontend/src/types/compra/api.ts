// Formato común de respuestas del módulo de compra (docs/api/compra-endpoints.md).

export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

export interface ErrorApiCuerpo {
  codigo: string;
  mensaje: string;
  errores_campo: ErrorCampo[];
  request_id: string | null;
}

export interface ListaPaginada<T> {
  data: T[];
  next_cursor: string | null;
}
