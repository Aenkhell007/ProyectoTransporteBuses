import test from 'node:test';
import assert from 'node:assert/strict';
import { invalidarCacheLecturas, solicitar, solicitarConCache } from '../src/services/solicitudes';

function diferida<T>() { let resolver!: (v:T)=>void; let rechazar!: (e:Error)=>void; const promesa=new Promise<T>((r,j)=>{resolver=r;rechazar=j;}); return {promesa,resolver,rechazar}; }

test('lecturas simultáneas comparten red y cada consumidor puede leer su respuesta',async t=>{
  const d=diferida<Response>(); let llamadas=0;
  t.mock.method(globalThis,'fetch',async()=>{llamadas++;return d.promesa;});
  const a=solicitar('/api/prueba'),b=solicitar('/api/prueba');
  assert.equal(llamadas,1);d.resolver(Response.json({asientos:3}));
  const [ra,rb]=await Promise.all([a,b]); assert.deepEqual(await ra.json(),{asientos:3});assert.deepEqual(await rb.json(),{asientos:3});
});

test('una lectura terminada no se cachea: vuelve a consultar datos actuales',async t=>{
  let llamadas=0;t.mock.method(globalThis,'fetch',async()=>Response.json({version:++llamadas}));
  assert.equal((await (await solicitar('/api/fresco')).json()).version,1);
  assert.equal((await (await solicitar('/api/fresco')).json()).version,2);
});

test('no mezcla URL, ámbito, credenciales o cabeceras distintos',async t=>{
  let llamadas=0;const d=diferida<Response>();t.mock.method(globalThis,'fetch',async()=>{llamadas++;return d.promesa;});
  const ps=[solicitar('/api/cooperativa?a=1'),solicitar('/api/cooperativa?a=2'),solicitar('/api/cooperativa?a=1',{credentials:'include'}),solicitar('/api/cooperativa?a=1',{headers:{Authorization:'prueba'}})];
  assert.equal(llamadas,4);d.resolver(Response.json({}));await Promise.all(ps);
});

test('escrituras no se deduplican y las lecturas previas no se reutilizan tras login/logout',async t=>{
  let llamadas=0;const d=diferida<Response>();t.mock.method(globalThis,'fetch',async()=>{llamadas++;return d.promesa;});
  const ps=[solicitar('/api/perfil'),solicitar('/api/auth/logout',{method:'POST'}),solicitar('/api/auth/logout',{method:'POST'}),solicitar('/api/perfil')];
  assert.equal(llamadas,4);d.resolver(Response.json({}));await Promise.all(ps);
});

test('las lecturas con cancelación propia o no-store no comparten señales',async t=>{
  let llamadas=0;const d=diferida<Response>();t.mock.method(globalThis,'fetch',async()=>{llamadas++;return d.promesa;});
  const ps=[solicitar('/api/senal',{signal:new AbortController().signal}),solicitar('/api/senal',{signal:new AbortController().signal}),solicitar('/api/senal',{cache:'no-store'})];
  assert.equal(llamadas,3);d.resolver(Response.json({}));await Promise.all(ps);
});

test('un error de red compartido no deja una promesa bloqueada para reintentos',async t=>{
  let llamadas=0;t.mock.method(globalThis,'fetch',async()=>{if(++llamadas===1)throw new Error('sin red');return Response.json({ok:true});});
  await assert.rejects(solicitar('/api/reintento'),/sin red/);assert.equal((await solicitar('/api/reintento')).status,200);
});

test('invalidarCacheLecturas descarta lecturas en curso tras logout o cambio de sesión', async (t) => {
  invalidarCacheLecturas();
  const d = diferida<Response>();
  let llamadas = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    llamadas++;
    return llamadas === 1 ? d.promesa : Response.json({ fresh: true });
  });
  const enVuelo = solicitarConCache('/api/catalogos/demo', {}, 60_000);
  invalidarCacheLecturas();
  d.resolver(Response.json({ stale: true }));
  await enVuelo;
  const r2 = await solicitarConCache('/api/catalogos/demo', {}, 60_000);
  assert.equal(llamadas, 2);
  assert.deepEqual(await r2.json(), { fresh: true });
});
