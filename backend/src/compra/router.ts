import { listarViajesPropios, tarjetaViaje } from "./misViajes";
import { conservarDatosCompra } from "../pagos/datos";
import type { DatosPago } from "../../../shared/pagos";
import express, { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../database";
import { conSesion } from "../sesion";
import { validarArchivo, nombreSeguro, ErrorPago } from "../pagos/validacion";
import { guardarArchivo } from "../pagos/archivos";

export const compraRouter = Router();
export class ErrorCompraServidor extends Error {
  constructor(
    public status: number,
    mensaje: string,
    public campo?: string,
  ) {
    super(mensaje);
  }
}
const idValido =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function id(valor: unknown, campo = "id"): string {
  if (typeof valor !== "string" || !idValido.test(valor))
    throw new ErrorCompraServidor(422, "Identificador no válido.", campo);
  return valor;
}
export function entero(
  valor: unknown,
  min: number,
  max: number,
  campo: string,
): number {
  if (
    (typeof valor !== "string" && typeof valor !== "number") ||
    !/^\d+$/.test(String(valor))
  )
    throw new ErrorCompraServidor(422, "Revisa el valor indicado.", campo);
  const n = Number(valor);
  if (!Number.isSafeInteger(n) || n < min || n > max)
    throw new ErrorCompraServidor(
      422,
      "Valor fuera del rango permitido.",
      campo,
    );
  return n;
}
export function fecha(valor: unknown): string {
  if (
    typeof valor !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor) ||
    !Number.isFinite(Date.parse(valor)) ||
    new Date(valor).toISOString().slice(0, 10) !== valor
  )
    throw new ErrorCompraServidor(422, "Fecha no válida.", "fecha");
  return valor;
}
function token(req: Request) {
  const t = req.cookies?.transporte_sesion;
  if (typeof t !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(t))
    throw new ErrorCompraServidor(401, "Inicia sesión para continuar.");
  return t;
}
export function numeroSeguro(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(numeroSeguro);
  if (valor && typeof valor === "object" && !(valor instanceof Date))
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [k, numeroSeguro(v)]),
    );
  if (typeof valor === "bigint") {
    const n = Number(valor);
    if (!Number.isSafeInteger(n)) throw new Error("Importe fuera de rango");
    return n;
  }
  return valor;
}
function error(res: Response, e: unknown) {
  const pg = e as { code?: string; message?: string };
  const status =
    e instanceof ErrorCompraServidor || e instanceof ErrorPago
      ? e.status
      : pg.code === "28000"
        ? 401
        : pg.code === "42501" || pg.code === "P0002"
          ? 404
          : ["P0001", "23505", "23P01"].includes(pg.code ?? "")
            ? 409
            : ["22023", "23514", "22P02", "22007", "22008", "22001"].includes(
                  pg.code ?? "",
                )
              ? 422
              : 503;
  const mensaje =
    e instanceof ErrorCompraServidor || e instanceof ErrorPago
      ? e.message
      : status === 401
        ? "La sesión venció. Inicia sesión nuevamente."
        : status === 404
          ? "Recurso no disponible."
          : status === 409
            ? "La reserva, disponibilidad o tarifa cambió. Actualiza la consulta."
            : status === 422
              ? "Revisa los datos del formulario."
              : "No se pudo completar la consulta. Inténtalo nuevamente.";
  res
    .status(status)
    .json({
      codigo: `COMPRA_${status}`,
      mensaje,
      errores_campo:
        e instanceof ErrorCompraServidor && e.campo
          ? [{ campo: e.campo, mensaje }]
          : [],
      request_id: randomUUID(),
    });
}
function ruta(trabajo: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response) => {
    void trabajo(req, res).catch((e) => error(res, e));
  };
}
compraRouter.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const permitidos = [
      process.env.FRONTEND_URL ?? "http://127.0.0.1:5173",
      "http://localhost:5173",
    ];
    if (
      req.headers["sec-fetch-site"] === "cross-site" ||
      (req.headers.origin && !permitidos.includes(req.headers.origin))
    ) {
      error(res, new ErrorCompraServidor(403, "Origen no permitido."));
      return;
    }
  }
  next();
});
const catalogos = async () =>
  (await pool.query("SELECT transporte.compra_catalogos() datos")).rows[0]
    .datos;
