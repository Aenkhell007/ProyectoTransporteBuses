import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

/**
 * Integración oficial y gratuita con Google Wallet API (pases de transporte para Android).
 * Registra TransitClass + TransitObject vía REST OAuth2 (JWT Bearer RS256) y firma un JWT
 * compacto `savetowallet` con los IDs oficiales, sin dependencias externas.
 */

export interface PasajeroWallet {
  reservaAsientoId?: string;
  nombre: string;
  asiento: string;
  piso?: number;
  documento?: string;
}

export interface DatosWallet {
  compraId: string;
  codigo: string;
  qrId: string;
  cooperativa: string;
  origen: string;
  destino: string;
  terminalOrigen?: string;
  terminalDestino?: string;
  salida: string;
  llegada?: string;
  unidad?: string;
  placa?: string;
  servicio?: string;
  pasajeros: PasajeroWallet[];
}

export interface ConfigWallet {
  issuerId: string;
  email: string;
  privateKey: string;
  classSuffix: string;
  origins: string[];
  logoUrl: string;
}

export type ResultadoWallet =
  | { disponible: true; modo: "OFICIAL"; saveUrl: string; classId: string; objectIds: string[] }
  | {
      disponible: false;
      modo: "DEMO_SIN_CREDENCIALES";
      motivo: string;
      guia: string;
      vistaPrevia: { classId: string; objetos: number; barcode: string; pasajeros: string[] };
    };

export class ErrorGoogleWallet extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const GUIA = "docs/google-wallet-android.md";
const LOGO_PUBLICO_POR_DEFECTO =
  "https://raw.githubusercontent.com/Aenkhell007/ProyectoTransporteBuses/main/frontend/public/images/Logo%20G-C.png";
const API_BASE = "https://walletobjects.googleapis.com/walletobjects/v1";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ID_SEGURO = /[^A-Za-z0-9._-]/g;

const cacheJson = new Map<string, { email: string; privateKey: string }>();
const cacheToken = new Map<string, { token: string; expiraMs: number }>();
const clasesVerificadas = new Set<string>();

function limpiarId(valor: string) {
  return valor.replace(ID_SEGURO, "_").slice(0, 120);
}

