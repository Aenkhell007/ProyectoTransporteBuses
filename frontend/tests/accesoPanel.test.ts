import test from 'node:test';
import assert from 'node:assert/strict';
import {accesoPanel} from '../src/features/auth/accesoPanel';
test('paneles: cliente y personal del bus no acceden a administración, oficina o cooperativa',()=>{
 for(const rol of ['CLIENTE','PERSONAL_BUS'])for(const panel of ['admin','oficina','cooperativa'] as const)assert.equal(accesoPanel(panel,[rol],[]),false);
});
test('paneles: se respetan permisos efectivos, incluso excepciones individuales',()=>{
 assert.equal(accesoPanel('admin',['ADMIN_SISTEMA'],['identidad.admin']),true);
 assert.equal(accesoPanel('cooperativa',['OFICINISTA'],['operacion.admin']),true);
 assert.equal(accesoPanel('cooperativa',['OFICINISTA'],['oficina.vender']),false);
 assert.equal(accesoPanel('oficina',['OFICINISTA'],[]),false);
 assert.equal(accesoPanel('oficina',['COOPERATIVA'],['oficina.vender']),true);
 assert.equal(accesoPanel('abordaje',['PERSONAL_BUS'],['abordaje.registrar','cooperativa.leer']),true);
 assert.equal(accesoPanel('abordaje',['CLIENTE'],[]),false);
});
