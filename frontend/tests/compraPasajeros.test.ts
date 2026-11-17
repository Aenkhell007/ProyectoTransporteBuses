// Vista 4: validación de las fichas de pasajeros. La vista 14 (venta en oficina) usa las mismas funciones.
import test from "node:test";
import assert from "node:assert/strict";
import {
  esCedulaValida,
  esTelefonoValido,
  fichaAPasajero,
  fichaVacia,
  validarFicha,
  validarFichas,
  type FichaPasajero,
} from "../src/features/compra/pasajeros.ts";
import type { BeneficioVigente } from "../src/types/compra/reserva.ts";

const HOY = "2026-11-16";
const SIN_BENEFICIOS: BeneficioVigente[] = [];

// Pasaporte para no escribir cédulas en el repositorio.
const persona = (asiento: string, extra: Partial<FichaPasajero> = {}): FichaPasajero => ({
  ...fichaVacia(asiento),
  nombres: "Pasajero",
  apellidos: "De Prueba",
  tipo_documento: "PASAPORTE",
  documento: `PRUEBA${asiento}`,
  nacimiento: "1990-05-10",
  ...extra,
});
const comprador = (asiento: string) =>
  persona(asiento, { telefono: "+593 99 000 0000", email: "comprador@example.com" });

const beneficio = (extra: Partial<BeneficioVigente>): BeneficioVigente => ({
  codigo: "DISCAPACIDAD",
  nombre: "Persona con discapacidad",
  activo: true,
  descuento_bp: null,
  edad_min: null,
  edad_max_exclusiva: null,
  condiciones: null,
  requiere_respaldo: true,
  ...extra,
});

test("el comprador necesita teléfono y correo", () => {
  const e = validarFicha(persona("A1"), true, HOY, SIN_BENEFICIOS);
  assert.ok(e.telefono);
  assert.ok(e.email);
  assert.deepEqual(validarFicha(comprador("A1"), true, HOY, SIN_BENEFICIOS), {});
});

test("un acompañante sin teléfono ni correo es válido", () => {
  assert.deepEqual(validarFicha(persona("A2"), false, HOY, SIN_BENEFICIOS), {});
});

test("si el acompañante escribe un contacto, se valida", () => {
  const e = validarFicha(persona("A2", { telefono: "12", email: "sin-arroba" }), false, HOY, SIN_BENEFICIOS);
  assert.ok(e.telefono);
  assert.ok(e.email);
});

test("nombres, apellidos y documento son obligatorios", () => {
  const e = validarFicha(fichaVacia("A1"), false, HOY, SIN_BENEFICIOS);
  assert.ok(e.nombres);
  assert.ok(e.apellidos);
  assert.ok(e.documento);
  assert.ok(e.nacimiento);
});

test("una fecha de nacimiento futura da error", () => {
  const e = validarFicha(persona("A1", { nacimiento: "2026-11-17" }), false, HOY, SIN_BENEFICIOS);
  assert.match(e.nacimiento ?? "", /futura/);
  assert.equal(validarFicha(persona("A1", { nacimiento: HOY }), false, HOY, SIN_BENEFICIOS).nacimiento, undefined);
});

test("dos fichas para el mismo asiento se rechazan", () => {
  const { general } = validarFichas([comprador("A1"), persona("A1")], ["A1", "A2"], HOY, SIN_BENEFICIOS);
  assert.match(general ?? "", /mismo asiento/);
});

test("falta una ficha para un asiento reservado", () => {
  const { general } = validarFichas([comprador("A1")], ["A1", "A2"], HOY, SIN_BENEFICIOS);
  assert.match(general ?? "", /una ficha por cada asiento/);
});

test("el mismo documento en dos fichas marca la segunda", () => {
  const { porFicha, general } = validarFichas(
    [comprador("A1"), persona("A2", { documento: "PRUEBAA1" })],
    ["A1", "A2"],
    HOY,
    SIN_BENEFICIOS,
  );
  assert.equal(general, null);
  assert.equal(porFicha[0].documento, undefined);
  assert.match(porFicha[1].documento ?? "", /pasajero 1/);
});

