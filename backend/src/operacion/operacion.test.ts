import { detectarConflictosEnLote } from './loteAsignaciones';
import {cobertura} from './consultasExtras';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fecha,hora,rango,paradas,moneda} from './validacion';
test('operación: fechas, horas y períodos estrictos',()=>{assert.equal(fecha('2026-11-16'),'2026-11-16');for(const f of ['2026-02-30','2026-13-01','16/11/2026',''])assert.throws(()=>fecha(f));assert.equal(hora('23:59'),'23:59');assert.throws(()=>hora('24:00'));assert.throws(()=>rango('2026-11-30','2026-11-01'));assert.throws(()=>rango('2026-01-01','2026-02-15'));});
test('operación: paradas únicas, tiempos crecientes e importes sin fracciones de centavo',()=>{assert.equal(paradas([{terminalId:'origen',minutos:0},{terminalId:'destino',minutos:60}]).length,2);assert.throws(()=>paradas([{terminalId:'uno',minutos:0},{terminalId:'uno',minutos:60}]));assert.throws(()=>paradas([{terminalId:'uno',minutos:1},{terminalId:'dos',minutos:60}]));assert.throws(()=>paradas([{terminalId:'uno',minutos:0},{terminalId:'dos',minutos:0}]));assert.equal(moneda('47.60'),4760);for(const v of ['-1','2.001','Infinity','1e3'])assert.throws(()=>moneda(v));});
test('política: exige cobertura continua desde cero hasta infinito',()=>{assert.equal(cobertura([{minutos_desde:0,minutos_hasta:240,porcentaje_bp:0},{minutos_desde:240,minutos_hasta:null,porcentaje_bp:5000}]),true);assert.equal(cobertura([{minutos_desde:240,minutos_hasta:null,porcentaje_bp:5000}]),false);assert.equal(cobertura([{minutos_desde:0,minutos_hasta:null,porcentaje_bp:null}]),false);assert.equal(cobertura([{minutos_desde:0,minutos_hasta:240,porcentaje_bp:2500}]),false);});

test('asignaciones: detecta duplicados y solapamientos, incluso al cruzar medianoche', () => {
  const primera = {
    frecuenciaId: 'f1', busId: 'b1', conductor: 'c1', dia: '2027-01-01',
    salida: '2027-01-01T23:30:00-05:00', liberacion: '2027-01-02T00:30:00-05:00',
  };
  const siguiente = {
    frecuenciaId: 'f2', busId: 'b2', conductor: 'c2', dia: '2027-01-02',
    salida: '2027-01-02T00:00:00-05:00', liberacion: '2027-01-02T01:30:00-05:00',
  };
  assert.throws(() => detectarConflictosEnLote([primera, { ...primera, busId: 'b2' }]), /misma frecuencia/);
  assert.throws(() => detectarConflictosEnLote([primera, { ...siguiente, busId: 'b1' }]), /bus tiene/);
  assert.throws(() => detectarConflictosEnLote([primera, { ...siguiente, conductor: 'c1' }]), /conductor tiene/);
  assert.doesNotThrow(() => detectarConflictosEnLote([primera, siguiente]));
  assert.doesNotThrow(() => detectarConflictosEnLote([
    primera, { ...siguiente, busId: 'b1', conductor: 'c1', salida: primera.liberacion },
  ]));
});
