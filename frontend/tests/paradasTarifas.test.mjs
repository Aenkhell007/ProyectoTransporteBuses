import test from "node:test";
import assert from "node:assert/strict";
import {
  ordenarParadas,
  obtenerTarifasVigentes,
} from "../src/components/frecuencias/paradasTarifas.utils.ts";

const paradas = [
  { id: "p3", orden: 3, ciudad: "Loja" },
  { id: "p1", orden: 1, ciudad: "Quito" },
  { id: "p2", orden: 2, ciudad: "Latacunga" },
];

const tarifas = [
  { id: "t1", precioBase: 10, vigente: true },
  { id: "t2", precioBase: 15, vigente: false },
  { id: "t3", precioBase: 20, vigente: true },
];

test("ordena paradas segun secuencia autorizada", () => {
  assert.deepEqual(ordenarParadas(paradas).map(p => p.id), ["p1", "p2", "p3"]);
});

test("ordena sin modificar los datos originales", () => {
  const original = paradas.map(p => p.id);
  ordenarParadas(paradas);
  assert.deepEqual(paradas.map(p => p.id), original);
});

test("muestra exclusivamente tarifas vigentes", () => {
  assert.deepEqual(obtenerTarifasVigentes(tarifas).map(t => t.id), ["t1", "t3"]);
});

test("permite colecciones vacias", () => {
  assert.deepEqual(ordenarParadas([]), []);
  assert.deepEqual(obtenerTarifasVigentes([]), []);
});
