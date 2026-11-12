import express, { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import type { PoolClient } from "pg";
import { createHash } from "node:crypto";
import { conSesion } from "../sesion";
import { guardarArchivo, borrarCreados, leerArchivo } from "./archivos";
import {
  ErrorPago,
  uuid,
  validarArchivo,
  referenciaValida,
  nombreSeguro,
} from "./validacion";
import { generarBoleto } from "./boleto";
import type { DatosPago } from "../../../shared/pagos";
import QRCode from "qrcode";

import { conservarDatosCompra } from "./datos";

export const pagosRouter = Router();
function token(req: Request) {
  const valor = req.cookies?.transporte_sesion;
  if (typeof valor !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(valor))
    throw new ErrorPago(401, "Inicia sesión para consultar tu reserva.");
  return valor;
}
function responderError(res: Response, error: unknown) {
  if (error instanceof ErrorPago) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  const code = (error as { code?: string })?.code;
  const status =
    code === "28000"
      ? 401
      : code === "42501"
        ? 404
        : ["P0001", "23505", "23P01"].includes(code ?? "")
          ? 409
          : 503;
  res.status(status).json({
    error:
      status === 401
        ? "La sesión venció. Inicia sesión nuevamente."
        : status === 404
          ? "Reserva o archivo no disponible."
          : status === 409
            ? "El estado de la reserva cambió o la operación no está permitida. Actualiza la consulta."
            : "No se pudo completar la operación. Inténtalo nuevamente.",
  });
}
pagosRouter.use((req: Request, res: Response, next: NextFunction) => {
  if (!/^\/(reservas|pagos)\//.test(req.path)) {
    next();
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    token(req);
  } catch (e) {
    responderError(res, e);
    return;
  }
  if (!["GET", "HEAD"].includes(req.method)) {
    const permitidos = new Set([
      process.env.FRONTEND_URL ?? "http://127.0.0.1:5173",
      "http://localhost:5173",
    ]);
    if (
      req.headers["sec-fetch-site"] === "cross-site" ||
      (req.headers.origin && !permitidos.has(req.headers.origin))
    ) {
      res.status(403).json({ error: "Origen no permitido." });
      return;
    }
  }
  next();
});
// Si se pierde la respuesta de COMMIT, el registro puede existir. Nunca se borra a ciegas.
async function limpiarTrasError(req: Request, claves: string[]) {
  if (!claves.length) return;
  try {
    const registrados = await conSesion(token(req), async (db) =>
      (
        await db.query(
          "SELECT ruta_privada FROM transporte.archivos WHERE ruta_privada=ANY($1::text[])",
          [claves],
        )
      ).rows.map((a: { ruta_privada: string }) => a.ruta_privada),
    );
    await borrarCreados(claves.filter((clave) => !registrados.includes(clave)));
  } catch {
    // Ante indisponibilidad se conservan los archivos privados para reconciliar/reintentar.
  }
}
async function consultar(db: PoolClient, id: string) {
  return conservarDatosCompra(
    (
      await db.query("SELECT transporte.consultar_pago_cliente($1) AS datos", [
        id,
      ])
    ).rows[0].datos as DatosPago,
  );
}
pagosRouter.get("/reservas/:id/pago", async (req, res) => {
  try {
    res.json(
      await conSesion(token(req), (db) => consultar(db, uuid(req.params.id))),
    );
  } catch (e) {
    responderError(res, e);
  }
});
pagosRouter.get("/reservas/:id/boleto/qr", async (req, res) => {
  try {
    const datos = await conSesion(token(req), (db) =>
      consultar(db, uuid(req.params.id)),
    );
    if (
      datos.compra?.estado !== "CONFIRMADA" ||
      datos.documento?.estado !== "LISTO"
    )
      throw new ErrorPago(409, "El boleto todavía no está disponible.");
    res.type("image/png").send(
      await QRCode.toBuffer(datos.documento.qrId, {
        width: 240,
        margin: 2,
        errorCorrectionLevel: "M",
      }),
    );
  } catch (e) {
    responderError(res, e);
  }
});
pagosRouter.post("/reservas/:id/intentos-pago", async (req, res) => {
  try {
    const id = uuid(req.params.id),
      cuentaId = uuid(req.body?.cuentaId),
      clave = uuid(req.body?.clave);
    const resultado = await conSesion(token(req), async (db) => {
      const r = await db.query(
        "SELECT transporte.crear_intento_pago($1,'BANCO',$2,$3) AS id",
        [id, cuentaId, clave],
      );
      return { id: r.rows[0].id };
    });
    res.status(201).json(resultado);
  } catch (e) {
    responderError(res, e);
  }
});
pagosRouter.post(
  "/reservas/:id/comprobantes",
  express.raw({
    type: ["image/jpeg", "image/png", "application/pdf"],
    limit: "50mb",
  }),
  async (req, res) => {
    const creados: string[] = [];
    try {
      const id = uuid(req.params.id),
        intentoId = uuid(req.query.intento_id);
      const resultado = await conSesion(token(req), async (db) => {
        // Serializa reintentos concurrentes de la misma reserva antes de escribir un archivo.
        await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
          id,
        ]);
        const datos = await consultar(db, id);
        if (!datos.politica)
          throw new ErrorPago(
            409,
            "La cooperativa aún no ha configurado la política de comprobantes.",
          );
        const referencia = referenciaValida(
          req.query.referencia,
          datos.politica.referenciaObligatoria,
        );
        const mime = String(req.headers["content-type"] ?? "").split(";")[0];
        const limites = (await db.query('SELECT transporte.limites_editor() AS limites')).rows[0]?.limites;
        const formatos: Record<string, string> = { JPG: 'image/jpeg', PNG: 'image/png', PDF: 'application/pdf' };
        const mimesGlobales = (limites?.formatos ?? ['JPG','PNG','PDF']).map((f: string) => formatos[f]);
        validarArchivo(
          req.body,
          mime,
          Math.min(datos.politica.maxBytes, (limites?.maxArchivoMB ?? 5) * 1024 * 1024),
          datos.politica.mimes.filter((m: string) => mimesGlobales.includes(m)),
        );
        const hash = createHash("sha256").update(req.body).digest("hex");
        const anterior = await db.query(
          `SELECT c.id,c.referencia,a.sha256 FROM transporte.comprobantes c JOIN transporte.intentos_pago i ON i.id=c.intento_id
        JOIN transporte.archivos a ON a.id=c.archivo_id WHERE i.id=$1 AND i.reserva_id=$2`,
          [intentoId, id],
        );
        if (anterior.rows[0]) {
          const c = anterior.rows[0];
          if (c.sha256 !== hash || (c.referencia ?? "") !== referencia)
            throw new ErrorPago(
              409,
              "Ese intento ya tiene otro comprobante. Actualiza el seguimiento.",
            );
          return { id: c.id };
        }
        if (
          datos.intento?.id !== intentoId ||
          datos.intento.estado !== "PENDIENTE"
        )
          throw new ErrorPago(
            409,
            "Selecciona un intento de pago pendiente de esta reserva.",
          );
        let nombre = "comprobante";
        try {
          nombre = decodeURIComponent(
            String(req.headers["x-file-name"] ?? nombre),
          );
        } catch {
          throw new ErrorPago(422, "Nombre de archivo no válido.");
        }
        const archivoId = await guardarArchivo(
          db,
          id,
          req.body,
          nombre,
          mime,
          "COMPROBANTE",
          creados,
        );
        const r = await db.query(
          "SELECT transporte.registrar_comprobante($1,$2,$3) AS id",
          [intentoId, archivoId, referencia],
        );
        return { id: r.rows[0].id };
      });
      res.status(201).json(resultado);
    } catch (e) {
      await limpiarTrasError(req, creados);
      responderError(res, e);
    }
  },
);
pagosRouter.get("/reservas/:id/archivos/:archivoId", async (req, res) => {
  try {
    const archivo = await conSesion(
      token(req),
      async (db) =>
        (
          await db.query(
            "SELECT (transporte.archivo_pago_autorizado($1,$2)).*",
            [uuid(req.params.id), uuid(req.params.archivoId)],
          )
        ).rows[0],
    );
    if (!archivo?.id) throw new ErrorPago(404, "Archivo no disponible.");
    const contenido = await leerArchivo(archivo.ruta_privada);
    res.setHeader("Content-Type", archivo.mime);
    res.setHeader(
      "Content-Disposition",
      `${req.query.ver === "1" && ["image/png", "image/jpeg", "application/pdf"].includes(archivo.mime) ? "inline" : "attachment"}; filename="${nombreSeguro(archivo.ruta_privada.split("/").pop())}"`,
    );
    res.send(contenido);
  } catch (e) {
    responderError(res, e);
  }
});
// Contrato para la bandeja de Pablo. La función SQL exige pagos.revisar y su ámbito.
pagosRouter.post("/pagos/comprobantes/:id/revision", async (req, res) => {
  const creados: string[] = [];
  try {
    const id = uuid(req.params.id),
      { aprobar, motivo, version } = req.body ?? {};
    if (
      typeof aprobar !== "boolean" ||
      !Number.isInteger(version) ||
      version < 1 ||
      typeof motivo !== "string" ||
      motivo.length > 300 ||
      (!aprobar && !motivo.trim())
    )
      throw new ErrorPago(
        422,
        "Revisa la decisión, versión y motivo del comprobante.",
      );
    const resultado = await conSesion(token(req), async (db) => {
      const r = await db.query(
        "SELECT transporte.decidir_comprobante($1,$2,$3,$4) AS compra_id",
        [id, aprobar, motivo, version],
      );
      const compraId = r.rows[0].compra_id;
      if (aprobar && compraId) await emitir(db, compraId, creados);
      return { compraId };
    });
    res.json(resultado);
  } catch (e) {
    await limpiarTrasError(req, creados);
    responderError(res, e);
  }
});
async function emitir(db: PoolClient, compraId: string, creados: string[]) {
  await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    compraId,
  ]);
  const documento = (
    await db.query(
      "SELECT b.*,c.reserva_id FROM transporte.boletos b JOIN transporte.compras c ON c.id=b.compra_id WHERE c.id=$1",
      [compraId],
    )
  ).rows[0];
  if (documento?.estado === "LISTO") return;
  if (!documento)
    throw new ErrorPago(409, "La compra no tiene documento para emitir.");
  const datos = await consultar(db, documento.reserva_id);
  const pdf = await generarBoleto(datos);
  const archivoId = await guardarArchivo(
    db,
    documento.reserva_id,
    pdf,
    `boleto-${compraId}.pdf`,
    "application/pdf",
    "DOCUMENTO",
    creados,
  );
  await db.query("SELECT transporte.marcar_boleto_emitido($1,$2)", [
    compraId,
    archivoId,
  ]);
}
pagosRouter.post("/pagos/compras/:id/documento", async (req, res) => {
  const creados: string[] = [];
  try {
    const id = uuid(req.params.id);
    await conSesion(token(req), async (db) => {
      const r = await db.query(
        "SELECT reserva_id,cooperativa_id FROM transporte.compras WHERE id=$1",
        [id],
      );
      if (!r.rows[0]) throw new ErrorPago(404, "Compra no disponible.");
      if (
        !(
          await db.query(
            "SELECT transporte.puede('pagos.revisar',$1,NULL) AS permitido",
            [r.rows[0].cooperativa_id],
          )
        ).rows[0].permitido
      )
        throw new ErrorPago(
          403,
          "No tienes permiso para emitir este documento.",
        );
      await emitir(db, id, creados);
    });
    res.status(204).end();
  } catch (e) {
    await limpiarTrasError(req, creados);
    responderError(res, e);
  }
});
