import { solicitar } from '../../services/solicitudes';
import {avisarSesionVencida} from '../auth/sesionVencida';
import type { DatosPago } from "../../../../shared/pagos";
export type { DatosPago };
const base = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
export function enlaceQrCuenta(reserva: string, cuenta: string) {
  return `${base}/reservas/${encodeURIComponent(reserva)}/cuentas/${encodeURIComponent(cuenta)}/qr`;
}
export class ErrorPagoApi extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await solicitar(`${base}${ruta}`, {
    ...opciones,
    credentials: "include",
  });
  if (!respuesta.ok) {
    avisarSesionVencida(respuesta.status);
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
export function enlaceLogoCooperativa(id: string) {
  return `${base}/reservas/${encodeURIComponent(id)}/cooperativa/logo`;
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
  prepararPayphone: (id: string, modo: "card" | "payphone" = "card") =>
    pedir<{
      intentoId: string;
      clientTransactionId: string;
      paymentId: string;
      urlPago: string;
      payWithCard: string;
      payWithPayPhone: string;
    }>(`/reservas/${encodeURIComponent(id)}/payphone/preparar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modo }),
    }),
  confirmarPayphone: (id: number, clientTransactionId: string) =>
    pedir<{
      estado: "APROBADO" | "CANCELADO" | "PENDIENTE";
      reservaId: string;
      compraId?: string | null;
      autorizacion?: string | null;
      mensaje?: string;
    }>("/pagos/payphone/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, clientTransactionId }),
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
  obtenerGoogleWallet: (id: string) =>
    pedir<
      | { disponible: true; modo: "OFICIAL"; saveUrl: string; classId: string; objectIds: string[] }
      | {
          disponible: false;
          modo: "DEMO_SIN_CREDENCIALES";
          motivo: string;
          guia: string;
          vistaPrevia: { classId: string; objetos: number; barcode: string; pasajeros: string[] };
        }
    >(`/reservas/${encodeURIComponent(id)}/google-wallet`, { method: "POST" }),
};
