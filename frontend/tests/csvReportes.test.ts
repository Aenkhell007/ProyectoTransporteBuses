import test from 'node:test';
import assert from 'node:assert/strict';
import {celdaCSV} from '../src/features/operacion/csv';
test('CSV de reportes: conserva comas, comillas, acentos y campos vacíos',()=>{assert.equal(celdaCSV('Cooperativa "Ángel", S.A.'),'"Cooperativa ""Ángel"", S.A."');assert.equal(celdaCSV(null),'""');assert.equal(celdaCSV(12),'"12"');});
test('CSV de reportes: neutraliza fórmulas y controles antes de exportar nombres',()=>{for(const valor of ['=SUM(1,2)','+1','@SUM(A1)','-1','  =1','\t=1','\r=1'])assert.ok(celdaCSV(valor).startsWith('"\''));});
