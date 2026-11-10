import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  validarArchivo,
  referenciaValida,
  nombreSeguro,
  uuid,
} from "./validacion";
import { generarBoleto } from "./boleto";
import { conservarDatosCompra } from "./datos";
import type { DatosPago } from "../../../shared/pagos";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

test("rechaza archivo vacío, sobredimensionado y MIME que no coincide con el contenido", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(
    validarArchivo(png, "image/png", 100, ["image/png"]),
    "image/png",
  );
  assert.throws(
    () => validarArchivo(Buffer.alloc(0), "image/png", 100, ["image/png"]),
    { status: 422 },
  );
  assert.throws(() => validarArchivo(png, "image/png", 7, ["image/png"]), {
    status: 413,
  });
  assert.throws(
    () => validarArchivo(png, "application/pdf", 100, ["application/pdf"]),
    { status: 415 },
  );
  assert.throws(
    () => validarArchivo(png, "image/png", 100, ["application/pdf"]),
    { status: 415 },
  );
  assert.throws(
    () =>
      validarArchivo(Buffer.from("%PDF- incompleto"), "application/pdf", 100, [
        "application/pdf",
      ]),
    { status: 415 },
  );
});
test("valida IDs, referencia obligatoria y nombre seguro", () => {
  const id = randomUUID();
  assert.equal(uuid(id), id);
  assert.throws(() => uuid("../reserva"), { status: 422 });
  assert.equal(referenciaValida("  ABC  ", true), "ABC");
  assert.equal(referenciaValida(undefined, false), "");
  assert.throws(() => referenciaValida("", true), { status: 422 });
  assert.throws(() => referenciaValida("a".repeat(121), false), {
    status: 422,
  });
  assert.throws(() => referenciaValida("A\nB", false), { status: 422 });
  assert.ok(!nombreSeguro("../../archivo.pdf").includes("/"));
});
test("no emite un PDF de una compra sin confirmar", async () => {
  await assert.rejects(
    generarBoleto({ compra: null } as DatosPago),
    /no emitible/,
  );
});

// Solo para QA del generador: estos valores no alimentan las vistas ni se insertan en la base.
export function datosPrueba(): DatosPago {
  return {
    reserva: {
      id: randomUUID(),
      estado: "CONFIRMADA",
      expires_at: new Date().toISOString(),
      cantidad: 2,
      total_centavos: 4760,
      cotizacion_version: 1,
      aceptada_version: 1,
    },
    viaje: {
      salida: "2026-12-10T11:00:00Z",
      llegada: "2026-12-10T19:30:00Z",
      origen: "Quito",
      destino: "Guayaquil",
      terminalOrigen: "Quitumbe",
      terminalDestino: "Terminal Terrestre",
      cooperativa: "PRUEBA TÉCNICA · NO VÁLIDO PARA VIAJAR",
      unidad: "018",
      placa: "PRUEBA",
      chasis: "Prueba",
      carroceria: "Prueba",
      servicio: "Ejecutivo",
      pisos: 2,
    },
    cotizacion: {
      base_centavos: 5600,
      descuento_centavos: 840,
      servicio_centavos: 0,
      subtotal_neto_centavos: 4760,
      iva_centavos: 0,
      total_centavos: 4760,
    },
    pasajeros: [
      {
        nombre: "Pasajero de prueba Uno",
        documento: "PRUEBA-1",
        categoria: "Adulto",
        asiento: "U8",
        piso: 2,
        tarifaCentavos: 2800,
        descuentoCentavos: 0,
        servicioCentavos: 0,
        ivaCentavos: 0,
        impuestoBp: 0,
      },
      {
        nombre: "Pasajero de prueba Dos",
        documento: "PRUEBA-2",
        categoria: "Niño",
        asiento: "U9",
        piso: 2,
        tarifaCentavos: 2800,
        descuentoCentavos: 840,
        servicioCentavos: 0,
        ivaCentavos: 0,
        impuestoBp: 0,
      },
    ],
    cuentas: [],
    metodos: [],
    politica: null,
    intento: null,
    comprobante: null,
    compra: {
      id: randomUUID(),
      codigo: randomUUID(),
      estado: "CONFIRMADA",
      totalPagadoCentavos: 4760,
      viajeSnapshot: {},
    },
    documento: {
      id: randomUUID(),
      qrId: randomUUID(),
      estado: "PENDIENTE_EMISION",
      archivoId: null,
    },
  };
}
test("PDF real con QR y contenido imprimible", async () => {
  const pdf = await generarBoleto(datosPrueba());
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.includes(Buffer.from("%%EOF")));
  if (process.env.PDF_PAGOS_QA) {
    const destino = resolve(process.env.PDF_PAGOS_QA);
    await mkdir(destino, { recursive: true });
    await writeFile(resolve(destino, "boleto-prueba.pdf"), pdf);
  }
});
test("API rechaza sesiones ausentes y solicitudes de otro origen antes de consultar PostgreSQL", async () => {
  process.env.DATABASE_URL ??= "postgresql://localhost/prueba_sin_conexion";
  const express = (await import("express")).default,
    cookieParser = (await import("cookie-parser")).default;
  const { pagosRouter } = await import("./router.js");
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", pagosRouter);
  const servidor = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => servidor.once("listening", () => r()));
  const address = servidor.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  try {
    assert.equal(
      (await fetch(`${base}/reservas/${randomUUID()}/pago`)).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/pagos/comprobantes/${randomUUID()}/revision`, {
          method: "POST",
          headers: {
            cookie: `transporte_sesion=${"x".repeat(43)}`,
            origin: "https://otro.example",
            "content-type": "application/json",
          },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/reservas/invalida/intentos-pago`, {
          method: "POST",
          headers: {
            cookie: `transporte_sesion=${"x".repeat(43)}`,
            "content-type": "application/json",
          },
          body: "{}",
        })
      ).status,
      422,
    );
  } finally {
    await new Promise<void>((r, e) =>
      servidor.close((err) => (err ? e(err) : r())),
    );
    const { pool } = await import("../database.js");
    await pool.end();
  }
});

test("la confirmación conserva los datos del servicio vendido frente a ediciones del catálogo", () => {
  const datos = datosPrueba();
  datos.compra!.viajeSnapshot = {
    bus: { placa: "PLACA-VENDIDA", unidad: "UNIDAD-VENDIDA" },
    terminalOrigen: { ciudad: "CIUDAD-VENDIDA" },
  };
  const conservados = conservarDatosCompra(datos);
  assert.equal(conservados.viaje.placa, "PLACA-VENDIDA");
  assert.equal(conservados.viaje.origen, "CIUDAD-VENDIDA");
  assert.equal(conservados.viaje.destino, datos.viaje.destino);
});
