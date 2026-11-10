import assert from 'node:assert/strict';
import { test } from 'node:test';
import { numerarPlanoComercial, plantillaEjecutivo, plantillaNormal } from '../src/features/flota/plantillasPlano.ts';

test('Normal: 40 asientos 2+2 y pasillo central, sin IDs ni códigos repetidos', () => {
  const celdas = plantillaNormal(10, 'clase-normal');
  const asientos = celdas.filter(c => c.tipo === 'ASIENTO');
  assert.equal(asientos.length, 40);
  assert.equal(celdas.filter(c => c.tipo === 'PASILLO').length, 10);
  assert.equal(new Set(asientos.map(c => c.codigo)).size, 40);
  assert.equal(new Set(celdas.map(c => `${c.piso}-${c.fila}-${c.columna}`)).size, 50);
  assert.deepEqual(asientos.slice(0, 4).map(c => c.codigo), ['1A', '1B', '1C', '1D']);
  assert.equal(asientos.at(-1)?.codigo, '10D');
  assert.ok(celdas.filter(c => c.tipo === 'PASILLO').every(c => c.columna === 3 && c.codigo === null && c.clase_id === null));
});

test('Premium: 18 asientos en cada piso, códigos L/U y pasillo después de la primera columna', () => {
  const celdas = plantillaEjecutivo(6, 'clase-ejecutivo');
  const asientos = celdas.filter(c => c.tipo === 'ASIENTO');
  assert.equal(asientos.length, 36);
  assert.equal(new Set(asientos.map(c => c.codigo)).size, 36);
  assert.deepEqual(asientos.slice(0, 3).map(c => c.codigo), ['L1', 'L2', 'L3']);
  assert.equal(asientos[17].codigo, 'L18');
  assert.equal(asientos[18].codigo, 'U1');
  assert.equal(asientos[35].codigo, 'U18');
  assert.ok(celdas.filter(c => c.tipo === 'PASILLO').every(c => c.columna === 2));
});

test('Normal: editar una celda no cambia los códigos de las otras filas ni la clase recibida', () => {
  const original = plantillaNormal(10, 'clase-normal');
  const editado = numerarPlanoComercial(original.filter(c => c.codigo !== '1B'), 1);
  assert.equal(editado.filter(c => c.tipo === 'ASIENTO').length, 39);
  assert.equal(editado.find(c => c.fila === 10 && c.columna === 5)?.codigo, '10D');
  assert.equal(original.filter(c => c.tipo === 'ASIENTO').length, 40);
  assert.ok(editado.filter(c => c.tipo === 'ASIENTO').every(c => c.clase_id === 'clase-normal'));
});

test('Premium: renumerar un plano editado conserva el prefijo de cada piso', () => {
  const editado = numerarPlanoComercial(plantillaEjecutivo(6, 'premium').filter(c => c.codigo !== 'L1'), 2);
  const asientos = editado.filter(c => c.tipo === 'ASIENTO');
  assert.equal(asientos.length, 35);
  assert.equal(new Set(asientos.map(c => c.codigo)).size, 35);
  assert.equal(asientos.filter(c => c.piso === 2).at(-1)?.codigo, 'U18');
});

test('Una plantilla rechaza dimensiones inválidas en vez de generar mapas incompletos', () => {
  for (const generar of [plantillaNormal, plantillaEjecutivo]) {
    for (const filas of [0, -1, 1.5, NaN, 21]) assert.throws(() => generar(filas, 'clase'));
  }
});
