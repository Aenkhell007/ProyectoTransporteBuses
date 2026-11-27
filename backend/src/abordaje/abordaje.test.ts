import test from "node:test";
import assert from "node:assert/strict";
import { ErrorAbordaje, estadoError, extraerQr, uuidAbordaje } from "./router";

const QR = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

test("extraerQr acepta el UUID puro o dentro del texto leído", () => {
  assert.equal(extraerQr(QR), QR);
  assert.equal(extraerQr(` ${QR.toUpperCase()} `), QR);
  assert.equal(extraerQr(`https://gran-continental.test/boleto/${QR}`), QR);
});

test("extraerQr rechaza contenido que no es un boleto", () => {
  assert.throws(() => extraerQr("hola"), ErrorAbordaje);
  assert.throws(() => extraerQr(123), ErrorAbordaje);
  assert.throws(() => extraerQr("x".repeat(600)), ErrorAbordaje);
});

test("uuidAbordaje exige un UUID exacto", () => {
  assert.equal(uuidAbordaje(QR, "clave"), QR);
  assert.throws(() => uuidAbordaje(`${QR}x`, "clave"), (e: unknown) => e instanceof ErrorAbordaje && e.status === 422);
});

test("estadoError traduce los códigos de PostgreSQL sin filtrar detalles", () => {
  assert.equal(estadoError({ code: "P0002" }).status, 404);
  assert.equal(estadoError({ code: "42501" }).status, 403);
  assert.equal(estadoError({ code: "23505" }).status, 409);
  assert.equal(estadoError({ code: "23505" }).mensaje, "Este pasajero ya registró su abordaje.");
  assert.equal(estadoError({ code: "P0001" }).status, 409);
  assert.equal(estadoError({ code: "28000" }).status, 401);
  assert.equal(estadoError(new Error("secreto interno")).status, 503);
  assert.ok(!estadoError(new Error("secreto interno")).mensaje.includes("secreto"));
});
