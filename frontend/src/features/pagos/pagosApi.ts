import type { DatosPago } from "../../../../shared/pagos";
export type { DatosPago };
const base = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
export class ErrorPagoApi extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${base}${ruta}`, {
    ...opciones,
    credentials: "include",
  });
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null);
    throw new ErrorPagoApi(
      respuesta.status,
      datos?.error ?? "No se pudo completar la operación.",
    );
  }
  return respuesta.status === 204 ? (undefined as T) : respuesta.json();
}
export function enlacePago(ruta: string, id: string) {
  return `${ruta}?reserva_id=${encodeURIComponent(id)}`;
}
export function enlaceArchivo(id: string, archivoId: string, ver = false) {
  return `${base}/reservas/${encodeURIComponent(id)}/archivos/${encodeURIComponent(archivoId)}${ver ? "?ver=1" : ""}`;
}
export function enlaceQr(id: string) {
  return `${base}/reservas/${encodeURIComponent(id)}/boleto/qr`;
}
export const pagosApi = {
  consultar: (id: string, signal?: AbortSignal) =>
    pedir<DatosPago>(`/reservas/${encodeURIComponent(id)}/pago`, { signal }),
  crearIntento: (id: string, cuentaId: string, clave: string) =>
    pedir<{ id: string }>(`/reservas/${encodeURIComponent(id)}/intentos-pago`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuentaId, clave }),
    }),
  enviar: (
    id: string,
    intentoId: string,
    archivo: File,
    mime: string,
    referencia: string,
  ) =>
    pedir<{ id: string }>(
      `/reservas/${encodeURIComponent(id)}/comprobantes?${new URLSearchParams({ intento_id: intentoId, referencia })}`,
      {
        method: "POST",
        headers: {
          "Content-Type": mime,
          "X-File-Name": encodeURIComponent(archivo.name),
        },
        body: archivo,
      },
    ),
};
