import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";

test(
  "pagos reales: cotización, permisos, rechazo, reenvío, aprobación y documento; todo se revierte",
  { skip: process.env.PROBAR_PAGOS_DB !== "1" },
  async () => {
    config({ path: resolve(__dirname, "../../.env"), quiet: true });
    const carpeta = resolve(__dirname, "../../conexion-bd");
    config({ path: resolve(carpeta, ".env"), quiet: true });
    assert.ok(
      process.env.DIRECT_URL,
      "Falta DIRECT_URL para la prueba explícita",
    );
    const url = new URL(process.env.DIRECT_URL);
    for (const k of [
      "sslmode",
      "sslcert",
      "sslrootcert",
      "sslkey",
      "sslidentity",
      "sslaccept",
      "schema",
    ])
      url.searchParams.delete(k);
    const ca = process.env.DB_SSL_CA_FILE;
    const pool = new Pool({
      connectionString: url.toString(),
      ssl: {
        rejectUnauthorized: true,
        ...(ca ? { ca: readFileSync(resolve(carpeta, ca), "utf8") } : {}),
      },
      connectionTimeoutMillis: 10000,
    });
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      // Preflight del SQL nuevo dentro de la misma transacción: no despliega ni deja fixtures.
      const migracion = readFileSync(
        resolve(
          carpeta,
          "prisma/migrations/20261104_consulta_pago_cliente/migration.sql",
        ),
        "utf8",
      );
      await db.query(
        migracion
          .replace(/CREATE FUNCTION/g, "CREATE OR REPLACE FUNCTION")
          .replace(/^BEGIN;\s*/, "")
          .replace(/COMMIT;\s*$/, ""),
      );
      await db.query("GRANT transporte_runtime TO CURRENT_USER"); // Solo en esta transacción; ROLLBACK restaura la membresía.
      const marca = randomUUID();
      const insertar = async (
        tabla: string,
        columnas: string,
        valores: unknown[],
      ) => {
        const r = await db.query(
          `INSERT INTO transporte.${tabla}(${columnas}) VALUES(${valores.map((_, i) => `$${i + 1}`).join(",")}) RETURNING id`,
          valores,
        );
        return r.rows[0].id as string;
      };
      async function usuario(rol?: string) {
        const id = await insertar(
          "usuarios",
          "nombres,apellidos,tipo_documento,documento,email,email_verificado_at",
          [
            "Prueba",
            "Pagos",
            "OTRO",
            randomUUID().slice(0, 30),
            `${randomUUID()}@example.com`,
            new Date(),
          ],
        );
        const token = randomBytes(32).toString("base64url"),
          hash = createHash("sha256").update(token).digest("hex");
        await db.query(
          "INSERT INTO transporte.sesiones(usuario_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')",
          [id, hash],
        );
        if (rol)
          await db.query(
            "INSERT INTO transporte.usuario_roles_globales(usuario_id,rol_id) SELECT $1,id FROM transporte.roles WHERE codigo=$2",
            [id, rol],
          );
        return { id, hash, token };
      }
      const admin = await usuario("ADMIN_SISTEMA"),
        cliente = await usuario(),
        otro = await usuario();
      await db.query("SELECT transporte.abrir_contexto($1)", [admin.hash]);
      const coop = await insertar("cooperativas", "nombre,razon_social,ruc", [
        "PRUEBA ROLLBACK",
        "Prueba técnica",
        marca.slice(0, 20),
      ]);
      const ciudad1 = await insertar("ciudades", "nombre,provincia", [
          marca.slice(0, 20),
          "Prueba",
        ]),
        ciudad2 = await insertar("ciudades", "nombre,provincia", [
          marca.slice(0, 20) + "D",
          "Prueba",
        ]);
      const t1 = await insertar("terminales", "ciudad_id,nombre", [
          ciudad1,
          "Origen",
        ]),
        t2 = await insertar("terminales", "ciudad_id,nombre", [
          ciudad2,
          "Destino",
        ]);
      const ruta = await insertar("rutas", "cooperativa_id,nombre", [
        coop,
        "Ruta prueba",
      ]);
      for (const [terminal, orden, minutos] of [
        [t1, 1, 0],
        [t2, 2, 60],
      ])
        await insertar(
          "ruta_paradas",
          "cooperativa_id,ruta_id,terminal_id,orden,minutos_desde_origen",
          [coop, ruta, terminal, orden, minutos],
        );
      const grupo = await insertar("grupos_bus", "cooperativa_id,nombre", [
        coop,
        "Confort",
      ]);
      const frecuencia = await insertar(
        "frecuencias",
        "cooperativa_id,ruta_id,codigo,hora_salida,resolucion_ant,tipo_viaje",
        [coop, ruta, "PRUEBA", "06:00", "PRUEBA", "DIRECTO"],
      );
      await insertar(
        "frecuencia_grupo",
        "cooperativa_id,frecuencia_id,grupo_id",
        [coop, frecuencia, grupo],
      );
      const bus = await insertar(
        "buses",
        "cooperativa_id,grupo_id,unidad,placa,chasis,carroceria",
        [coop, grupo, "PRUEBA", marca.slice(0, 20), "Prueba", "Prueba"],
      );
      const plano = await insertar(
        "planos",
        "cooperativa_id,bus_id,numero_version,nombre,pisos",
        [coop, bus, 1, "Prueba", 1],
      );
      const clase = (
        await db.query(
          "SELECT id FROM transporte.clases_asiento WHERE codigo='NORMAL'",
        )
      ).rows[0].id;
      const asiento = await insertar(
        "plano_celdas",
        "cooperativa_id,plano_id,piso,fila,columna,tipo,codigo,clase_id",
        [coop, plano, 1, 1, 1, "ASIENTO", "1A", clase],
      );
      const asiento2 = await insertar(
        "plano_celdas",
        "cooperativa_id,plano_id,piso,fila,columna,tipo,codigo,clase_id",
        [coop, plano, 1, 1, 2, "ASIENTO", "1B", clase],
      );
      await db.query(
        "UPDATE transporte.planos SET publicado=true WHERE id=$1",
        [plano],
      );
      const impuesto = (
        await db.query(
          "SELECT id FROM transporte.impuestos WHERE codigo='IVA0_TRANSPORTE'",
        )
      ).rows[0].id;
      await insertar(
        "tarifas",
        "cooperativa_id,frecuencia_id,grupo_id,clase_id,origen_orden,destino_orden,precio_centavos,impuesto_id,vigencia",
        [coop, frecuencia, grupo, clase, 1, 2, 2345, impuesto, "[2020-01-01,)"],
      );
      const viaje = await insertar(
        "viajes",
        "cooperativa_id,frecuencia_id,bus_id,plano_id,salida,llegada,liberacion_bus,estado",
        [
          coop,
          frecuencia,
          bus,
          plano,
          new Date(Date.now() + 86400000),
          new Date(Date.now() + 90000000),
          new Date(Date.now() + 93600000),
          "PUBLICADO",
        ],
      );
      const banco = (
        await db.query(
          "SELECT id FROM transporte.bancos WHERE codigo='PICHINCHA'",
        )
      ).rows[0].id;
      const cuenta = await insertar(
        "cuentas_bancarias",
        "cooperativa_id,banco_id,tipo,numero,titular,documento_titular,activa",
        [coop, banco, "CORRIENTE", "SOLO-PRUEBA", "Prueba", "PRUEBA", true],
      );
      await db.query(
        "INSERT INTO transporte.cooperativa_metodos_pago(cooperativa_id,metodo_id,habilitado) SELECT $1,id,true FROM transporte.metodos_pago WHERE codigo='BANCO'",
        [coop],
      );
      await insertar(
        "politica_comprobantes",
        "cooperativa_id,referencia_obligatoria",
        [coop, true],
      );
      async function sesion(hash: string) {
        await db.query("RESET ROLE");
        await db.query("SET LOCAL ROLE transporte_runtime");
        await db.query("SELECT transporte.abrir_contexto($1)", [hash]);
      }
      async function rechaza(sql: string, params: unknown[], code: string) {
        await db.query("SAVEPOINT invalido");
        try {
          await assert.rejects(db.query(sql, params), { code });
        } finally {
          await db.query("ROLLBACK TO SAVEPOINT invalido");
        }
      }
      await sesion(cliente.hash);
      const reserva = (
        await db.query(
          "SELECT transporte.reservar_asientos($1,1,2,$2::uuid[]) AS id",
          [viaje, [asiento]],
        )
      ).rows[0].id;
      const ra = (
        await db.query(
          "SELECT id FROM transporte.reserva_asientos WHERE reserva_id=$1",
          [reserva],
        )
      ).rows[0].id;
      await db.query("SELECT transporte.guardar_pasajero($1,$2::jsonb)", [
        ra,
        JSON.stringify({
          nombres: "Prueba",
          apellidos: "Pasajero",
          tipoDocumento: "OTRO",
          documento: "PRUEBA",
          nacimiento: "1990-01-01",
        }),
      ]);
      await db.query("SELECT transporte.cotizar($1)", [reserva]);
      await db.query("SELECT transporte.aceptar_cotizacion($1,1)", [reserva]);
      const consultar = async () =>
        (
          await db.query(
            "SELECT transporte.consultar_pago_cliente($1) AS datos",
            [reserva],
          )
        ).rows[0].datos;
      assert.equal((await consultar()).reserva.total_centavos, 2345);
      assert.equal((await consultar()).cuentas[0].numero, "SOLO-PRUEBA");
      await sesion(otro.hash);
      await rechaza(
        "SELECT transporte.consultar_pago_cliente($1)",
        [reserva],
        "42501",
      );
      await sesion(cliente.hash);
      const clave = randomUUID();
      const intento = (
        await db.query(
          "SELECT transporte.crear_intento_pago($1,'BANCO',$2,$3) AS id",
          [reserva, cuenta, clave],
        )
      ).rows[0].id;
      assert.equal(
        (
          await db.query(
            "SELECT transporte.crear_intento_pago($1,'BANCO',$2,$3) AS id",
            [reserva, cuenta, clave],
          )
        ).rows[0].id,
        intento,
      );
      async function archivo(categoria: string, mime: string) {
        return insertar(
          "archivos",
          "propietario_id,cooperativa_id,categoria,ruta_privada,mime,bytes,sha256,validado_servidor",
          [
            categoria === "DOCUMENTO" ? admin.id : cliente.id,
            coop,
            categoria,
            `prueba/${randomUUID()}`,
            mime,
            100,
            randomBytes(32).toString("hex"),
            true,
          ],
        );
      }
      const aid = await archivo("COMPROBANTE", "image/png");
      await rechaza(
        "SELECT transporte.registrar_comprobante($1,$2,'')",
        [intento, aid],
        "P0001",
      );
      const comprobante = (
        await db.query(
          "SELECT transporte.registrar_comprobante($1,$2,'PRUEBA') AS id",
          [intento, aid],
        )
      ).rows[0].id;
      assert.equal((await consultar()).intento.estado, "EN_REVISION");
      assert.equal((await consultar()).documento, null);
      await rechaza(
        "SELECT transporte.decidir_comprobante($1,true,'',1)",
        [comprobante],
        "42501",
      );
      await sesion(admin.hash);
      await db.query(
        "SELECT transporte.decidir_comprobante($1,false,'No legible',1)",
        [comprobante],
      );
      await sesion(cliente.hash);
      assert.equal((await consultar()).comprobante.motivo, "No legible");
      const iid2 = (
        await db.query(
          "SELECT transporte.crear_intento_pago($1,'BANCO',$2,$3) AS id",
          [reserva, cuenta, randomUUID()],
        )
      ).rows[0].id;
      const a2 = await archivo("COMPROBANTE", "application/pdf");
      const c2 = (
        await db.query(
          "SELECT transporte.registrar_comprobante($1,$2,'REENVIO') AS id",
          [iid2, a2],
        )
      ).rows[0].id;
      await sesion(admin.hash);
      await rechaza(
        "SELECT transporte.decidir_comprobante($1,true,'',2)",
        [c2],
        "P0001",
      );
      const compra = (
        await db.query(
          "SELECT transporte.decidir_comprobante($1,true,'',1) AS id",
          [c2],
        )
      ).rows[0].id;
      assert.equal((await consultar()).documento.estado, "PENDIENTE_EMISION");
      const pdf = await archivo("DOCUMENTO", "application/pdf");
      await db.query("SELECT transporte.marcar_boleto_emitido($1,$2)", [
        compra,
        pdf,
      ]);
      await sesion(cliente.hash);
      assert.equal((await consultar()).documento.estado, "LISTO");
      assert.equal((await consultar()).compra.totalPagadoCentavos, 2345);
      assert.equal(
        (
          await db.query(
            "SELECT (transporte.archivo_pago_autorizado($1,$2)).id AS id",
            [reserva, pdf],
          )
        ).rows[0].id,
        pdf,
      );
      await sesion(otro.hash);
      await rechaza(
        "SELECT transporte.archivo_pago_autorizado($1,$2)",
        [reserva, pdf],
        "42501",
      );

      // Segunda reserva: HTTP real -> middleware -> SQL con RLS -> archivos privados -> PDF.
      await sesion(cliente.hash);
      const rid = (
        await db.query(
          "SELECT transporte.reservar_asientos($1,1,2,$2::uuid[]) AS id",
          [viaje, [asiento2]],
        )
      ).rows[0].id;
      const ra2 = (
        await db.query(
          "SELECT id FROM transporte.reserva_asientos WHERE reserva_id=$1",
          [rid],
        )
      ).rows[0].id;
      await db.query("SELECT transporte.guardar_pasajero($1,$2::jsonb)", [
        ra2,
        JSON.stringify({
          nombres: "Prueba HTTP",
          apellidos: "Pasajero",
          tipoDocumento: "OTRO",
          documento: "PRUEBA-HTTP",
          nacimiento: "1990-01-01",
        }),
      ]);
      await db.query("SELECT transporte.cotizar($1)", [rid]);
      await db.query("SELECT transporte.aceptar_cotizacion($1,1)", [rid]);
      const { mkdtemp, rm } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const temporal = await mkdtemp(resolve(tmpdir(), "pagos-http-"));
      process.env.PAGOS_ARCHIVOS_DIR = temporal;
      const express = (await import("express")).default,
        cookieParser = (await import("cookie-parser")).default;
      const { pool: apiPool } = await import("../database.js");
      const original = apiPool.connect;
      let perderRespuestaCommit = false,
        savepointActivo = false;
      // Mantiene la transacción externa de fixtures: cada request usa su savepoint y sesión auténtica.
      apiPool.connect = (async () => ({
        query: async (sql: string, params?: unknown[]) => {
          if (sql === "BEGIN") {
            savepointActivo = true;
            return db.query("SAVEPOINT peticion_http");
          }
          if (sql === "COMMIT") {
            const resultado = await db.query("RELEASE SAVEPOINT peticion_http");
            savepointActivo = false;
            if (perderRespuestaCommit) {
              perderRespuestaCommit = false;
              throw new Error("Respuesta de COMMIT perdida: solo prueba");
            }
            return resultado;
          }
          if (sql === "ROLLBACK")
            return savepointActivo
              ? db.query("ROLLBACK TO SAVEPOINT peticion_http")
              : { rows: [] };
          return db.query(sql, params);
        },
        release: () => {},
      })) as typeof apiPool.connect;
      const { pagosRouter } = await import("./router.js");
      const app = express();
      app.use(express.json());
      app.use(cookieParser());
      app.use("/api", pagosRouter);
      const servidor = app.listen(0, "127.0.0.1");
      await new Promise<void>((r) => servidor.once("listening", r));
      const direccion = servidor.address();
      assert.ok(direccion && typeof direccion !== "string");
      const base = `http://127.0.0.1:${direccion.port}/api`;
      async function peticion(path: string, token: string, body?: unknown) {
        return fetch(base + path, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            cookie: `transporte_sesion=${token}`,
            origin: process.env.FRONTEND_URL ?? "http://127.0.0.1:5173",
            ...(body === undefined
              ? {}
              : { "content-type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
      }
      try {
        assert.equal(
          (await peticion(`/reservas/${rid}/pago`, otro.token)).status,
          404,
        );
        assert.equal(
          (await peticion(`/reservas/${rid}/boleto/qr`, cliente.token)).status,
          409,
        );
        const intentoRespuesta = await peticion(
          `/reservas/${rid}/intentos-pago`,
          cliente.token,
          { cuentaId: cuenta, clave: randomUUID() },
        );
        assert.equal(intentoRespuesta.status, 201);
        const iid = (await intentoRespuesta.json()).id;
        const qr = (await import("qrcode")).default;
        const png = await qr.toBuffer("COMPROBANTE DE PRUEBA");
        const subir = () =>
          fetch(
            `${base}/reservas/${rid}/comprobantes?intento_id=${iid}&referencia=HTTP`,
            {
              method: "POST",
              headers: {
                cookie: `transporte_sesion=${cliente.token}`,
                origin: process.env.FRONTEND_URL ?? "http://127.0.0.1:5173",
                "content-type": "image/png",
                "x-file-name": "prueba.png",
              },
              body: new Uint8Array(png),
            },
          );
        const carga = await subir();
        assert.equal(carga.status, 201);
        const cid = (await carga.json()).id;
        assert.equal(
          (await (await subir()).json()).id,
          cid,
          "reintentar la misma carga no crea otro comprobante",
        );
        assert.equal(
          (await peticion(`/reservas/${rid}/boleto/qr`, cliente.token)).status,
          409,
        );
        assert.equal(
          (
            await peticion(
              `/pagos/comprobantes/${cid}/revision`,
              cliente.token,
              { aprobar: true, motivo: "", version: 1 },
            )
          ).status,
          404,
        );
        perderRespuestaCommit = true;
        const decision = await peticion(
          `/pagos/comprobantes/${cid}/revision`,
          admin.token,
          { aprobar: true, motivo: "", version: 1 },
        );
        assert.equal(
          decision.status,
          503,
          JSON.stringify(await decision.clone().json()),
        );
        const datos = await (
          await peticion(`/reservas/${rid}/pago`, cliente.token)
        ).json();
        assert.equal(datos.documento.estado, "LISTO");
        const documento = await peticion(
          `/reservas/${rid}/archivos/${datos.documento.archivoId}`,
          cliente.token,
        );
        assert.equal(documento.status, 200);
        assert.equal(
          Buffer.from(await documento.arrayBuffer())
            .subarray(0, 5)
            .toString(),
          "%PDF-",
        );
        assert.equal(
          (
            await peticion(
              `/reservas/${rid}/archivos/${datos.documento.archivoId}`,
              otro.token,
            )
          ).status,
          404,
        );
        assert.equal(
          (await peticion(`/reservas/${rid}/boleto/qr`, cliente.token)).status,
          200,
        );
        assert.equal(
          (
            await peticion(`/pagos/comprobantes/${cid}/revision`, admin.token, {
              aprobar: true,
              motivo: "",
              version: 1,
            })
          ).status,
          200,
          "la decisión repetida es idempotente",
        );
      } finally {
        await new Promise<void>((r, e) =>
          servidor.close((err) => (err ? e(err) : r())),
        );
        apiPool.connect = original;
        await apiPool.end();
        assert.ok(temporal.startsWith(resolve(tmpdir(), "pagos-http-")));
        await rm(temporal, { recursive: true, force: true });
      }
    } finally {
      await db.query("ROLLBACK");
      db.release();
      await pool.end();
    }
  },
);