function httpsValida(valor: string | undefined): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function fechaEcuadorIso(valor: string | undefined): string | undefined {
  if (!valor) return undefined;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  const ec = new Date(d.getTime() - 5 * 60 * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ec.getUTCFullYear()}-${pad(ec.getUTCMonth() + 1)}-${pad(ec.getUTCDate())}T${pad(ec.getUTCHours())}:${pad(ec.getUTCMinutes())}:${pad(ec.getUTCSeconds())}-05:00`;
}

function leerCredencialesJson(rutaCruda: string | undefined): { email: string; privateKey: string } | null {
  const ruta = (rutaCruda ?? "").trim();
  if (!ruta) return null;
  const candidatos = [
    ...(isAbsolute(ruta) ? [ruta] : []),
    resolve(process.cwd(), ruta),
    resolve(process.cwd(), "backend", ruta),
    resolve(__dirname, "../..", ruta),
    resolve(__dirname, "../../../..", ruta),
  ];
  const encontrada = candidatos.find((c) => existsSync(c));
  if (!encontrada) return null;
  const enCache = cacheJson.get(encontrada);
  if (enCache) return enCache;
  try {
    const parsed = JSON.parse(readFileSync(encontrada, "utf8")) as {
      client_email?: unknown;
      private_key?: unknown;
    };
    const email = typeof parsed.client_email === "string" ? parsed.client_email.trim() : "";
    const privateKey = typeof parsed.private_key === "string" ? parsed.private_key.replace(/\\n/g, "\n").trim() : "";
    if (!email.includes("@") || !privateKey.includes("PRIVATE KEY")) return null;
    const cred = { email, privateKey };
    cacheJson.set(encontrada, cred);
    return cred;
  } catch {
    return null;
  }
}

export function configuracionWallet(env: NodeJS.ProcessEnv = process.env): ConfigWallet | null {
  const issuerId = (env.GOOGLE_WALLET_ISSUER_ID ?? "").trim();
  let email = (env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ?? env.GOOGLE_WALLET_CLIENT_EMAIL ?? "").trim();
  let privateKey = (env.GOOGLE_WALLET_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();

  if (!privateKey.includes("PRIVATE KEY") || !email.includes("@")) {
    const json = leerCredencialesJson(env.GOOGLE_WALLET_CREDENTIALS_FILE ?? env.GOOGLE_APPLICATION_CREDENTIALS);
    if (json) {
      if (!email.includes("@")) email = json.email;
      if (!privateKey.includes("PRIVATE KEY")) privateKey = json.privateKey;
    }
  }

  if (!/^\d{6,30}$/.test(issuerId) || !email.includes("@") || !privateKey.includes("PRIVATE KEY")) return null;
  const classSuffix = limpiarId((env.GOOGLE_WALLET_CLASS_SUFFIX ?? "gran_continental_bus_v1").trim() || "gran_continental_bus_v1");
  const origins = [env.GOOGLE_WALLET_ORIGINS, env.FRONTEND_URL]
    .flatMap((v) => (v ?? "").split(","))
    .map((v) => v.trim())
    .filter((v) => /^https:\/\//i.test(v))
    .map((v) => new URL(v).origin);
  const frente = httpsValida(env.FRONTEND_URL);
  const logoUrl =
    httpsValida(env.GOOGLE_WALLET_LOGO_URL) ??
    (frente ? new URL("/images/Logo%20G-C.png", frente).toString() : LOGO_PUBLICO_POR_DEFECTO);
  return { issuerId, email, privateKey, classSuffix, origins: [...new Set(origins)], logoUrl };
}

const texto = (value: string) => ({ defaultValue: { language: "es-419", value } });

export function construirPayloadWallet(datos: DatosWallet, cfg: Pick<ConfigWallet, "issuerId" | "classSuffix" | "logoUrl">) {
  const classId = `${cfg.issuerId}.${cfg.classSuffix}`;
  const pasajeros = datos.pasajeros.length ? datos.pasajeros : [{ nombre: "Pasajero", asiento: "-" }];
  const salidaIso = fechaEcuadorIso(datos.salida) ?? datos.salida;
  const llegadaIso = fechaEcuadorIso(datos.llegada);

  const transitClass: Record<string, unknown> = {
    id: classId,
    issuerName: "Gran Continental",
    reviewStatus: "UNDER_REVIEW",
    transitType: "BUS",
    transitOperatorName: texto(datos.cooperativa || "Gran Continental"),
    logo: {
      sourceUri: { uri: cfg.logoUrl },
      contentDescription: texto("Gran Continental"),
    },
  };

  const textModulesData = [
    ...(datos.unidad || datos.placa
      ? [{ id: "bus", header: "Bus", body: [datos.unidad && `Unidad ${datos.unidad}`, datos.placa && `Placa ${datos.placa}`].filter(Boolean).join(" · ") }]
      : []),
    ...(datos.servicio ? [{ id: "servicio", header: "Servicio", body: datos.servicio }] : []),
  ];

  const transitObjects = pasajeros.map((p, i) => {
    const sufijo = limpiarId(`${datos.compraId}_${p.reservaAsientoId ?? i + 1}`);
    return {
      id: `${cfg.issuerId}.${sufijo}`,
      classId,
      state: "ACTIVE",
      tripType: "ONE_WAY",
      passengerType: "SINGLE_PASSENGER",
      passengerNames: p.nombre,
      ticketNumber: datos.codigo,
      hexBackgroundColor: "#08064E",
      ticketLeg: {
        originName: texto(datos.terminalOrigen ? `${datos.origen} · ${datos.terminalOrigen}` : datos.origen),
        destinationName: texto(datos.terminalDestino ? `${datos.destino} · ${datos.terminalDestino}` : datos.destino),
        departureDateTime: salidaIso,
        ...(llegadaIso ? { arrivalDateTime: llegadaIso } : {}),
        ticketSeat: {
          seat: String(p.asiento),
          ...(p.piso ? { coach: `Piso ${p.piso}` } : {}),
        },
      },
      barcode: { type: "QR_CODE", value: datos.qrId, alternateText: datos.codigo },
      ...(textModulesData.length ? { textModulesData } : {}),
    };
  });
  return { classId, transitClass, transitObjects };
}

const base64url = (valor: Buffer | string) => Buffer.from(valor).toString("base64url");

export function firmarJwtRS256(payload: Record<string, unknown>, privateKey: string) {
  const encabezado = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = base64url(JSON.stringify(payload));
  const firma = createSign("RSA-SHA256").update(`${encabezado}.${cuerpo}`).end().sign(privateKey);
  return `${encabezado}.${cuerpo}.${base64url(firma)}`;
}

function respuestaDemo(datos: DatosWallet): ResultadoWallet {
  const demo = construirPayloadWallet(datos, {
    issuerId: "DEMO",
    classSuffix: "gran_continental_bus_v1",
    logoUrl: LOGO_PUBLICO_POR_DEFECTO,
  });
  return {
    disponible: false,
    modo: "DEMO_SIN_CREDENCIALES",
    motivo:
      "Google Wallet aún no está configurado en el servidor. El administrador debe registrar el Issuer ID y la cuenta de servicio (gratuitos) para activarlo.",
    guia: GUIA,
    vistaPrevia: {
      classId: demo.classId,
      objetos: demo.transitObjects.length,
      barcode: datos.qrId,
      pasajeros: demo.transitObjects.map((o) => o.passengerNames),
    },
  };
}

export function generarEnlaceWallet(datos: DatosWallet, env: NodeJS.ProcessEnv = process.env): ResultadoWallet {
  const cfg = configuracionWallet(env);
  if (!cfg) return respuestaDemo(datos);
  const { classId, transitClass, transitObjects } = construirPayloadWallet(datos, cfg);
  const jwt = firmarJwtRS256(
    {
      iss: cfg.email,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      ...(cfg.origins.length ? { origins: cfg.origins } : {}),
      payload: { transitClasses: [transitClass], transitObjects },
    },
    cfg.privateKey,
  );
  return {
    disponible: true,
    modo: "OFICIAL",
    saveUrl: `https://pay.google.com/gp/v/save/${jwt}`,
    classId,
    objectIds: transitObjects.map((o) => o.id),
  };
}