test("un beneficio sin regla vigente muestra aviso y no se acepta", () => {
  const ficha = persona("A1", { beneficio: "TERCERA_EDAD" });
  assert.match(validarFicha(ficha, false, HOY, SIN_BENEFICIOS).beneficio ?? "", /regla vigente/);
  const inactivo = [beneficio({ codigo: "TERCERA_EDAD", activo: false, requiere_respaldo: false })];
  assert.match(validarFicha(ficha, false, HOY, inactivo).beneficio ?? "", /regla vigente/);
});

test("un beneficio que exige respaldo pide el archivo", () => {
  const reglas = [beneficio({})];
  const sinArchivo = persona("A1", { beneficio: "DISCAPACIDAD" });
  assert.ok(validarFicha(sinArchivo, false, HOY, reglas).respaldo);
  const conArchivo = { ...sinArchivo, respaldo_archivo_id: "archivo-1" };
  assert.deepEqual(validarFicha(conArchivo, false, HOY, reglas), {});
});

test("al guardar se recortan espacios y sin beneficio no se envía respaldo", () => {
  const datos = fichaAPasajero(
    persona("A1", { nombres: "  Ana  ", telefono: " ", respaldo_archivo_id: "archivo-1" }),
  );
  assert.equal(datos.nombres, "Ana");
  assert.equal(datos.telefono, null);
  assert.equal(datos.beneficio_codigo, null);
  assert.equal(datos.respaldo_archivo_id, null);
});

test("el pasaporte acepta de 5 a 20 letras o números", () => {
  assert.ok(validarFicha(persona("A1", { documento: "AB12" }), false, HOY, SIN_BENEFICIOS).documento);
  assert.equal(validarFicha(persona("A1", { documento: "AB123" }), false, HOY, SIN_BENEFICIOS).documento, undefined);
  assert.ok(validarFicha(persona("A1", { documento: "AB-123" }), false, HOY, SIN_BENEFICIOS).documento);
});

// Dígito verificador por módulo 10, escrito aparte de pasajeros.ts para generar cédulas de prueba.
function digitoVerificador(prefijo: string): string {
  const suma = [...prefijo].reduce((total, c, i) => {
    const d = Number(c) * (i % 2 === 0 ? 2 : 1);
    return total + (d > 9 ? d - 9 : d);
  }, 0);
  return String((10 - (suma % 10)) % 10);
}
const generada = (prefijo: string) => prefijo + digitoVerificador(prefijo);

test("la cédula acepta las generadas por el algoritmo y rechaza el dígito verificador mal", () => {
  for (const prefijo of ["170000000", "180000001", "240000003", "300000002"]) {
    const cedula = generada(prefijo);
    assert.equal(esCedulaValida(cedula), true, cedula);
    const otro = String((Number(cedula[9]) + 1) % 10);
    assert.equal(esCedulaValida(prefijo + otro), false, prefijo + otro);
  }
});

test("la cédula rechaza longitud, provincia 00 y 25 y tercer dígito 6", () => {
  assert.equal(esCedulaValida("123456789"), false);
  assert.equal(esCedulaValida("12345678ab"), false);
  assert.equal(esCedulaValida(generada("000000000")), false);
  assert.equal(esCedulaValida(generada("250000000")), false);
  assert.equal(esCedulaValida(generada("176000000")), false);
});

test("para cada prefijo de cédula solo un dígito verificador es válido", () => {
  for (const prefijo of ["170000000", "180000001", "300000002"]) {
    const aceptados = [..."0123456789"].filter((d) => esCedulaValida(prefijo + d));
    assert.equal(aceptados.length, 1, `prefijo ${prefijo}`);
  }
});

test("el teléfono admite espacios, guiones y prefijo internacional", () => {
  assert.equal(esTelefonoValido("+593 99-000-0000"), true);
  assert.equal(esTelefonoValido("032 000 000"), true);
  assert.equal(esTelefonoValido("123456"), false);
  assert.equal(esTelefonoValido("09A0000000"), false);
});
