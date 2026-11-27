import express, { Router, type NextFunction, type Request, type Response } from "express";
import type { PoolClient } from "pg";
import { conSesion } from "../sesion";
import { origenPermitido } from "../origen";

/** RF11: validación de abordaje mediante el QR del boleto (PDF o Google Wallet). */
export class ErrorAbordaje extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function uuidAbordaje(valor: unknown, campo: string): string {
  if (typeof valor === "string") {
    const limpio = valor.trim();
    if (limpio.length === 36 && UUID.test(limpio)) return limpio.toLowerCase();
  }
  throw new ErrorAbordaje(422, `El dato ${campo} no es válido.`);
}

/** Acepta el UUID puro o un texto leído por el escáner que lo contenga. */
export function extraerQr(valor: unknown): string {
  if (typeof valor !== "string" || valor.length > 500) throw new ErrorAbordaje(422, "El código QR no es válido.");
  const encontrado = valor.match(UUID);
  if (!encontrado) throw new ErrorAbordaje(422, "El código QR no corresponde a un boleto de Gran Continental.");
  return encontrado[0].toLowerCase();
}

export function estadoError(error: unknown): { status: number; mensaje: string } {
  if (error instanceof ErrorAbordaje) return { status: error.status, mensaje: error.message };
  const detalle = error as { code?: string; type?: string } | null;
  if (detalle?.type === "entity.too.large") return { status: 413, mensaje: "Solicitud demasiado grande." };
  if (detalle?.type === "entity.parse.failed") return { status: 400, mensaje: "JSON no válido." };
  const code = detalle?.code ?? "";
  switch (code) {
    case "28000":
      return { status: 401, mensaje: "La sesión venció. Inicia sesión nuevamente." };
    case "P0002":
      return { status: 404, mensaje: "Boleto no encontrado. Verifica el código QR." };
    case "42501":
      return { status: 403, mensaje: "No tienes permiso para validar abordajes de esta cooperativa." };
    case "23505":
      return { status: 409, mensaje: "Este pasajero ya registró su abordaje." };
    case "P0001":
      return { status: 409, mensaje: "El boleto, el pasajero o el viaje no son válidos para abordar." };
    case "22P02":
      return { status: 422, mensaje: "Los datos enviados no son válidos." };
    default:
      return { status: 503, mensaje: "No se pudo validar el abordaje. Inténtalo nuevamente." };
  }
}

type Contexto = <T>(req: Request, trabajo: (db: PoolClient) => Promise<T>) => Promise<T>;

function sesionPorCookie<T>(req: Request, trabajo: (db: PoolClient) => Promise<T>) {
  const token = req.cookies?.transporte_sesion;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new ErrorAbordaje(401, "Inicia sesión para validar abordajes.");
  return conSesion(token, trabajo);
}

async function consultarBoleto(db: PoolClient, qr: string) {
  return (await db.query("SELECT transporte.consultar_boleto_abordaje($1::uuid) AS datos", [qr])).rows[0]?.datos;
}

export function crearAbordajeRouter(contexto: Contexto = sesionPorCookie) {
  const router = Router();
  router.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    if (!["GET", "HEAD"].includes(req.method)) {
      if (req.headers["sec-fetch-site"] === "cross-site" || (req.headers.origin && !origenPermitido(req.headers.origin))) {
        res.status(403).json({ error: "Origen no permitido." });
        return;
      }
    }
    next();
  });
  router.use(express.json({ limit: "4kb" }));

  router.get("/boletos/:qr", async (req, res, next) => {
    try {
      const qr = extraerQr(req.params.qr);
      res.json(await contexto(req, (db) => consultarBoleto(db, qr)));
    } catch (e) {
      next(e);
    }
  });

  router.post("/registrar", async (req, res, next) => {
    try {
      const qr = extraerQr(req.body?.qrId);
      const asiento = uuidAbordaje(req.body?.reservaAsientoId, "pasajero");
      const clave = uuidAbordaje(req.body?.clave, "clave");
      const resultado = await contexto(req, async (db) => {
        const abordajeId = (
          await db.query("SELECT transporte.registrar_abordaje($1::uuid,$2::uuid,$3::text) AS id", [qr, asiento, clave])
        ).rows[0]?.id as string;
        return { abordajeId, boleto: await consultarBoleto(db, qr) };
      });
      res.status(201).json({ ...resultado, mensaje: "Abordaje registrado correctamente." });
    } catch (e) {
      next(e);
    }
  });

  router.use((e: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const { status, mensaje } = estadoError(e);
    if (status >= 500) console.error("Error en validación de abordaje:", (e as { code?: string })?.code ?? "interno");
    res.status(status).json({ error: mensaje });
  });
  return router;
}

export const abordajeRouter = crearAbordajeRouter();