compraRouter.get(
  "/catalogos/ciudades",
  ruta(async (_req, res) => res.json({ data: (await catalogos()).ciudades })),
);
compraRouter.get(
  "/catalogos/destinos",
  ruta(async (_req, res) => res.json({ data: (await catalogos()).destinos })),
);
compraRouter.get(
  "/catalogos/filtros-viajes",
  ruta(async (_req, res) => {
    const c = await catalogos();
    res.json({
      cooperativas: c.cooperativas,
      chasis: c.chasis,
      carrocerias: c.carrocerias,
    });
  }),
);
compraRouter.get(
  "/viajes",
  ruta(async (req, res) => {
    const q = req.query;
    const origen = id(q.origen_ciudad_id, "origen_ciudad_id"),
      destino = id(q.destino_ciudad_id, "destino_ciudad_id");
    if (origen === destino)
      throw new ErrorCompraServidor(
        422,
        "El destino debe ser distinto del origen.",
        "destino_ciudad_id",
      );
    const dia = fecha(q.fecha);
    const hoy = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guayaquil",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (dia < hoy)
      throw new ErrorCompraServidor(
        422,
        "Selecciona una fecha actual o futura.",
        "fecha",
      );
    const p: Record<string, unknown> = {
      origen,
      destino,
      fecha: dia,
      cantidad: entero(q.cantidad, 1, 10, "cantidad"),
      cursor: q.cursor ? entero(q.cursor, 0, 1000000, "cursor") : 0,
    };
    if (q.cooperativa) p.cooperativa = id(q.cooperativa, "cooperativa");
    for (const [k, opciones] of Object.entries({
      clase: ["NORMAL", "EJECUTIVO"],
      tipo_viaje: ["DIRECTO", "CON_PARADAS"],
      hora: ["MADRUGADA", "MANANA", "TARDE", "NOCHE"],
      orden: ["salida", "precio"],
    })) {
      if (q[k]) {
        if (typeof q[k] !== "string" || !opciones.includes(q[k] as string))
          throw new ErrorCompraServidor(422, "Filtro no válido.", k);
        p[k] = q[k];
      }
    }
    for (const k of ["chasis", "carroceria"])
      if (q[k]) {
        if (typeof q[k] !== "string" || (q[k] as string).length > 100)
          throw new ErrorCompraServidor(422, "Filtro no válido.", k);
        p[k] = q[k];
      }
    for (const k of ["precio_min", "precio_max"])
      if (q[k] !== undefined && q[k] !== "")
        p[k] = entero(q[k], 0, 100000000, k);
    if (
      p.precio_min !== undefined &&
      p.precio_max !== undefined &&
      Number(p.precio_min) > Number(p.precio_max)
    )
      throw new ErrorCompraServidor(
        422,
        "El mínimo supera al máximo.",
        "precio_min",
      );
    res.json(
      (
        await pool.query("SELECT transporte.compra_buscar($1::jsonb) datos", [
          JSON.stringify(p),
        ])
      ).rows[0].datos,
    );
  }),
);
compraRouter.get(
  "/viajes/:id",
  ruta(async (req, res) => {
    const datos = (
      await pool.query("SELECT transporte.compra_detalle($1,$2,$3) datos", [
        id(req.params.id),
        req.query.origen_orden
          ? entero(req.query.origen_orden, 0, 10000, "origen_orden")
          : null,
        req.query.destino_orden
          ? entero(req.query.destino_orden, 0, 10000, "destino_orden")
          : null,
      ])
    ).rows[0].datos;
    res.json(datos);
  }),
);
compraRouter.get(
  "/viajes/:id/mapa-asientos",
  ruta(async (req, res) => {
    const datos = (
      await pool.query("SELECT transporte.compra_detalle($1,$2,$3) datos", [
        id(req.params.id),
        entero(req.query.origen_orden, 0, 10000, "origen_orden"),
        entero(req.query.destino_orden, 1, 10000, "destino_orden"),
      ])
    ).rows[0].datos;
    res.json(datos.mapa);
  }),
);
compraRouter.get(
  "/compra/perfil",
  ruta(async (req, res) =>
    res.json(
      await conSesion(
        token(req),
        async (db) =>
          (
            await db.query(
              "SELECT nombres,apellidos,tipo_documento,documento,nacimiento::text,telefono,email FROM transporte.usuarios WHERE id=transporte.actor()",
            )
          ).rows[0],
      ),
    ),
  ),
);
compraRouter.post(
  "/reservas",
  ruta(async (req, res) => {
    const p = req.body ?? {};
    const viaje = id(p.viaje_id, "viaje_id"),
      o = entero(p.origen_orden, 0, 10000, "origen_orden"),
      d = entero(p.destino_orden, 1, 10000, "destino_orden");
    if (
      !Array.isArray(p.asiento_ids) ||
      p.asiento_ids.length < 1 ||
      p.asiento_ids.length > 10
    )
      throw new ErrorCompraServidor(
        422,
        "Selecciona entre 1 y 10 asientos.",
        "asiento_ids",
      );
    const asientos = p.asiento_ids.map((v: unknown) => id(v, "asiento_ids"));
    if (new Set(asientos).size !== asientos.length)
      throw new ErrorCompraServidor(
        422,
        "Hay asientos repetidos.",
        "asiento_ids",
      );
    const datos = await conSesion(token(req), async (db) => {
      await db.query("SELECT transporte.compra_detalle($1,$2,$3)", [
        viaje,
        o,
        d,
      ]);
      const rid = (
        await db.query(
          "SELECT transporte.reservar_asientos($1,$2,$3,$4::uuid[]) id",
          [viaje, o, d, asientos],
        )
      ).rows[0].id;
      const r = (
        await db.query("SELECT transporte.compra_resumen($1) datos", [rid])
      ).rows[0].datos;
      return {
        reserva_id: r.reserva_id,
        expires_at: r.expires_at,
        asientos: r.asientos,
      };
    });
    res.status(201).json(datos);
  }),
);
compraRouter.get(
  "/reservas/:id/resumen",
  ruta(async (req, res) =>
    res.json(
      await conSesion(
        token(req),
        async (db) =>
          (
            await db.query("SELECT transporte.compra_resumen($1) datos", [
              id(req.params.id),
            ])
          ).rows[0].datos,
      ),
    ),
  ),
);
compraRouter.get(
  "/reservas/:id/beneficios",
  ruta(async (req, res) =>
    res.json({
      data: await conSesion(
        token(req),
        async (db) =>
          (
            await db.query("SELECT transporte.compra_beneficios($1) datos", [
              id(req.params.id),
            ])
          ).rows[0].datos,
      ),
    }),
  ),
);
export function validarPasajeros(p: any) {
  if (
    !p ||
    !Array.isArray(p.pasajeros) ||
    p.pasajeros.length < 1 ||
    p.pasajeros.length > 10
  )
    throw new ErrorCompraServidor(422, "Completa los pasajeros.", "pasajeros");
  if (
    typeof p.contacto?.email !== "string" ||
    p.contacto.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.contacto.email)
  )
    throw new ErrorCompraServidor(
      422,
      "Correo de contacto no válido.",
      "contacto.email",
    );
  if (
    typeof p.contacto.telefono !== "string" ||
    !/^\+?\d{7,15}$/.test(p.contacto.telefono)
  )
    throw new ErrorCompraServidor(
      422,
      "Teléfono de contacto no válido.",
      "contacto.telefono",
    );
  for (const [i, x] of p.pasajeros.entries()) {
    if (!x || typeof x !== "object")
      throw new ErrorCompraServidor(
        422,
        "Completa el pasajero.",
        `pasajeros.${i}`,
      );
    id(x.reserva_asiento_id, `pasajeros[${i}].reserva_asiento_id`);
    for (const [k, max] of Object.entries({
      nombres: 100,
      apellidos: 100,
      documento: 30,
    }))
      if (typeof x[k] !== "string" || !x[k].trim() || x[k].length > max)
        throw new ErrorCompraServidor(
          422,
          "Completa el dato del pasajero.",
          `pasajeros[${i}].${k}`,
        );
    if (!["CEDULA", "PASAPORTE", "OTRO"].includes(x.tipo_documento))
      throw new ErrorCompraServidor(
        422,
        "Documento no válido.",
        `pasajeros[${i}].tipo_documento`,
      );
    if (x.tipo_documento === "CEDULA" && !/^\d{10}$/.test(x.documento))
      throw new ErrorCompraServidor(
        422,
        "La cédula debe tener 10 dígitos.",
        `pasajeros[${i}].documento`,
      );
    if (x.nacimiento) fecha(x.nacimiento);
    if (
      x.beneficio_codigo !== null &&
      !["NINO", "TERCERA_EDAD", "DISCAPACIDAD"].includes(x.beneficio_codigo)
    )
      throw new ErrorCompraServidor(
        422,
        "Beneficio no válido.",
        `pasajeros[${i}].beneficio_codigo`,
      );
    if (x.respaldo_archivo_id) id(x.respaldo_archivo_id);
    if (
      x.email &&
      (typeof x.email !== "string" ||
        x.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email))
    )
      throw new ErrorCompraServidor(
        422,
        "Correo no válido.",
        `pasajeros[${i}].email`,
      );
    if (
      x.telefono &&
      (typeof x.telefono !== "string" || !/^\+?\d{7,15}$/.test(x.telefono))
    )
      throw new ErrorCompraServidor(
        422,
        "Teléfono no válido.",
        `pasajeros[${i}].telefono`,
      );
  }
}
compraRouter.put(
  "/reservas/:id/pasajeros",
  ruta(async (req, res) => {
    validarPasajeros(req.body);
    res.json({
      data: await conSesion(
        token(req),
        async (db) =>
          (
            await db.query(
              "SELECT transporte.compra_guardar_pasajeros($1,$2::jsonb) datos",
              [id(req.params.id), JSON.stringify(req.body)],
            )
          ).rows[0].datos,
      ),
    });
  }),
);
compraRouter.post(
  "/reservas/:id/cotizacion",
  ruta(async (req, res) =>
    res.status(201).json(
      await conSesion(token(req), async (db) => {
        const rid = id(req.params.id);
        await db.query("SELECT transporte.cotizar($1)", [rid]);
        return (
          await db.query("SELECT transporte.compra_resumen($1) datos", [rid])
        ).rows[0].datos.cotizacion;
      }),
    ),
  ),
);
compraRouter.post(
  "/reservas/:id/aceptar-cotizacion",
  ruta(async (req, res) => {
    await conSesion(token(req), async (db) =>
      db.query("SELECT transporte.aceptar_cotizacion($1,$2)", [
        id(req.params.id),
        entero(req.body?.version, 1, 1000000, "version"),
      ]),
    );
    res.status(204).end();
  }),
);
compraRouter.delete(
  "/reservas/:id",
  ruta(async (req, res) => {
    await conSesion(token(req), async (db) =>
      db.query("SELECT transporte.cancelar_reserva_pendiente($1)", [
        id(req.params.id),
      ]),
    );
    res.status(204).end();
  }),
);
compraRouter.post(
  "/reservas/:id/respaldos",
  express.raw({ type: () => true, limit: "5mb" }),
  ruta(async (req, res) => {
    const rid = id(req.params.id);
    const datos = req.body as Buffer;
    validarArchivo(
      datos,
      String(req.headers["content-type"] ?? "").split(";")[0],
      5 * 1024 * 1024,
      ["image/jpeg", "image/png", "application/pdf"],
    );
    const nombre = nombreSeguro(
      decodeURIComponent(String(req.headers["x-file-name"] ?? "respaldo")),
    );
    const creados: string[] = [];
    const archivo = await conSesion(token(req), async (db) => {
      const r = (
        await db.query("SELECT transporte.compra_resumen($1) datos", [rid])
      ).rows[0].datos;
      if (r.estado !== "PENDIENTE")
        throw new ErrorCompraServidor(409, "La reserva ya no es editable.");
      return guardarArchivo(
        db,
        rid,
        datos,
        nombre,
        String(req.headers["content-type"]).split(";")[0],
        "RESPALDO",
        creados,
      );
    });
    res.status(201).json({ archivo_id: archivo });
  }),
);

