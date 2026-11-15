import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import { Pool } from 'pg';
import sharp from 'sharp';

test('configuración real: persistencia, QR, versiones, atomicidad y aislamiento; ROLLBACK', { skip: process.env.PROBAR_CONFIG_PAGOS_DB !== '1' }, async () => {
  config({ path: resolve(__dirname, '../../.env'), quiet: true });
  const carpeta = resolve(__dirname, '../../conexion-bd');
  config({ path: resolve(carpeta, '.env'), quiet: true });
  assert.ok(process.env.DIRECT_URL, 'Falta DIRECT_URL');
  const url = new URL(process.env.DIRECT_URL);
  for (const k of ['sslmode', 'sslcert', 'sslrootcert', 'sslkey', 'sslidentity', 'sslaccept', 'schema']) url.searchParams.delete(k);
  const ca = process.env.DB_SSL_CA_FILE;
  const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: true, ...(ca ? { ca: readFileSync(resolve(carpeta, ca), 'utf8') } : {}) }, connectionTimeoutMillis: 10000 });
  const db = await pool.connect();
  let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;
  try {
    await db.query('BEGIN');
    if (!(await db.query("SELECT to_regclass('transporte.pagos_qr_contenidos') AS tabla")).rows[0].tabla) await db.query(readFileSync(resolve(carpeta, 'prisma/migrations/20261114_configuracion_pagos/migration.sql'), 'utf8').replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''));
    await db.query('GRANT transporte_runtime TO CURRENT_USER');
    async function persona() {
      const id = (await db.query("INSERT INTO transporte.usuarios(nombres,apellidos,tipo_documento,documento,email,email_verificado_at) VALUES('Prueba','Configuración','OTRO',$1,$2,now()) RETURNING id", [randomUUID().slice(0, 30), randomUUID() + '@example.invalid'])).rows[0].id;
      const token = randomBytes(32).toString('base64url');
      await db.query("INSERT INTO transporte.sesiones(usuario_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')", [id, createHash('sha256').update(token).digest('hex')]);
      return { id, token };
    }
    const responsable = await persona(), ajeno = await persona(), cliente = await persona();
    async function cooperativa(usuario: string) {
      const id = (await db.query("INSERT INTO transporte.cooperativas(nombre,razon_social,ruc) VALUES('PRUEBA CONFIG PAGOS','Fixture reversible',$1) RETURNING id", [randomUUID().slice(0, 13)])).rows[0].id;
      await db.query("INSERT INTO transporte.membresias(cooperativa_id,usuario_id,rol_id) SELECT $1,$2,id FROM transporte.roles WHERE codigo='COOPERATIVA'", [id, usuario]);
      return id as string;
    }
    const coop = await cooperativa(responsable.id), otra = await cooperativa(ajeno.id);
    const { crearConfiguracionPagosRouter } = await import('./configuracionRouter.js');
    const app = express(); app.use(cookieParser());
    app.use('/api/configuracion/pagos', crearConfiguracionPagosRouter(async (req, trabajo) => {
      const t = req.cookies?.transporte_sesion;
      if (typeof t !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(t)) { const e = new Error('Sesión'); Object.assign(e, { code: '28000' }); throw e; }
      await db.query('SAVEPOINT solicitud');
      try {
        await db.query('SET LOCAL ROLE transporte_runtime');
        await db.query('SELECT transporte.abrir_contexto($1,$2)', [createHash('sha256').update(t).digest('hex'), randomUUID()]);
        const result = await trabajo(db); await db.query('RESET ROLE'); await db.query('RELEASE SAVEPOINT solicitud'); return result;
      } catch (e) { await db.query('ROLLBACK TO SAVEPOINT solicitud'); await db.query('RESET ROLE'); throw e; }
    }));
    server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server!.once('listening', r));
    const port = (server.address() as { port: number }).port;
    async function api(ruta: string, token = responsable.token, body?: unknown, origin?: string) {
      const r = await fetch(`http://127.0.0.1:${port}/api/configuracion/pagos/${ruta}`, { method: body === undefined ? 'GET' : 'PUT', headers: { Cookie: token ? `transporte_sesion=${token}` : '', Origin: origin ?? process.env.FRONTEND_URL ?? 'http://127.0.0.1:5173', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, datos: r.headers.get('content-type')?.includes('application/json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
    }
    assert.equal((await api(coop, '')).status, 401);
    assert.equal((await api(coop, cliente.token)).status, 403);
    assert.equal((await api(otra)).status, 403);
    const contexto = await api('cooperativas'); assert.deepEqual(contexto.datos.cooperativas.map((c: any) => c.id), [coop]);
    const inicial = (await api(coop)).datos;
    const id = randomUUID();
    const qr = (await sharp({ create: { width: 16, height: 16, channels: 3, background: '#000000' } }).png().toBuffer()).toString('base64');
    const base = { ...inicial, formatos: inicial.limites.formatos, maximoMB: 1, referenciaObligatoria: true, cuentas: [{ id, bancoId: inicial.bancos[0].id, tipo: 'Corriente', numero: '1234567890', titular: 'Titular de prueba', ruc: '1805381579001', alias: 'Solo prueba', activa: true, predeterminada: true, moneda: 'USD', qrBase64: qr }], metodos: inicial.metodos.map((m: any) => ({ ...m, habilitado: m.codigo === 'BANCO', instrucciones: m.codigo === 'BANCO' ? 'Prueba de transferencia' : '' })) };
    assert.equal((await api(coop, responsable.token, base, 'https://ajeno.invalid')).status, 403);
    const alta = await api(coop, responsable.token, base); assert.equal(alta.status, 200, JSON.stringify(alta.datos));
    assert.equal(alta.datos.cuentas[0].predeterminada, true); assert.ok(alta.datos.cuentas[0].qrId);
    assert.equal((await api(coop)).datos.cuentas[0].numero, '1234567890');
    assert.equal((await api(`${coop}/cuentas/${id}/qr`)).status, 200);
    assert.equal((await api(`${coop}/cuentas/${id}/qr`, ajeno.token)).status, 403);
    assert.equal((await api(coop, responsable.token, base)).status, 409);
    const editar = await api(coop, responsable.token, { ...alta.datos, cuentas: alta.datos.cuentas.map((c: any) => ({ ...c, alias: 'Actualizada' })) });
    assert.equal(editar.status, 200, JSON.stringify(editar.datos));
    assert.equal((await api(coop)).datos.cuentas[0].alias, 'Actualizada');
    assert.equal((await api(coop, responsable.token, { ...editar.datos, cuentas: [] })).status, 422);
    assert.equal((await api(coop, responsable.token, { ...editar.datos, cuentas: [{ ...editar.datos.cuentas[0], activa: false, predeterminada: false }] })).status, 422);
    assert.equal((await api(coop, responsable.token, { ...editar.datos, metodos: editar.datos.metodos.map((m: any) => ({ ...m, habilitado: m.codigo === 'PAYPAL' || m.habilitado })) })).status, 422);
    assert.equal((await api(coop, responsable.token, { ...editar.datos, maximoMB: 50 })).status, 422);
    const duplicada = { ...editar.datos.cuentas[0], id: randomUUID(), predeterminada: false };
    assert.equal((await api(coop, responsable.token, { ...editar.datos, cuentas: [...editar.datos.cuentas, duplicada] })).status, 422);
    const imagenesAntes = (await db.query('SELECT count(*)::int n FROM transporte.pagos_qr_contenidos WHERE cooperativa_id=$1', [coop])).rows[0].n;
    assert.equal((await api(coop, responsable.token, { ...editar.datos, cuentas: [{ ...editar.datos.cuentas[0], qrBase64: 'bm8tZXMtaW1hZ2Vu' }] })).status, 422);
    assert.equal((await db.query('SELECT count(*)::int n FROM transporte.pagos_qr_contenidos WHERE cooperativa_id=$1', [coop])).rows[0].n, imagenesAntes);
    const segunda = { ...duplicada, numero: '9876543210', predeterminada: true, qrId: null };
    const dos = await api(coop, responsable.token, { ...editar.datos, cuentas: [{ ...editar.datos.cuentas[0], predeterminada: false }, segunda] });
    assert.equal(dos.status, 200, JSON.stringify(dos.datos)); assert.equal(dos.datos.cuentas[0].id, segunda.id);
    const baja = await api(coop, responsable.token, { ...dos.datos, cuentas: dos.datos.cuentas.map((c: any) => ({ ...c, activa: false, predeterminada: false, quitarQr: true })), metodos: dos.datos.metodos.map((m: any) => ({ ...m, habilitado: false })) });
    assert.equal(baja.status, 200, JSON.stringify(baja.datos)); assert.ok(baja.datos.cuentas.every((c: any) => !c.activa && !c.predeterminada && !c.qrId));
    assert.equal((await api(`${coop}/cuentas/${id}/qr`)).status, 404);
    assert.equal((await db.query("SELECT count(*)::int n FROM transporte.auditoria WHERE cooperativa_id=$1 AND entidad='cuentas_bancarias'", [coop])).rows[0].n > 0, true);
  } finally { if (server) await new Promise<void>(r => server!.close(() => r())); await db.query('ROLLBACK'); db.release(); await pool.end(); }
});
