import { createHash } from "node:crypto";
import { Router } from "express";
import { sesionOficina, ErrorOficina } from "./acceso";
import { accesoOficina, alcanceReserva } from "./consultas";
import { uuid } from "../pagos/validacion";
import { emitir, limpiarTrasError } from "../pagos/router";
import { dispararEntregas } from "../pagos/entregaBoletos";
export const ventasRouter = Router();
ventasRouter.post("/oficina/ventas/reservas", async (req, res, next) => {
  try {
    const b = req.body ?? {},
      oficina = uuid(b.oficina_id),
      viaje = uuid(b.viaje_id),
      clave = uuid(b.clave);
    if (
      !Number.isInteger(b.origen_orden) ||
      !Number.isInteger(b.destino_orden) ||
      b.origen_orden < 1 ||
      b.destino_orden <= b.origen_orden ||
      !Array.isArray(b.asiento_ids) ||
      b.asiento_ids.length < 1 ||
      b.asiento_ids.length > 10
    )
      throw new ErrorOficina(
        422,
        "Revisa el tramo y selecciona entre uno y diez asientos.",
      );
    const asientos = b.asiento_ids.map(uuid);
    if (new Set(asientos).size !== asientos.length)
      throw new ErrorOficina(422, "No repitas asientos.");
    const datos = await sesionOficina(req, async (db) => {
      const oficinas = await accesoOficina(db);
      const o = oficinas.find((o) => o.id === oficina);
      if (!o) throw new ErrorOficina(403, "Oficina no autorizada.");
      const v = (
        await db.query(
          "SELECT cooperativa_id FROM transporte.viajes WHERE id=$1",
          [viaje],
        )
      ).rows[0];
      if (!v || v.cooperativa_id !== o.cooperativa_id)
        throw new ErrorOficina(
          403,
          "El viaje no pertenece a la cooperativa de la oficina.",
        );
      const huella = createHash("sha256")
        .update(
          JSON.stringify([
            oficina,
            viaje,
            b.origen_orden,
            b.destino_orden,
            [...asientos].sort(),
          ]),
        )
        .digest("hex");
      await db.query(
        "SELECT pg_advisory_xact_lock(hashtextextended(transporte.actor()::text || $1,0))",
        [clave],
      );
      const previo = (
        await db.query(
          "SELECT reserva_id,huella FROM transporte.ventas_oficina_peticiones WHERE usuario_id=transporte.actor() AND clave=$1",
          [clave],
        )
      ).rows[0];
      if (previo) {
        if (previo.huella !== huella)
          throw new ErrorOficina(
            409,
            "La clave ya corresponde a otra selección.",
          );
        return (
          await db.query("SELECT transporte.compra_resumen($1) AS datos", [
            previo.reserva_id,
          ])
        ).rows[0].datos;
      }
      const id = (
        await db.query(
          "SELECT transporte.reservar_asientos($1,$2,$3,$4::uuid[],NULL,$5) AS id",
          [viaje, b.origen_orden, b.destino_orden, asientos, oficina],
        )
      ).rows[0].id;
      await db.query(
        "INSERT INTO transporte.ventas_oficina_peticiones(usuario_id,clave,reserva_id,huella) VALUES(transporte.actor(),$1,$2,$3)",
        [clave, id, huella],
      );
      return (
        await db.query("SELECT transporte.compra_resumen($1) AS datos", [id])
      ).rows[0].datos;
    });
    res.status(201).json(datos);
  } catch (e) {
    next(e);
  }
});
ventasRouter.post("/oficina/ventas/:id/cobro", async (req, res, next) => {
  const creados: string[] = [];
  try {
    const id = uuid(req.params.id),
      clave = uuid(req.body?.clave),
      recibido = req.body?.recibidoCentavos;
    if (!Number.isSafeInteger(recibido) || recibido < 1 || recibido > 100000000)
      throw new ErrorOficina(422, "Ingresa el efectivo recibido en centavos.");
    const datos = await sesionOficina(req, async (db) => {
      const r = (
        await db.query(
          `SELECT r.id FROM transporte.reservas r WHERE r.id=$1 AND r.oficina_id IS NOT NULL AND ${alcanceReserva("oficina.vender")}`,
          [id],
        )
      ).rows[0];
      if (!r) throw new ErrorOficina(404, "Reserva de oficina no disponible.");
      const compra = (
        await db.query("SELECT transporte.cobrar_efectivo($1,$2,$3) AS id", [
          id,
          recibido,
          clave,
        ])
      ).rows[0].id;
      await emitir(db, compra, creados);
      return { compra_id: compra, reserva_id: id };
    });
    dispararEntregas();
    res.json(datos);
  } catch (e) {
    await limpiarTrasError(req, creados);
    next(e);
  }
});