const contactos = new Map<string, number>();
compraRouter.post(
  "/contacto",
  ruta(async (req, res) => {
    const p = req.body ?? {};
    for (const [k, max] of Object.entries({
      nombre: 150,
      email: 254,
      asunto: 150,
      mensaje: 4000,
      consentimiento_version: 100,
    }))
      if (typeof p[k] !== "string" || !p[k].trim() || p[k].length > max)
        throw new ErrorCompraServidor(422, "Completa el campo indicado.", k);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
      throw new ErrorCompraServidor(422, "Correo no válido.", "email");
    const ahora = Date.now();
    for (const [k, v] of contactos) if (ahora - v > 60000) contactos.delete(k);
    const clave = req.ip ?? "local";
    if (contactos.has(clave))
      throw new ErrorCompraServidor(
        429,
        "Espera un minuto antes de volver a enviar.",
      );
    contactos.set(clave, ahora);
    const r = await pool.query(
      "SELECT transporte.enviar_contacto($1,$2,$3,$4,$5,$6) id",
      [
        p.cooperativa_id ? id(p.cooperativa_id) : null,
        p.nombre,
        p.email,
        p.asunto,
        p.mensaje,
        p.consentimiento_version,
      ],
    );
    res.status(201).json({ id: r.rows[0].id });
  }),
);

