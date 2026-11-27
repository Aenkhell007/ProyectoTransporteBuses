// Comparte GET idénticos solo mientras están en curso. Sin caché de resultados por defecto:
// asientos, precios, pagos y permisos se consultan otra vez al terminar.
const pendientes = new Map<string, Promise<Response>>();
type EntradaCache = {
  creada: number;
  expira: number;
  status: number;
  statusText: string;
  headers: [string, string][];
  cuerpo: ArrayBuffer;
};
const cacheLecturas = new Map<string, EntradaCache>();
const revalidaciones = new Set<string>();
const MAX_ENTRADAS_CACHE = 120;
let epocaCache = 0;

function clavePeticion(url: string, opciones: RequestInit) {
  const headers = Array.from(new Headers(opciones.headers).entries()).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([url, opciones.credentials ?? 'same-origin', headers, opciones.cache, opciones.mode, opciones.redirect]);
}

function guardarEnCache(clave: string, respuesta: Response, cuerpo: ArrayBuffer, ttlMs: number) {
  if (cacheLecturas.size >= MAX_ENTRADAS_CACHE) {
    const primera = cacheLecturas.keys().next().value;
    if (primera !== undefined) cacheLecturas.delete(primera);
  }
  const ahora = Date.now();
  cacheLecturas.set(clave, {
    creada: ahora,
    expira: ahora + ttlMs,
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: Array.from(respuesta.headers.entries()),
    cuerpo,
  });
}

export function invalidarCacheLecturas() {
  epocaCache += 1;
  cacheLecturas.clear();
  pendientes.clear();
  revalidaciones.clear();
}

/** Lee de forma síncrona una respuesta JSON vigente en la caché en memoria (evita parpadeos al cambiar de panel). */
export function leerCacheJson<T>(url: string, opciones: RequestInit = {}): T | null {
  const clave = clavePeticion(url, opciones);
  const guardada = cacheLecturas.get(clave);
  if (!guardada || guardada.expira <= Date.now()) {
    if (guardada) cacheLecturas.delete(clave);
    return null;
  }
  try {
    return JSON.parse(new TextDecoder().decode(guardada.cuerpo)) as T;
  } catch {
    return null;
  }
}

export async function solicitar(url: string, opciones: RequestInit = {}): Promise<Response> {
  const metodo = (opciones.method ?? 'GET').toUpperCase();
  if (metodo !== 'GET') {
    // Login, logout y escrituras invalidan las lecturas compartidas y cacheadas anteriores.
    invalidarCacheLecturas();
    return fetch(url, opciones);
  }
  // Cada señal pertenece a un consumidor; no puede cancelar peticiones ajenas.
  if (opciones.signal || opciones.body || opciones.cache === 'no-store') return fetch(url, opciones);
  const clave = clavePeticion(url, opciones);
  let peticion = pendientes.get(clave);
  if (!peticion) {
    peticion = fetch(url, opciones);
    pendientes.set(clave, peticion);
    const actual = peticion;
    void actual.finally(() => {
      if (pendientes.get(clave) === actual) pendientes.delete(clave);
    }).catch(() => {});
  }
  return (await peticion).clone();
}

/** Caché en memoria con estrategia Stale-While-Revalidate para vistas y catálogos.
 * Devuelve de inmediato si hay copia en memoria (incluso si el llamador pasa AbortSignal),
 * revalida silenciosamente en segundo plano cuando han pasado > 5 s,
 * y se invalida al instante ante cualquier escritura (POST/PUT/PATCH/DELETE), login o logout.
 */
export async function solicitarConCache(
  url: string,
  opciones: RequestInit = {},
  ttlMs = 60_000,
): Promise<Response> {
  const metodo = (opciones.method ?? 'GET').toUpperCase();
  if (metodo !== 'GET' || ttlMs <= 0 || opciones.body || opciones.cache === 'no-store') {
    return solicitar(url, opciones);
  }
  const clave = clavePeticion(url, opciones);
  const epoca = epocaCache;
  const ahora = Date.now();
  const guardada = cacheLecturas.get(clave);
  if (guardada && guardada.expira > ahora) {
    // Revalidación silenciosa en segundo plano (SWR) si la entrada tiene > 5 s
    if (ahora - guardada.creada > 5_000 && !revalidaciones.has(clave)) {
      revalidaciones.add(clave);
      const { signal: _ignorar, ...opcionesSinSenal } = opciones;
      void fetch(url, opcionesSinSenal)
        .then(async (r) => {
          if (epoca !== epocaCache) return;
          if (r.status === 401 || r.status === 403) {
            invalidarCacheLecturas();
            return;
          }
          if (r.ok && r.status === 200) {
            const buf = await r.arrayBuffer();
            if (epoca === epocaCache) guardarEnCache(clave, r, buf, ttlMs);
          }
        })
        .catch(() => {})
        .finally(() => revalidaciones.delete(clave));
    }
    return new Response(guardada.cuerpo.slice(0), {
      status: guardada.status,
      statusText: guardada.statusText,
      headers: guardada.headers,
    });
  }
  if (guardada) cacheLecturas.delete(clave);

  const respuesta = await solicitar(url, opciones);
  if (respuesta.ok && respuesta.status === 200 && epoca === epocaCache) {
    const copia = respuesta.clone();
    const cuerpo = await copia.arrayBuffer();
    if (epoca === epocaCache) guardarEnCache(clave, copia, cuerpo, ttlMs);
  }
  return respuesta;
}
