import test from "node:test";
import assert from "node:assert/strict";
import { obtenerTarifasValidas } from "../src/components/frecuencias/paradasTarifas.utils.ts";

const paradas = [
  {
    id: "p1", ciudad: "Quito", frecuenciaId: "f1", orden: 1,
    habilitadaEmbarque: true, habilitadaDesembarque: false
  },
  {
    id: "p2", ciudad: "Loja", frecuenciaId: "f1", orden: 2,
    habilitadaEmbarque: false, habilitadaDesembarque: true
  }
];

const tarifa = {
  id: "t1",
  frecuenciaId: "f1",
  paradaOrigenId: "p1",
  ciudadOrigen: "Quito",
  paradaDestinoId: "p2",
  ciudadDestino: "Loja",
  ordenOrigen: 1,
  ordenDestino: 2,
  precioBase: 12,
  vigente: true
};

test("acepta tarifa valida para un tramo autorizado", () => {
  assert.equal(obtenerTarifasValidas(paradas, [tarifa]).length, 1);
});

test("rechaza precios cero, negativos y no finitos", () => {
  for (const precioBase of [0, -5, NaN, Infinity]) {
    assert.equal(
      obtenerTarifasValidas(paradas, [{ ...tarifa, precioBase }]).length, 0
    );
  }
});

test("rechaza tramos invertidos o paradas inexistentes", () => {
  assert.equal(
    obtenerTarifasValidas(paradas, [{ ...tarifa, ordenOrigen: 3 }]).length, 0
  );
  assert.equal(
    obtenerTarifasValidas(paradas, [{ ...tarifa, paradaDestinoId: "inexistente" }]).length, 0
  );
});

test("rechaza paradas de otra frecuencia", () => {
  assert.equal(
    obtenerTarifasValidas(paradas, [{ ...tarifa, frecuenciaId: "f2" }]).length, 0
  );
});

test("respeta los permisos de embarque y desembarque", () => {
  const sinEmbarque = paradas.map(p =>
    p.id === "p1" ? { ...p, habilitadaEmbarque: false } : p
  );
  assert.equal(obtenerTarifasValidas(sinEmbarque, [tarifa]).length, 0);
});

test("excluye tarifas inactivas", () => {
  assert.equal(
    obtenerTarifasValidas(paradas, [{ ...tarifa, vigente: false }]).length, 0
  );
});

test("rechaza ciudades de origen y destino inconsistentes", () => {
  assert.equal(obtenerTarifasValidas(paradas, [
    { ...tarifa, ciudadOrigen: "Ambato" }
  ]).length, 0);
  assert.equal(obtenerTarifasValidas(paradas, [
    { ...tarifa, ciudadDestino: "Cuenca" }
  ]).length, 0);
});

test("rechaza una tarifa con orden de destino incorrecto", () => {
  assert.equal(obtenerTarifasValidas(paradas, [
    { ...tarifa, ordenDestino: 5 }
  ]).length, 0);
});

test("no modifica las tarifas originales", () => {
  const originales = [tarifa, { ...tarifa, vigente: false }];
  const copia = structuredClone(originales);
  obtenerTarifasValidas(paradas, originales);
  assert.deepEqual(originales, copia);
});

test("rechaza destino sin permiso de desembarque", () => {
  const modificadas = paradas.map(p =>
    p.id === "p2"
      ? { ...p, habilitadaDesembarque: false }
      : p
  );
  assert.equal(obtenerTarifasValidas(modificadas, [tarifa]).length, 0);
});

test("conserva solo tarifas validas entre datos mixtos", () => {
  const mezcla = [
    { ...tarifa, id: "t1" },
    { ...tarifa, id: "t2", precioBase: 0 },
    { ...tarifa, id: "t3", clase: "VIP", precioBase: 18 }
  ];

  const resultado = obtenerTarifasValidas(paradas, mezcla);
  assert.deepEqual(resultado.map(t => t.id), ["t1", "t3"]);
});