export async function obtenerTokenGoogleWallet(
  cfg: Pick<ConfigWallet, "email" | "privateKey">,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const ahora = Date.now();
  const cacheada = cacheToken.get(cfg.email);
  if (cacheada && cacheada.expiraMs > ahora + 60_000) return cacheada.token;

  const iat = Math.floor(ahora / 1000);
  const assertion = firmarJwtRS256(
    {
      iss: cfg.email,
      scope: "https://www.googleapis.com/auth/wallet_object.issuer",
      aud: OAUTH_TOKEN_URL,
      iat,
      exp: iat + 3600,
    },
    cfg.privateKey,
  );

  const resp = await fetchImpl(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = (await resp.json().catch(() => null)) as { access_token?: string; expires_in?: number; error_description?: string } | null;
  if (!resp.ok || !json?.access_token) {
    throw new ErrorGoogleWallet(502, json?.error_description || "No se pudo autenticar con Google Wallet.");
  }
  const ttlMs = Math.max(60, Number(json.expires_in ?? 3000) - 120) * 1000;
  cacheToken.set(cfg.email, { token: json.access_token, expiraMs: ahora + ttlMs });
  return json.access_token;
}

async function leerMensajeErrorGoogle(resp: Response, respaldo: string): Promise<string> {
  const body = (await resp.json().catch(() => null)) as { error?: { message?: string } } | null;
  return body?.error?.message || respaldo;
}

export async function asegurarClaseTransito(
  token: string,
  transitClass: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const classId = String(transitClass.id);
  if (clasesVerificadas.has(classId)) return;

  const getResp = await fetchImpl(`${API_BASE}/transitClass/${encodeURIComponent(classId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (getResp.ok) {
    clasesVerificadas.add(classId);
    return;
  }
  if (getResp.status !== 404) {
    throw new ErrorGoogleWallet(502, await leerMensajeErrorGoogle(getResp, "No se pudo consultar la clase de Google Wallet."));
  }

  const postResp = await fetchImpl(`${API_BASE}/transitClass`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(transitClass),
  });
  if (postResp.ok || postResp.status === 409) {
    clasesVerificadas.add(classId);
    return;
  }
  throw new ErrorGoogleWallet(502, await leerMensajeErrorGoogle(postResp, "No se pudo crear la clase de transporte en Google Wallet."));
}

export async function guardarObjetoTransito(
  token: string,
  transitObject: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const objectId = String(transitObject.id);
  const postResp = await fetchImpl(`${API_BASE}/transitObject`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(transitObject),
  });
  if (postResp.ok) return;
  if (postResp.status !== 409) {
    throw new ErrorGoogleWallet(502, await leerMensajeErrorGoogle(postResp, "No se pudo registrar el boleto en Google Wallet."));
  }

  const putResp = await fetchImpl(`${API_BASE}/transitObject/${encodeURIComponent(objectId)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(transitObject),
  });
  if (!putResp.ok) {
    throw new ErrorGoogleWallet(502, await leerMensajeErrorGoogle(putResp, "No se pudo actualizar el boleto en Google Wallet."));
  }
}

export async function generarEnlaceWalletOficial(
  datos: DatosWallet,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoWallet> {
  const cfg = configuracionWallet(env);
  if (!cfg) return respuestaDemo(datos);

  const { classId, transitClass, transitObjects } = construirPayloadWallet(datos, cfg);
  const token = await obtenerTokenGoogleWallet(cfg, fetchImpl);
  await asegurarClaseTransito(token, transitClass, fetchImpl);
  await Promise.all(transitObjects.map((obj) => guardarObjetoTransito(token, obj, fetchImpl)));

  const objectIds = transitObjects.map((o) => o.id);
  const jwt = firmarJwtRS256(
    {
      iss: cfg.email,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      ...(cfg.origins.length ? { origins: cfg.origins } : {}),
      payload: { transitObjects: objectIds.map((id) => ({ id })) },
    },
    cfg.privateKey,
  );
  return {
    disponible: true,
    modo: "OFICIAL",
    saveUrl: `https://pay.google.com/gp/v/save/${jwt}`,
    classId,
    objectIds,
  };
}

export function limpiarCachesWalletPrueba() {
  cacheToken.clear();
  clasesVerificadas.clear();
}
