import test from "node:test";
import assert from "node:assert/strict";
import { codigoCorto } from "../src/features/compra/codigo.ts";

const uuid = "3f2a9c1b-7d4e-4a10-9b2c-0e1f2a3b4c5d";

test("devuelve los 8 primeros caracteres sin guiones y en mayúsculas", () => {
  assert.equal(codigoCorto(uuid), "3F2A9C1B");
  assert.equal(codigoCorto(uuid).length, 8);
  assert.doesNotMatch(codigoCorto(uuid), /-/);
});

test("ya en mayúsculas da el mismo código", () => {
  assert.equal(codigoCorto(uuid.toUpperCase()), "3F2A9C1B");
});

test("buscar el código corto encuentra la reserva con la regla de Mis viajes", () => {
  // backend/src/compra/misViajes.ts:22 filtra con codigo ILIKE '%'||q||'%':
  // subcadena sin distinguir mayúsculas. El cuadro de búsqueda corta q a 60 caracteres.
  const ilike = (texto: string, q: string) => texto.toLowerCase().includes(q.toLowerCase());
  const reservas = [
    { reserva_id: "r1", codigo: uuid },
    { reserva_id: "r2", codigo: "9a8b7c6d-1111-4222-8333-444455556666" },
  ];
  const q = codigoCorto(uuid).slice(0, 60);
  assert.deepEqual(reservas.filter((r) => ilike(r.codigo, q)).map((r) => r.reserva_id), ["r1"]);
});
