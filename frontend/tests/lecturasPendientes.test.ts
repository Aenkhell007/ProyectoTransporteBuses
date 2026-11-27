import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compartirLectura, descartarLecturasPendientes } from '../src/services/lecturasPendientes.ts';

test('comparte solo lecturas concurrentes con la misma clave', async () => {
  let llamadas = 0;
  const solicitar = async () => ++llamadas;
  const primera = compartirLectura('cooperativa-a', solicitar);
  const segunda = compartirLectura('cooperativa-a', solicitar);
  assert.equal(segunda, primera);
  assert.equal(await compartirLectura('cooperativa-b', solicitar), 2);
  assert.equal(await primera, 1);
  assert.equal(await compartirLectura('cooperativa-a', solicitar), 3);
});

test('una lectura fallida puede volver a solicitarse', async () => {
  await assert.rejects(compartirLectura('reintento', async () => {
    throw new Error('Consulta fallida');
  }), /Consulta fallida/);
  assert.equal(await compartirLectura('reintento', async () => 'resultado nuevo'), 'resultado nuevo');
});

test('descartar las lecturas impide reutilizar la petición de la sesión anterior', async () => {
  const anterior = Promise.withResolvers<string>();
  const actual = Promise.withResolvers<string>();
  const primera = compartirLectura('contexto', () => anterior.promise);
  descartarLecturasPendientes();
  const segunda = compartirLectura('contexto', () => actual.promise);
  assert.notEqual(primera, segunda);
  anterior.resolve('sesión anterior');
  await primera;
  assert.equal(compartirLectura('contexto', () => Promise.resolve('consulta adicional')), segunda);
  actual.resolve('sesión actual');
  assert.equal(await segunda, 'sesión actual');
});
