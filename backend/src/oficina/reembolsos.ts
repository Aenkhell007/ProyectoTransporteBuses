import { createHash } from "node:crypto";
import express, { Router } from "express";
import { sesionOficina, ErrorOficina } from "./acceso";
import { alcanceReserva } from "./consultas";
import { uuid, validarArchivo, nombreSeguro } from "../pagos/validacion";
import { guardarArchivo, leerArchivo } from "../pagos/archivos";
import { limpiarTrasError } from "../pagos/router";
import type { PoolClient } from "pg";
export const reembolsosRouter = Router();
async function solicitud(db: PoolClient, id: string) {
  const r = (
    await db.query(
      `SELECT s.*,r.id AS reserva_id FROM transporte.solicitudes_reembolso s JOIN transporte.compras c ON c.id=s.compra_id JOIN transporte.reservas r ON r.id=c.reserva_id WHERE s.id=$1 AND ${alcanceReserva("reembolsos.gestionar")}`,
      [id],
    )
  ).rows[0];
  if (!r) throw new ErrorOficina(404, "Solicitud no disponible.");
  return r;
}
reembolsosRouter.get("/oficina/reembolsos", async (req, res, next) => {
  try {
    res.json(
      await sesionOficina(req, async (db) => ({
        solicitudes: (
          await db.query(
            `SELECT s.*,c.codigo,c.total_pagado_centavos,r.id AS reserva_id,coalesce((SELECT pa.nombres || ' ' || pa.apellidos FROM transporte.pasajeros pa JOIN transporte.reserva_asientos ra ON ra.id=pa.reserva_asiento_id WHERE ra.reserva_id=r.id ORDER BY ra.created_at,ra.id LIMIT 1),u.nombres || ' ' || u.apellidos) AS cliente,v.salida,co.nombre AS cooperativa,po.numero_version AS politica_version,po.estado AS politica_estado,ab.evidencia_archivo_id,ab.referencia_externa,ab.ejecutado_at FROM transporte.solicitudes_reembolso s JOIN transporte.compras c ON c.id=s.compra_id JOIN transporte.reservas r ON r.id=c.reserva_id JOIN transporte.usuarios u ON u.id=r.cliente_id JOIN transporte.viajes v ON v.id=r.viaje_id JOIN transporte.cooperativas co ON co.id=s.cooperativa_id JOIN transporte.politicas_reembolso po ON po.id=s.politica_id LEFT JOIN transporte.reembolsos ab ON ab.solicitud_id=s.id WHERE ${alcanceReserva("reembolsos.gestionar")} ORDER BY s.created_at DESC`,
          )
        ).rows,
      })),
    );
  } catch (e) {
    next(e);
  }
});
reembolsosRouter.get(
  "/oficina/reembolsos/elegibilidad/:compra",
  async (req, res, next) => {
    try {
      res.json(
        await sesionOficina(req, async (db) => {
          const r = (
            await db.query(
              `SELECT c.id FROM transporte.compras c JOIN transporte.reservas r ON r.id=c.reserva_id WHERE c.id=$1 AND ${alcanceReserva("reembolsos.gestionar")}`,
              [uuid(req.params.compra)],
            )
          ).rows[0];
          if (!r) throw new ErrorOficina(404, "Compra no disponible.");
          return (
            await db.query(
              "SELECT transporte.elegibilidad_reembolso($1) AS datos",
              [r.id],
            )
          ).rows[0].datos;
        }),
      );
    } catch (e) {
      next(e);
    }
  },
);
reembolsosRouter.post("/oficina/reembolsos", async (req, res, next) => {
  try {
    const { compraId, motivo, clave } = req.body ?? {};
    if (typeof motivo !== "string" || !motivo.trim() || motivo.length > 500)
      throw new ErrorOficina(422, "Indica el motivo (máximo 500 caracteres).");
    res.status(201).json(
      await sesionOficina(req, async (db) => {
        const r = (
          await db.query(
            `SELECT c.id FROM transporte.compras c JOIN transporte.reservas r ON r.id=c.reserva_id WHERE c.id=$1 AND ${alcanceReserva("reembolsos.gestionar")}`,
            [uuid(compraId)],
          )
        ).rows[0];
        if (!r) throw new ErrorOficina(404, "Compra no disponible.");
        return (
          await db.query(
            "SELECT transporte.solicitar_reembolso($1,$2,$3) AS id",
            [r.id, motivo.trim(), uuid(clave)],
          )
        ).rows[0];
      }),
    );
  } catch (e) {
    next(e);
  }
});
reembolsosRouter.post(
  "/oficina/reembolsos/:id/decision",
  async (req, res, next) => {
    try {
      const { aprobar, motivo } = req.body ?? {};
      if (
        typeof aprobar !== "boolean" ||
        typeof motivo !== "string" ||
        !motivo.trim() ||
        motivo.length > 500
      )
        throw new ErrorOficina(
          422,
          "Indica la decisión y su motivo (máximo 500 caracteres).",
        );
      await sesionOficina(req, async (db) => {
        await solicitud(db, uuid(req.params.id));
        await db.query("SELECT transporte.decidir_reembolso($1,$2,$3)", [
          req.params.id,
          aprobar,
          motivo.trim(),
        ]);
      });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);
reembolsosRouter.post(
  "/oficina/reembolsos/:id/abono",
  express.raw({
    type: ["image/jpeg", "image/png", "application/pdf"],
    limit: "5mb",
  }),
  async (req, res, next) => {
    const creados: string[] = [];
    try {
      const id = uuid(req.params.id),
        clave = uuid(req.query.clave),
        ref =
          typeof req.query.referencia === "string"
            ? req.query.referencia.trim()
            : "";
      if (!ref || ref.length > 200)
        throw new ErrorOficina(
          422,
          "Indica la referencia del abono (máximo 200 caracteres).",
        );
      const mime = String(req.headers["content-type"] ?? "").split(";")[0];
      validarArchivo(req.body, mime, 5 * 1024 * 1024, [
        "image/png",
        "image/jpeg",
        "application/pdf",
      ]);
      const result = await sesionOficina(req, async (db) => {
        const s = await solicitud(db, id);
        await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
          id,
        ]);
        const previo = (
          await db.query(
            "SELECT ab.id,ab.referencia_externa,ab.clave_intento,a.sha256 FROM transporte.reembolsos ab JOIN transporte.archivos a ON a.id=ab.evidencia_archivo_id WHERE ab.solicitud_id=$1",
            [id],
          )
        ).rows[0];
        if (previo) {
          if (
            previo.clave_intento !== clave ||
            previo.referencia_externa !== ref ||
            previo.sha256 !==
              createHash("sha256").update(req.body).digest("hex")
          )
            throw new ErrorOficina(409, "El abono ya fue registrado.");
          return { id: previo.id };
        }
        if (s.estado !== "APROBADO")
          throw new ErrorOficina(409, "Primero debe aprobarse la solicitud.");
        const archivo = await guardarArchivo(
          db,
          s.reserva_id,
          req.body,
          nombreSeguro(req.get("x-file-name")),
          mime,
          "REEMBOLSO",
          creados,
        );
        return (
          await db.query(
            "SELECT transporte.registrar_abono_reembolso($1,$2,$3,$4) AS id",
            [id, ref, archivo, clave],
          )
        ).rows[0];
      });
      res.json(result);
    } catch (e) {
      await limpiarTrasError(req, creados);
      next(e);
    }
  },
);
reembolsosRouter.get(
  "/oficina/reembolsos/:id/respaldo",
  async (req, res, next) => {
    try {
      const a = await sesionOficina(req, async (db) => {
        await solicitud(db, uuid(req.params.id));
        const r = (
          await db.query(
            "SELECT a.ruta_privada,a.mime FROM transporte.reembolsos ab JOIN transporte.archivos a ON a.id=ab.evidencia_archivo_id WHERE ab.solicitud_id=$1",
            [req.params.id],
          )
        ).rows[0];
        if (!r) throw new ErrorOficina(404, "No hay respaldo disponible.");
        return r;
      });
      res
        .type(a.mime)
        .set(
          "Content-Disposition",
          'attachment; filename="' +
            nombreSeguro(a.ruta_privada.split("/").pop()) +
            '"',
        )
        .send(await leerArchivo(a.ruta_privada));
    } catch (e) {
      next(e);
    }
  },
);
