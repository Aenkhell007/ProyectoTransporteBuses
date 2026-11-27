import { compartirLectura, descartarLecturasPendientes } from './lecturasPendientes';
import { solicitar as solicitarRespuesta, solicitarConCache, leerCacheJson, invalidarCacheLecturas } from './solicitudes';
import {avisarSesionVencida} from '../features/auth/sesionVencida';
// La URL de la API sale de VITE_API_URL. En el frontend nunca van credenciales de
// base de datos: solo la dirección de la API.
const BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '/api').replace(
  /\/+$/,
  '',
);
const RUTAS_CACHEABLES = [
  '/catalogos/',
];
function ttlLectura(ruta: string): number {
  return RUTAS_CACHEABLES.some((prefijo) => ruta.startsWith(prefijo)) ? 60_000 : 0;
}
export function leerHttpCache<T>(ruta: string): T | null {
  if (ttlLectura(ruta) <= 0) return null;
  const url = `${BASE_URL}/${ruta.replace(/^\/+/, '')}`;
  return leerCacheJson<T>(url, { credentials: 'include', headers: new Headers() });
}
/** Precarga silenciosa en memoria de rutas GET compartidas sin interrumpir la interfaz. */
export function precargarHttp(rutas: string[]) {
  for (const ruta of rutas) {
    if (!leerHttpCache(ruta)) {
      void http(ruta).catch(() => {});
    }
  }
}
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
  429: 'Demasiadas solicitudes. Espera un momento e inténtalo nuevamente.',
};

async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const headers = new Headers(opciones.headers);
  if (opciones.body && !(opciones.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const metodo = (opciones.method ?? 'GET').toUpperCase();
  const ttl = metodo === 'GET' ? ttlLectura(ruta) : 0;
  const url = `${BASE_URL}/${ruta.replace(/^\/+/, '')}`;
  const init: RequestInit = {
    credentials: 'include',
    ...opciones,
    headers,
  };
  const respuesta = ttl > 0
    ? await solicitarConCache(url, init, ttl)
    : await solicitarRespuesta(url, init);

  if (!respuesta.ok) {
    avisarSesionVencida(respuesta.status);
    const detalle = ['/reservas/','/pagos/','/abordaje/','/mikel/','/oficina/','/admin/','/configuracion/pagos','/identidad/','/operacion/'].some(prefijo=>ruta.startsWith(prefijo)) && [400, 403, 404, 409, 413, 422, 429, 503].includes(respuesta.status)
      ? await respuesta.json().catch(() => null) as { error?: unknown } | null : null;
    throw new ApiError(
      respuesta.status,
      typeof detalle?.error === 'string' && detalle.error.length <= 300
        ? detalle.error : MENSAJES[respuesta.status] ?? 'Ocurrió un error inesperado.',
    );
  }
  if (respuesta.status === 204) return undefined as T;
  return (await respuesta.json()) as T;
}

export function lecturaCompartida<T>(ruta: string): Promise<T> {
  const clave = ruta.replace(/^\/+/, '');
  return compartirLectura(clave, () => solicitar<T>(ruta));
}

export async function http<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const metodo = (opciones.method ?? 'GET').toUpperCase();
  if (metodo === 'GET' || metodo === 'HEAD') return solicitar<T>(ruta, opciones);

  invalidarLecturasHttp();
  try {
    return await solicitar<T>(ruta, opciones);
  } finally {
    invalidarLecturasHttp();
  }
}
export function invalidarLecturasHttp() {
  descartarLecturasPendientes();
  invalidarCacheLecturas();
}

export interface Lista<T> {
  data: T[];
}
