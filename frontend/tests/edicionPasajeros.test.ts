import test from "node:test";
import assert from "node:assert/strict";
import { fichaVacia, fichaAPasajero, pasajeroAFicha, recuperarFichas } from "../src/features/compra/pasajeros.ts";

test("el borrador sigue a la ficha al cambiar el orden de los asientos", () => {
  const a={...fichaVacia("a"),nombres:"Ana",nacimiento:"2020-06-12"};
  const b={...fichaVacia("b"),nombres:"Luis"};
  const c={...fichaVacia("c"),nombres:"Carmen"};
  const recuperadas=recuperarFichas([fichaVacia("c"),fichaVacia("a"),fichaVacia("b")],[a,b,c]);
  assert.deepEqual(recuperadas.map(f=>f.nombres),["Carmen","Ana","Luis"]);
  assert.equal(recuperadas[1].nacimiento,"2020-06-12");
});
test("un borrador de otros asientos o duplicado no reemplaza las fichas", () => {
  const iniciales=[fichaVacia("a"),fichaVacia("b")];
  assert.equal(recuperarFichas(iniciales,[fichaVacia("a"),fichaVacia("c")]),iniciales);
  assert.equal(recuperarFichas(iniciales,[fichaVacia("a"),fichaVacia("a")]),iniciales);
});
test("niño sin beneficio sigue siendo niño al guardar y recuperar", () => {
  const ficha={...fichaVacia("a"),tipo_pasajero:"NINO" as const,beneficio:"" as const};
  const datos=fichaAPasajero(ficha);
  assert.equal(datos.tipo_pasajero,"NINO");assert.equal(datos.beneficio_codigo,null);
  assert.equal(pasajeroAFicha(datos).tipo_pasajero,"NINO");
});
