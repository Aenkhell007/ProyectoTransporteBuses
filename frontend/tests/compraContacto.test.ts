// Vista 1.1: formulario de contacto. El servidor vuelve a validar en enviar_contacto().
import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTACTO_VACIO,
  LIMITES_CONTACTO,
  validarContacto,
} from "../src/features/compra/contacto.ts";

const valido = {
  nombre: "Persona de Prueba",
  email: "persona@example.com",
  asunto: "Equipaje",
  mensaje: "Consulta sobre equipaje.",
  consentimiento: true,
};

test("un formulario completo no tiene errores", () => {
  assert.deepEqual(validarContacto(valido), {});
});

test("un formulario vacío marca los cinco campos", () => {
  assert.deepEqual(Object.keys(validarContacto(CONTACTO_VACIO)).sort(), [
    "asunto",
    "consentimiento",
    "email",
    "mensaje",
    "nombre",
  ]);
});

test("solo espacios cuenta como vacío", () => {
  const e = validarContacto({ ...valido, nombre: "   ", mensaje: "  " });
  assert.ok(e.nombre);
  assert.ok(e.mensaje);
});

test("el correo debe tener usuario, arroba y dominio", () => {
  for (const email of ["persona", "persona@", "@example.com", "per sona@example.com", "persona@example"]) {
    assert.ok(validarContacto({ ...valido, email }).email, email);
  }
});

test(`el mensaje admite hasta ${LIMITES_CONTACTO.mensaje} caracteres`, () => {
  const limite = "a".repeat(LIMITES_CONTACTO.mensaje);
  assert.equal(validarContacto({ ...valido, mensaje: limite }).mensaje, undefined);
  assert.ok(validarContacto({ ...valido, mensaje: limite + "a" }).mensaje);
});

test("sin aceptar la política de privacidad no se envía", () => {
  assert.match(validarContacto({ ...valido, consentimiento: false }).consentimiento ?? "", /privacidad/);
});

test("validar no modifica lo escrito", () => {
  const formulario = { ...valido, email: "mal" };
  const copia = { ...formulario };
  validarContacto(formulario);
  assert.deepEqual(formulario, copia);
});
