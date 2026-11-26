import { ErrorPago } from "./validacion";
import { origenPermitido } from "../origen";

export interface MontosPayphone {
  amount: number;
  amountWithTax: number;
  amountWithoutTax: number;
  tax: number;
  service: number;
  tip: number;
}

export interface EntradaPrepararPayphone {
  clientTransactionId: string;
  montos: MontosPayphone;
  referencia: string;
  reservaId?: string;
  origenSolicitud?: string;
  email?: string | null;
  documento?: string | null;
  telefono?: string | null;
}

export interface ResultadoPrepararPayphone {
  paymentId: string;
  payWithCard: string;
  payWithPayPhone: string;
}

export interface ResultadoConfirmarPayphone {
  estado: "APROBADO" | "CANCELADO" | "PENDIENTE";
  statusCode: number;
  transactionStatus: string;
  transactionId: string;
  clientTransactionId: string;
  amount: number;
  authorizationCode: string | null;
  reference: string | null;
  message: string | null;
}

export function payphoneConfigurado(): boolean {
  return Boolean(process.env.PAYPHONE_TOKEN?.trim());
}

export function obtenerConfigPayphone() {
  const token = process.env.PAYPHONE_TOKEN?.trim() ?? "";
  const storeId = process.env.PAYPHONE_STORE_ID?.trim() || undefined;
  const baseFront = (process.env.FRONTEND_URL ?? "http://127.0.0.1:5173").replace(/\/$/, "");
  const responseUrl =
    process.env.PAYPHONE_RESPONSE_URL?.trim() || `${baseFront}/pago/payphone/respuesta`;
  const cancellationUrl =
    process.env.PAYPHONE_CANCELLATION_URL?.trim() || `${baseFront}/pago`;
  const apiBase = (
    process.env.PAYPHONE_API_BASE?.trim() || "https://pay.payphonetodoesposible.com/api"
  ).replace(/\/$/, "");
  return { token, storeId, responseUrl, cancellationUrl, apiBase };
}

export function generarClientTransactionId(intentoId: string): string {
  const compacto = intentoId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (compacto.length < 8) {
    throw new ErrorPago(422, "Identificador de intento inválido para PayPhone.");
  }
  return ("PP" + compacto).slice(0, 15);
}

export function construirMontosPayphone(
  totalCentavos: number,
  ivaCentavos: number,
  servicioCentavos = 0,
): MontosPayphone {
  if (!Number.isInteger(totalCentavos) || totalCentavos <= 0) {
    throw new ErrorPago(422, "El monto total para PayPhone debe ser mayor a cero.");
  }
  if (!Number.isInteger(ivaCentavos) || ivaCentavos < 0 || ivaCentavos > totalCentavos) {
    throw new ErrorPago(422, "El valor de IVA para PayPhone es inválido.");
  }
  const servicio = Number.isInteger(servicioCentavos) && servicioCentavos > 0 ? servicioCentavos : 0;
  let amountWithTax = 0;
  let amountWithoutTax = totalCentavos;
  const tax = ivaCentavos;

  if (tax > 0) {
    if (servicio > 0 && servicio + tax <= totalCentavos) {
      amountWithTax = servicio;
      amountWithoutTax = totalCentavos - servicio - tax;
    } else {
      amountWithTax = totalCentavos - tax;
      amountWithoutTax = 0;
    }
  }

  return {
    amount: totalCentavos,
    amountWithTax,
    amountWithoutTax,
    tax,
    service: 0,
    tip: 0,
  };
}

function esUrlHttpsSegura(valor: unknown): valor is string {
  if (typeof valor !== "string" || !valor.trim()) return false;
  try {
    return new URL(valor).protocol === "https:";
  } catch {
    return false;
  }
}

function limpiarMensajeProveedor(datos: unknown, status: number): string {
  if (datos && typeof datos === "object") {
    const obj = datos as Record<string, unknown>;
    const msg =
      (typeof obj.message === "string" && obj.message) ||
      (Array.isArray(obj.errors) &&
        typeof (obj.errors[0] as { errorDescriptions?: unknown[] } | undefined)?.errorDescriptions?.[0] ===
          "string" &&
        String((obj.errors[0] as { errorDescriptions: unknown[] }).errorDescriptions[0])) ||
      "";
    if (msg.trim()) return msg.trim().slice(0, 180);
  }
  return `HTTP ${status}`;
}

function esUrlLocal(valor: string): boolean {
  try {
    const u = new URL(valor);
    return u.protocol === "http:" && ["127.0.0.1", "localhost"].includes(u.hostname);
  } catch {
    return false;
  }
}

