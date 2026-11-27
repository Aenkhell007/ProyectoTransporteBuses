import { solicitar, solicitarConCache } from '../../services/solicitudes';
import {avisarSesionVencida} from '../auth/sesionVencida';
import { ErrorCompra } from "./errores";
const base = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"
).replace(/\/+$/, "");
const CATALOGOS_ESTATICOS = [
  "/catalogos/ciudades",
  "/catalogos/destinos",
  "/catalogos/contacto",
  "/catalogos/filtros-viajes",
];
export async function apiCompra<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  const headers = new Headers(opciones.headers);
  if (
    opciones.body &&
    typeof opciones.body === "string" &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  const metodo = (opciones.method ?? "GET").toUpperCase();
  const esCatalogo =
    metodo === "GET" &&
    CATALOGOS_ESTATICOS.some((prefijo) => ruta.startsWith(prefijo));
  let respuesta: Response;
  try {
    const init: RequestInit = {
      ...opciones,
      credentials: "include",
      headers,
    };
    respuesta = esCatalogo
      ? await solicitarConCache(`${base}${ruta}`, init, 60_000)
      : await solicitar(`${base}${ruta}`, init);
  } catch {
    throw new ErrorCompra(0, {
      codigo: "SIN_CONEXION",
      mensaje: "No hay conexión con el servidor.",
    });
  }
  if (!respuesta.ok) {
    avisarSesionVencida(respuesta.status);
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new ErrorCompra(respuesta.status, {
      ...cuerpo,
      mensaje:
        cuerpo.mensaje ?? cuerpo.error ?? "No se pudo completar la solicitud.",
    });
  }
  if (respuesta.status === 204) return undefined as T;
  return respuesta.json() as Promise<T>;
}
