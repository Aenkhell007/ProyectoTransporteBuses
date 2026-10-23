// La URL de la API sale de VITE_API_URL. En el frontend nunca van credenciales de
// base de datos: solo la dirección de la API.
const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '/api').replace(
  /\/+$/,
  '',
);
export class ApiError extends Error {
  status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Mensajes por código, según la sección "Errores comunes" del contrato.
const MENSAJES: Record<number, string> = {
  400: 'Los datos enviados no son válidos.',
  401: 'Debes iniciar sesión.',
  403: 'No tienes permiso para esta operación.',
  404: 'No se encontró el recurso.',
  409: 'Hay un conflicto con datos existentes (por ejemplo, un valor duplicado).',
};

export async function http<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const headers = new Headers(opciones.headers);
  if (opciones.body && !(opciones.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const respuesta = await fetch(`${BASE_URL}/${ruta.replace(/^\/+/, '')}`, {
    credentials: 'include', // PENDIENTE: confirmar con backend si la sesión va en cookie
    ...opciones,
    headers,
  });

  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      MENSAJES[respuesta.status] ?? 'Ocurrió un error inesperado.',
    );
  }
  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

export interface Lista<T> {
  data: T[];
}