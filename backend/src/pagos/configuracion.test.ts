import test from 'node:test';
import assert from 'node:assert/strict';
import { textoPago, validarPolitica } from './configuracionValidacion';
const limites = { formatos: ['JPG', 'PDF'], maximoMB: 2 };
const datos = { version: 1, cuentas: [], metodos: [], formatos: ['PDF'], maximoMB: 2, referenciaObligatoria: true };
test('configuración: respeta formatos, límites globales y versión', () => {
  assert.doesNotThrow(() => validarPolitica(datos, limites));
  for (const cambio of [{ maximoMB: 5 }, { formatos: ['PNG'] }, { formatos: [] }, { formatos: ['PDF', 'PDF'] }, { version: '1' }, { referenciaObligatoria: 'sí' }, { cuentas: [null] }]) assert.throws(() => validarPolitica({ ...datos, ...cambio }, limites));
});
test('configuración: una sola cuenta predeterminada y activa', () => {
  assert.throws(() => validarPolitica({ ...datos, cuentas: [{ activa: false, predeterminada: true }] }, limites));
  assert.throws(() => validarPolitica({ ...datos, cuentas: [{ activa: true, predeterminada: true }, { activa: true, predeterminada: true }] }, limites));
});
test('configuración: instrucciones y titulares sin contenido ejecutable ni controles', () => {
  assert.equal(textoPago(' Titular ', 'Titular', 200), 'Titular');
  assert.throws(() => textoPago('<script>prueba</script>', 'Texto', 200));
  assert.throws(() => textoPago('ab\u0000cd', 'Texto', 200));
  assert.throws(() => textoPago('', 'Titular', 200));
});
