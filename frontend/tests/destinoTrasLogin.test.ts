import test from 'node:test';
import assert from 'node:assert/strict';
import { destinoTrasLogin } from '../src/features/auth/destinoTrasLogin.ts';

test('usa el panel correspondiente a los roles devueltos por el servidor', () => {
  assert.equal(destinoTrasLogin(undefined, ['CLIENTE', 'OFICINISTA']).pathname, '/oficina');
  assert.equal(destinoTrasLogin(undefined, ['ADMIN_SISTEMA']).pathname, '/panel');
  assert.equal(destinoTrasLogin(undefined, ['COOPERATIVA']).pathname, '/cooperativa');
  assert.equal(destinoTrasLogin(undefined, ['CLIENTE']).pathname, '/');
  assert.equal(destinoTrasLogin(undefined, ['OFICINISTA', 'ADMIN_SISTEMA']).pathname, '/panel');
  assert.equal(destinoTrasLogin(undefined, ['PERSONAL_BUS']).pathname, '/abordaje');
});

test('conserva una compra pendiente para un oficinista y rechaza destinos externos', () => {
  const from = { pathname: '/pasajeros', search: '?reserva_id=abc', hash: '', state: null };
  assert.deepEqual(destinoTrasLogin(from, ['OFICINISTA']), from);
  assert.equal(destinoTrasLogin({ pathname: 'https://otro.test' }, ['OFICINISTA']).pathname, '/oficina');
});

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

test('vuelve a la solicitud real de reembolso y a paneles autorizados',()=>{
 assert.equal(destinoTrasLogin({pathname:'/mis-viajes/reembolso',search:'?reserva_id=123'},['CLIENTE']).pathname,'/mis-viajes/reembolso');
 assert.equal(destinoTrasLogin({pathname:'/cooperativa/configuracion'},['COOPERATIVA']).pathname,'/cooperativa/configuracion');
 assert.equal(destinoTrasLogin({pathname:'/panel/usuarios'},['OFICINISTA']).pathname,'/oficina');
});
