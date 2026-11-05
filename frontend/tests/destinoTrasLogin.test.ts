import test from 'node:test';
import assert from 'node:assert/strict';
import { destinoTrasLogin } from '../src/features/auth/destinoTrasLogin.ts';

test('sin acción pendiente vuelve al inicio', () => {
  for (const valor of [null, undefined, '', {}, { pathname: '/iniciar-sesion' }]) {
    assert.equal(destinoTrasLogin(valor).pathname, '/');
  }
});

test('conserva la reserva, filtros y estado al volver a una ruta conocida', () => {
  const from = { pathname: '/pago/comprobante', search: '?reserva_id=abc', hash: '#archivo', state: { metodo: 'transferencia', cuenta: 'ejemplo' } };
  assert.deepEqual(destinoTrasLogin(from), from);
  assert.equal(destinoTrasLogin({ pathname: '/mis-viajes', search: '?seccion=historial' }).search, '?seccion=historial');
});

test('rechaza destinos externos, rutas desconocidas y bucles de autenticación', () => {
  for (const pathname of ['https://otro.test', '//otro.test', '/\\otro.test', '/admin', '/registrarse', '/recuperar-contrasena', '/activar-cuenta', '/iniciar-sesion']) {
    assert.equal(destinoTrasLogin({ pathname }).pathname, '/');
  }
});

test('rechaza componentes de URL mal formados o con controles', () => {
  for (const dato of [{ search: '//otro.test' }, { search: '?x=\\ruta' }, { hash: 'fragmento' }, { hash: '#x\n' }]) {
    assert.equal(destinoTrasLogin({ pathname: '/mi-cuenta', ...dato }).pathname, '/');
  }
});
