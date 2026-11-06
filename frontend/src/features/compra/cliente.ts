import { ErrorCompra } from "./errores";
const base = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"
).replace(/\/+$/, "");
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
  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}${ruta}`, {
      ...opciones,
      credentials: "include",
      headers,
    });
  } catch {
    throw new ErrorCompra(0, {
      codigo: "SIN_CONEXION",
      mensaje: "No hay conexión con el servidor.",
    });
  }
  if (!respuesta.ok) {
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
