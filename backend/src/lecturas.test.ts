import test from 'node:test';
import assert from 'node:assert/strict';
import type { PoolClient } from 'pg';
import { consultarLote } from './lecturas';

test('lecturas: conserva valores parametrizados independientes y usa una sola conexión',async()=>{
  const llamadas:{sql:string;valores:unknown[]}[]=[];
  const ataque="x'); DELETE FROM transporte.usuarios; --";
  const db={query:async(sql:string,valores:unknown[])=>{llamadas.push({sql,valores});return {rows:[{lecturas:[[{nombre:ataque}],[],[{permitido:false}]]}]};}} as unknown as PoolClient;
  const resultado=await consultarLote(db,[{sql:'SELECT nombre FROM transporte.ciudades WHERE nombre=$1',valores:[ataque]}, {sql:'SELECT id FROM transporte.terminales WHERE ciudad_id=$1 AND nombre=$2',valores:['ciudad','terminal']},{sql:'SELECT transporte.puede($1,$2) permitido',valores:['flota.admin','cooperativa']}]);
  assert.equal(llamadas.length,1);assert.ok(!llamadas[0].sql.includes(ataque));
  assert.deepEqual(llamadas[0].valores,[ataque,'ciudad','terminal','flota.admin','cooperativa']);
  assert.match(llamadas[0].sql,/ciudad_id=\$2 AND nombre=\$3/);
  assert.match(llamadas[0].sql,/transporte.puede\(\$4,\$5\)/);
  assert.deepEqual(resultado,[[{nombre:ataque}],[],[{permitido:false}]]);
});

test('lecturas: un error SQL conserva la excepción para revertir la transacción',async()=>{
  const error=new Error('permiso denegado');const db={query:async()=>{throw error;}} as unknown as PoolClient;
  await assert.rejects(()=>consultarLote(db,[{sql:'SELECT 1'}]),e=>e===error);
});

test('lecturas: un lote vacío no consulta ni abre conexiones',async()=>{
  const db={query:async()=>assert.fail('No debe consultar')} as unknown as PoolClient;
  assert.deepEqual(await consultarLote(db,[]),[]);
});
