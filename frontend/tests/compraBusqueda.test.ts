// Vista 1: formulario de búsqueda y fechas en hora de Ecuador.
import test from "node:test";
import assert from "node:assert/strict";
import {
  LIMITE_PASAJEROS,
  criteriosAUrl,
  formularioDesdeUrl,
  validarBusqueda,
} from "../src/features/compra/busqueda.ts";
import {
  edadEnFecha,
  esFechaValida,
  formatearDuracion,
  hoyEnEcuador,
} from "../src/features/compra/fechas.ts";

const CIUDADES = new Set(["AMBATO", "QUITO", "GUAYAQUIL"]);
const HOY = "2026-11-16";
const valido = { origen: "AMBATO", destino: "QUITO", fecha: HOY, cantidad: "2" };

test("una búsqueda válida devuelve los criterios con la cantidad como número", () => {
  const { criterios, errores } = validarBusqueda(valido, CIUDADES, HOY);
  assert.deepEqual(errores, {});
  assert.deepEqual(criterios, { origen: "AMBATO", destino: "QUITO", fecha: HOY, cantidad: 2 });
});

test("origen igual a destino da error en el destino y no consulta", () => {
  const { criterios, errores } = validarBusqueda({ ...valido, destino: "AMBATO" }, CIUDADES, HOY);
  assert.equal(criterios, null);
  assert.match(errores.destino ?? "", /distinto del origen/);
});

test("una fecha anterior a hoy no consulta", () => {
  const { criterios, errores } = validarBusqueda({ ...valido, fecha: "2026-11-15" }, CIUDADES, HOY);
  assert.equal(criterios, null);
  assert.match(errores.fecha ?? "", /anterior a hoy/);
});

test("una fecha inexistente del calendario se rechaza", () => {
  const { errores } = validarBusqueda({ ...valido, fecha: "2027-02-30" }, CIUDADES, HOY);
  assert.match(errores.fecha ?? "", /no es válida/);
  assert.equal(esFechaValida("2028-02-29"), true);
  assert.equal(esFechaValida("2027-02-29"), false);
});

test("solo acepta ciudades del catálogo", () => {
  const { errores } = validarBusqueda({ ...valido, origen: "LIMA" }, CIUDADES, HOY);
  assert.match(errores.origen ?? "", /de la lista/);
});

test(`la cantidad es un entero entre 1 y ${LIMITE_PASAJEROS}`, () => {
  for (const cantidad of ["0", String(LIMITE_PASAJEROS + 1), "2.5", "-1", "abc", ""]) {
    const { criterios, errores } = validarBusqueda({ ...valido, cantidad }, CIUDADES, HOY);
    assert.equal(criterios, null, `cantidad ${JSON.stringify(cantidad)}`);
    assert.ok(errores.cantidad);
  }
  for (const cantidad of ["1", String(LIMITE_PASAJEROS)]) {
    assert.ok(validarBusqueda({ ...valido, cantidad }, CIUDADES, HOY).criterios);
  }
});

test("los criterios viajan en la URL y se recuperan igual al recargar", () => {
  const criterios = { origen: "AMBATO", destino: "QUITO", fecha: HOY, cantidad: 3 };
  const params = criteriosAUrl(criterios, { clase: "EJECUTIVO", chasis: "" });
  assert.equal(params.get("clase"), "EJECUTIVO");
  assert.equal(params.has("chasis"), false);
  assert.deepEqual(formularioDesdeUrl(params), { ...valido, fecha: HOY, cantidad: "3" });
});

test("una URL sin criterios deja el formulario vacío con 1 pasajero", () => {
  assert.deepEqual(formularioDesdeUrl(new URLSearchParams()), {
    origen: "",
    destino: "",
    fecha: "",
    cantidad: "1",
  });
});

test("hoy se calcula en hora de Ecuador y no en UTC", () => {
  // 03:00 UTC del 17/11 son las 22:00 del 16/11 en Ecuador (UTC-5).
  assert.equal(hoyEnEcuador(new Date("2026-11-17T03:00:00Z")), "2026-11-16");
  assert.equal(hoyEnEcuador(new Date("2026-11-17T05:00:00Z")), "2026-11-17");
});

test("la edad se cuenta a la fecha de salida: cumpleaños el día antes, el mismo día y el día después", () => {
  // Salida el 21/11/2026; el pasajero cumple 12 años el 20, el 21 o el 22 de noviembre.
  assert.equal(edadEnFecha("2014-11-20", "2026-11-21"), 12);
  assert.equal(edadEnFecha("2014-11-21", "2026-11-21"), 12);
  assert.equal(edadEnFecha("2014-11-22", "2026-11-21"), 11);
});

test("la edad depende de la fecha de salida y no de hoy", () => {
  assert.equal(edadEnFecha("2014-11-21", HOY), 11);
  assert.equal(edadEnFecha("2014-11-21", "2026-11-21"), 12);
});

test("la edad de un nacido el 29 de febrero sube el 1 de marzo en año no bisiesto", () => {
  assert.equal(edadEnFecha("2016-02-29", "2027-02-28"), 10);
  assert.equal(edadEnFecha("2016-02-29", "2027-03-01"), 11);
  assert.equal(edadEnFecha("fecha", "2027-03-01"), null);
});

test("la duración se escribe en horas y minutos", () => {
  assert.equal(formatearDuracion(510), "8h 30min");
  assert.equal(formatearDuracion(480), "8h");
  assert.equal(formatearDuracion(45), "45min");
});
