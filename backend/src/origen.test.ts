import test from "node:test";
import assert from "node:assert/strict";
import { ancestrosFramePermitidos, origenPermitido } from "./origen";

test("origenPermitido acepta EXTRA_ORIGINS y FRONTEND_ORIGINS separados por comas", () => {
  const prevExtra = process.env.EXTRA_ORIGINS;
  const prevFronts = process.env.FRONTEND_ORIGINS;
  try {
    process.env.EXTRA_ORIGINS = "https://portal.ejemplo.ec/, http://192.168.1.50:5173";
    process.env.FRONTEND_ORIGINS = "https://app.ejemplo.ec";
    assert.equal(origenPermitido("https://portal.ejemplo.ec"), true);
    assert.equal(origenPermitido("http://192.168.1.50:5173"), true);
    assert.equal(origenPermitido("https://app.ejemplo.ec"), true);
    assert.equal(origenPermitido("https://no-autorizado.ec"), false);
  } finally {
    if (prevExtra === undefined) delete process.env.EXTRA_ORIGINS;
    else process.env.EXTRA_ORIGINS = prevExtra;
    if (prevFronts === undefined) delete process.env.FRONTEND_ORIGINS;
    else process.env.FRONTEND_ORIGINS = prevFronts;
  }
});

test("origenPermitido acepta orígenes locales y túneles HTTPS de Cloudflare solo fuera de producción", () => {
  const prevEnv = process.env.NODE_ENV;
  const prevFront = process.env.FRONTEND_URL;
  try {
    delete process.env.NODE_ENV;
    process.env.FRONTEND_URL = "https://mi-terminal.example.com/";

    assert.equal(origenPermitido("http://127.0.0.1:5173"), true);
    assert.equal(origenPermitido("http://localhost:5173"), true);
    assert.equal(origenPermitido("http://127.0.0.1:3000"), true);
    assert.equal(origenPermitido("https://mi-terminal.example.com"), true);
    assert.equal(origenPermitido("https://alt-alleged.trycloudflare.com"), true);
    assert.equal(origenPermitido("https://SUB-123.trycloudflare.com/"), true);

    assert.equal(origenPermitido(undefined), false);
    assert.equal(origenPermitido(""), false);
    assert.equal(origenPermitido("https://ajeno.invalid"), false);
    assert.equal(origenPermitido("http://alt-alleged.trycloudflare.com"), false);
    assert.equal(origenPermitido("https://alt-alleged.trycloudflare.com.evil.com"), false);
    assert.ok(ancestrosFramePermitidos().includes("https://*.trycloudflare.com"));

    process.env.NODE_ENV = "production";
    assert.equal(origenPermitido("https://alt-alleged.trycloudflare.com"), false);
    assert.equal(origenPermitido("https://mi-terminal.example.com"), true);
    assert.equal(ancestrosFramePermitidos().includes("trycloudflare.com"), false);
  } finally {
    if (prevEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevEnv;
    if (prevFront === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = prevFront;
  }
});