compraRouter.get("/mis-viajes",ruta(async(req,res)=>{
 const q=req.query;
 const seccion=q.seccion??"proximos";
 const estados=["","CONFIRMADA","PAGO_EN_VERIFICACION","FINALIZADO","CANCELADA","REEMBOLSADA","VENCIDA","PENDIENTE_PAGO","RECHAZADA"];
 if(!["proximos","historial"].includes(String(seccion))||!estados.includes(String(q.estado??"")))throw new ErrorCompraServidor(422,"Filtro no válido.");
 const desde=q.desde?fecha(q.desde):"",hasta=q.hasta?fecha(q.hasta):"";
 if(desde&&hasta&&desde>hasta)throw new ErrorCompraServidor(422,"Revisa el rango de fechas.");
 const busqueda=String(q.q??"").trim();
 if(busqueda.length>60)throw new ErrorCompraServidor(422,"La búsqueda admite hasta 60 caracteres.");
 const resultado=await conSesion(token(req),db=>listarViajesPropios(db,{seccion:String(seccion),estado:String(q.estado??""),q:busqueda,desde,hasta,cursor:q.cursor?entero(q.cursor,0,100000,"cursor"):0}));
 res.json(numeroSeguro(resultado));
}));
compraRouter.get("/mis-viajes/:id",ruta(async(req,res)=>{
 const identificador=id(req.params.id);
 const viaje=await conSesion(token(req),async db=>{
  const propia=await db.query("SELECT r.id FROM transporte.reservas r LEFT JOIN transporte.compras c ON c.reserva_id=r.id WHERE r.cliente_id=transporte.actor() AND(r.id=$1 OR c.id=$1)",[identificador]);
  if(!propia.rowCount)throw new ErrorCompraServidor(404,"Reserva no disponible.");
  const d=conservarDatosCompra((await db.query("SELECT transporte.consultar_pago_cliente($1) datos",[propia.rows[0].id])).rows[0].datos as DatosPago);
  const estado=d.compra?.estado==='CONFIRMADA'?(Date.parse(d.viaje.salida)>Date.now()?'CONFIRMADA':'FINALIZADO'):d.compra?.estado??(d.reserva.estado==='CANCELADA'?'CANCELADA':d.reserva.estado==='VENCIDA'||Date.parse(d.reserva.expires_at)<=Date.now()?'VENCIDA':d.intento?.estado==='EN_REVISION'?'PAGO_EN_VERIFICACION':d.intento?.estado==='RECHAZADO'?'RECHAZADA':'PENDIENTE_PAGO');
  return tarjetaViaje(d,estado);
 });res.json(numeroSeguro(viaje));
}));
