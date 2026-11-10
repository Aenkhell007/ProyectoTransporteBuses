
import test from "node:test";
import assert from "node:assert/strict";
import { filtrarFrecuencias } from "../src/pages/frecuencias/filtrarFrecuencias.ts";

const datos = [
  {
    id: "1",
    numeroResolucion: "ANT-2026-00145",
    origen: "Quito",
    destino: "Loja",
    tipo: "CON_PARADAS",
    estado: "ACTIVA"
  },
  {
    id: "2",
    numeroResolucion: "ANT-2026-00198",
    origen: "Ambato",
    destino: "Guayaquil",
    tipo: "DIRECTO",
    estado: "ACTIVA"
  },
  {
    id: "3",
    numeroResolucion: "ANT-2026-00210",
    origen: "Quito",
    destino: "Cuenca",
    tipo: "CON_PARADAS",
    estado: "INACTIVA"
  }
];

test("muestra todas las frecuencias", () => {
  assert.equal(filtrarFrecuencias(datos, "", "TODAS", "TODOS").length, 3);
});

test("busca por ciudad", () => {
  assert.equal(filtrarFrecuencias(datos, "ambato", "TODAS", "TODOS").length, 1);
});

test("busca por resolucion ANT", () => {
  assert.equal(filtrarFrecuencias(datos, "00145", "TODAS", "TODOS").length, 1);
});

test("filtra frecuencias activas", () => {
  assert.equal(filtrarFrecuencias(datos, "", "ACTIVA", "TODOS").length, 2);
});

test("filtra viajes con paradas", () => {
  assert.equal(filtrarFrecuencias(datos, "", "TODAS", "CON_PARADAS").length, 2);
});

test("combina filtros sin resultados", () => {
  assert.equal(filtrarFrecuencias(datos, "", "INACTIVA", "DIRECTO").length, 0);
});
