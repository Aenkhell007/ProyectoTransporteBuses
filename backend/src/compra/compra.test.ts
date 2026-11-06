import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import { compraRouter, entero, fecha, id, validarPasajeros } from "./router";

test("consulta: rechaza UUID, enteros y fechas inválidos", () => {
  assert.equal(id(randomUUID()).length, 36);
  for (const valor of [null, "1; DROP TABLE viajes", [], ""])
    assert.throws(() => id(valor));
  for (const valor of [1.1, "1e2", -1, "11", undefined])
    assert.throws(() => entero(valor, 1, 10, "cantidad"));
  assert.equal(entero("2", 1, 10, "cantidad"), 2);
  assert.equal(fecha("2028-02-29"), "2028-02-29");
  assert.throws(() => fecha("2026-02-29"));
});

test("pasajeros: valida estructura, contactos y documentos sin aceptar datos incompletos", () => {
  const datos = () => ({
    contacto: { email: "prueba@example.com", telefono: "+593990000001" },
    pasajeros: [
      {
        reserva_asiento_id: randomUUID(),
        nombres: "Prueba",
        apellidos: "Integración",
        tipo_documento: "CEDULA",
        documento: "1800000000",
        nacimiento: "1990-01-01",
        beneficio_codigo: null,
        respaldo_archivo_id: null,
      },
    ],
  });
  assert.doesNotThrow(() => validarPasajeros(datos()));
  assert.throws(() => validarPasajeros({ ...datos(), pasajeros: [null] }));
  const correo = datos();
  correo.contacto.email = "incorrecto";
  assert.throws(() => validarPasajeros(correo));
  const documento = datos();
  documento.pasajeros[0].documento = "123";
  assert.throws(() => validarPasajeros(documento));
});

test("HTTP: exige sesión, rechaza origen ajeno y responde 422 sin exponer detalles internos", async () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", compraRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  try {
    assert.equal(
      (await fetch(base + `/reservas/${randomUUID()}/resumen`)).status,
      401,
    );
    assert.equal(
      (
        await fetch(base + "/reservas", {
          method: "POST",
          headers: { origin: "https://ajeno.example" },
        })
      ).status,
      403,
    );
    const respuesta = await fetch(base + "/viajes?cantidad=1");
    assert.equal(respuesta.status, 422);
    const cuerpo = await respuesta.json();
    assert.equal(cuerpo.errores_campo[0].campo, "origen_ciudad_id");
    assert.equal(cuerpo.stack, undefined);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  }
});