export async function prepararPagoPayphone(
  entrada: EntradaPrepararPayphone,
  fetcher: typeof fetch = fetch,
): Promise<ResultadoPrepararPayphone> {
  const { token, storeId, responseUrl, cancellationUrl, apiBase } = obtenerConfigPayphone();
  if (!token) {
    throw new ErrorPago(
      503,
      "PayPhone no está configurado en el servidor (falta PAYPHONE_TOKEN en backend/.env).",
    );
  }

  let responseUrlEfectiva = responseUrl;
  let cancellationUrlEfectiva = cancellationUrl;
  if (entrada.origenSolicitud && origenPermitido(entrada.origenSolicitud)) {
    const origen = entrada.origenSolicitud.trim().replace(/\/+$/, "");
    if (origen.startsWith("https://")) {
      if (!process.env.PAYPHONE_RESPONSE_URL?.trim() || esUrlLocal(responseUrl)) {
        responseUrlEfectiva = `${origen}/pago/payphone/respuesta`;
      }
      if (!process.env.PAYPHONE_CANCELLATION_URL?.trim() || esUrlLocal(cancellationUrl)) {
        cancellationUrlEfectiva = `${origen}/pago`;
      }
    }
  }

  let urlCancelacion = cancellationUrlEfectiva;
  if (entrada.reservaId) {
    try {
      const u = new URL(cancellationUrlEfectiva);
      u.searchParams.set("reserva_id", entrada.reservaId);
      u.searchParams.set("payphone", "cancelado");
      u.searchParams.set("clientTransactionId", entrada.clientTransactionId);
      urlCancelacion = u.toString();
    } catch {
      urlCancelacion = cancellationUrlEfectiva;
    }
  }

  const cuerpo: Record<string, unknown> = {
    amount: entrada.montos.amount,
    amountWithoutTax: entrada.montos.amountWithoutTax,
    amountWithTax: entrada.montos.amountWithTax,
    tax: entrada.montos.tax,
    service: entrada.montos.service,
    tip: entrada.montos.tip,
    currency: "USD",
    clientTransactionId: entrada.clientTransactionId,
    reference: entrada.referencia.trim().slice(0, 100) || "Boleto de transporte",
    responseUrl: responseUrlEfectiva,
    cancellationUrl: urlCancelacion,
    timeZone: -5,
    ...(storeId ? { storeId } : {}),
    ...(entrada.email?.trim() ? { email: entrada.email.trim().slice(0, 120) } : {}),
    ...(entrada.documento?.trim() ? { documentId: entrada.documento.trim().slice(0, 30) } : {}),
    ...(entrada.telefono?.trim() ? { phoneNumber: entrada.telefono.trim().slice(0, 20) } : {}),
  };

  let resp: Response;
  try {
    resp = await fetcher(`${apiBase}/button/Prepare`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ErrorPago(502, "No se pudo conectar con PayPhone. Intenta nuevamente en unos segundos.");
  }

  const texto = await resp.text();
  let datos: Record<string, unknown> = {};
  try {
    if (texto) datos = JSON.parse(texto) as Record<string, unknown>;
  } catch {
    datos = {};
  }

  if (!resp.ok) {
    throw new ErrorPago(502, `PayPhone no pudo iniciar el cobro (${limpiarMensajeProveedor(datos, resp.status)}).`);
  }

  const payWithCard = esUrlHttpsSegura(datos.payWithCard) ? datos.payWithCard : "";
  const payWithPayPhone = esUrlHttpsSegura(datos.payWithPayPhone) ? datos.payWithPayPhone : "";
  if (!payWithCard && !payWithPayPhone) {
    throw new ErrorPago(502, "PayPhone devolvió un enlace de pago inválido.");
  }

  return {
    paymentId: datos.paymentId !== undefined && datos.paymentId !== null ? String(datos.paymentId) : "",
    payWithCard,
    payWithPayPhone,
  };
}

export async function confirmarPagoPayphone(
  entrada: { id: number; clientTxId: string },
  fetcher: typeof fetch = fetch,
): Promise<ResultadoConfirmarPayphone> {
  const { token, apiBase } = obtenerConfigPayphone();
  if (!token) {
    throw new ErrorPago(
      503,
      "PayPhone no está configurado en el servidor (falta PAYPHONE_TOKEN en backend/.env).",
    );
  }

  let resp: Response;
  try {
    resp = await fetcher(`${apiBase}/button/V2/Confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: entrada.id, clientTxId: entrada.clientTxId }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ErrorPago(502, "No se pudo verificar el estado de la transacción en PayPhone.");
  }

  const texto = await resp.text();
  let datos: Record<string, unknown> = {};
  try {
    if (texto) datos = JSON.parse(texto) as Record<string, unknown>;
  } catch {
    datos = {};
  }

  if (!resp.ok) {
    throw new ErrorPago(502, `PayPhone rechazó la verificación (${limpiarMensajeProveedor(datos, resp.status)}).`);
  }

  const statusCode = Number(datos.statusCode ?? 0);
  const transactionStatus = typeof datos.transactionStatus === "string" ? datos.transactionStatus : "";
  const estado: ResultadoConfirmarPayphone["estado"] =
    statusCode === 3 || /^approved$/i.test(transactionStatus)
      ? "APROBADO"
      : statusCode === 2 || /cancel/i.test(transactionStatus)
        ? "CANCELADO"
        : "PENDIENTE";

  const transactionId =
    datos.transactionId !== undefined && datos.transactionId !== null
      ? String(datos.transactionId)
      : String(entrada.id);
  const clientTransactionId = String(datos.clientTransactionId ?? datos.clientTxId ?? entrada.clientTxId);
  const amount = Number(datos.amount ?? 0);
  const authorizationCode =
    typeof datos.authorizationCode === "string" && datos.authorizationCode.trim()
      ? datos.authorizationCode.trim()
      : null;
  const reference = typeof datos.reference === "string" ? datos.reference : null;
  const message = typeof datos.message === "string" ? datos.message : null;

  return {
    estado,
    statusCode,
    transactionStatus,
    transactionId,
    clientTransactionId,
    amount,
    authorizationCode,
    reference,
    message,
  };
}
