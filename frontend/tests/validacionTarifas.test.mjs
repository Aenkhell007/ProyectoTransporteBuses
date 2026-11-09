import test from "node:test";
import assert from "node:assert/strict";
import { obtenerTarifasValidas } from "../src/components/frecuencias/paradasTarifas.utils.ts";

const paradas = [
  {
    id: "p1", frecuenciaId: "f1", orden: 1,
    habilitadaEmbarque: true, habilitadaDesembarque: false
  },
  {
    id: "p2", frecuenciaId: "f1", orden: 2,
    habilitadaEmbarque: false, habilitadaDesembarque: true
  }
];

const tarifa = {
  id: "t1",
  frecuenciaId: "f1",
  paradaOrigenId: "p1",
  paradaDestinoId: "p2",
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
