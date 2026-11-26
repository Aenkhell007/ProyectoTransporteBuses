import test from "node:test";
import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  configuracionWallet,
  construirPayloadWallet,
  firmarJwtRS256,
  generarEnlaceWallet,
  generarEnlaceWalletOficial,
  limpiarCachesWalletPrueba,
  type DatosWallet,
} from "./googleWallet";

const datos: DatosWallet = {
  compraId: "11111111-2222-3333-4444-555555555555",
  codigo: "GC-0001",
  qrId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  cooperativa: "Cooperativa Prueba",
  origen: "Quito",
  destino: "Guayaquil",
  terminalOrigen: "Quitumbe",
  terminalDestino: "Terminal Terrestre",
  salida: "2026-12-01T13:00:00.000Z",
  llegada: "2026-12-01T21:00:00.000Z",
  unidad: "12",
  placa: "PBA-1234",
  servicio: "VIP",
  pasajeros: [
    { reservaAsientoId: "99999999-8888-7777-6666-555555555555", nombre: "Ana Pérez", asiento: "A1", piso: 1 },
    { nombre: "Luis Mora", asiento: "A2", piso: 2 },
  ],
};

test("sin credenciales responde en modo demostración sin lanzar error", () => {
  const r = generarEnlaceWallet(datos, {});
  assert.equal(r.disponible, false);
  if (r.disponible) return;
  assert.equal(r.modo, "DEMO_SIN_CREDENCIALES");
  assert.equal(r.vistaPrevia.barcode, datos.qrId);
  assert.equal(r.vistaPrevia.objetos, 2);
  assert.equal(r.guia, "docs/google-wallet-android.md");
});

test("rechaza configuraciones incompletas o inválidas", () => {
  assert.equal(configuracionWallet({ GOOGLE_WALLET_ISSUER_ID: "abc", GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: "x@y.z", GOOGLE_WALLET_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----" }), null);
  assert.equal(configuracionWallet({ GOOGLE_WALLET_ISSUER_ID: "3388000000012345678" }), null);
});

test("el payload usa TransitClass BUS, logo HTTPS, ticketSeat dentro de ticketLeg y QR igual al qrId", () => {
  const p = construirPayloadWallet(datos, { issuerId: "3388000000012345678", classSuffix: "gc_bus", logoUrl: "https://ejemplo.test/logo.png" });
  assert.equal(p.classId, "3388000000012345678.gc_bus");
  assert.equal(p.transitClass.transitType, "BUS");
  assert.equal((p.transitClass.logo as { sourceUri: { uri: string } }).sourceUri.uri, "https://ejemplo.test/logo.png");
  assert.equal(p.transitObjects.length, 2);
  for (const o of p.transitObjects) {
    assert.equal(o.barcode.type, "QR_CODE");
    assert.equal(o.barcode.value, datos.qrId);
    assert.equal(o.ticketNumber, datos.codigo);
    assert.equal(o.passengerType, "SINGLE_PASSENGER");
    assert.match(o.id, /^3388000000012345678\.[A-Za-z0-9._-]+$/);
    assert.match(o.ticketLeg.departureDateTime, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
  }
  assert.equal(p.transitObjects[0].ticketLeg.ticketSeat.seat, "A1");
  assert.equal(p.transitObjects[1].ticketLeg.ticketSeat.coach, "Piso 2");
  assert.equal(new Set(p.transitObjects.map((o) => o.id)).size, 2);
});

test("firma RS256 verificable y enlace oficial savetowallet", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const jwt = firmarJwtRS256({ prueba: true }, pem);
  const [h, c, f] = jwt.split(".");
  assert.ok(createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, Buffer.from(f, "base64url")));

  const r = generarEnlaceWallet(datos, {
    GOOGLE_WALLET_ISSUER_ID: "3388000000012345678",
    GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: "wallet@proyecto.iam.gserviceaccount.com",
    GOOGLE_WALLET_PRIVATE_KEY: pem.replace(/\n/g, "\\n"),
    FRONTEND_URL: "https://ejemplo.trycloudflare.com",
  });
  assert.equal(r.disponible, true);
  if (!r.disponible) return;
  assert.ok(r.saveUrl.startsWith("https://pay.google.com/gp/v/save/"));
  const token = r.saveUrl.split("/").pop()!;
  const [h2, c2, f2] = token.split(".");
  assert.ok(createVerify("RSA-SHA256").update(`${h2}.${c2}`).verify(publicKey, Buffer.from(f2, "base64url")));
  const claims = JSON.parse(Buffer.from(c2, "base64url").toString());
  assert.equal(claims.aud, "google");
  assert.equal(claims.typ, "savetowallet");
  assert.deepEqual(claims.origins, ["https://ejemplo.trycloudflare.com"]);
  assert.equal(claims.payload.transitObjects[0].barcode.value, datos.qrId);
  assert.equal(claims.payload.transitClasses[0].logo.sourceUri.uri, "https://ejemplo.trycloudflare.com/images/Logo%20G-C.png");
});

test("lee clave privada desde GOOGLE_APPLICATION_CREDENTIALS, usa logo HTTPS por defecto y omite origins HTTP locales", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const dir = mkdtempSync(join(tmpdir(), "gw-json-"));
  const jsonPath = join(dir, "google-wallet.json");
  try {
    writeFileSync(
      jsonPath,
      JSON.stringify({
        client_email: "google-wallet-service@proyecto-test.iam.gserviceaccount.com",
        private_key: pem,
      }),
      "utf8",
    );
    const r = generarEnlaceWallet(datos, {
      GOOGLE_WALLET_ISSUER_ID: "3388000000023251775",
      GOOGLE_WALLET_CLIENT_EMAIL: "google-wallet-service@proyecto-test.iam.gserviceaccount.com",
      GOOGLE_APPLICATION_CREDENTIALS: jsonPath,
      FRONTEND_URL: "http://127.0.0.1:5173",
    });
    assert.equal(r.disponible, true);
    if (!r.disponible) return;
    const token = r.saveUrl.split("/").pop()!;
    const [h, c, f] = token.split(".");
    assert.ok(createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, Buffer.from(f, "base64url")));
    const claims = JSON.parse(Buffer.from(c, "base64url").toString());
    assert.equal(claims.iss, "google-wallet-service@proyecto-test.iam.gserviceaccount.com");
    assert.equal(claims.origins, undefined);
    assert.ok(claims.payload.transitClasses[0].logo.sourceUri.uri.startsWith("https://"));
    assert.equal(claims.payload.transitObjects[0].classId, "3388000000023251775.gran_continental_bus_v1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("generarEnlaceWalletOficial registra clase y objetos en REST API y firma JWT compacto", async () => {
  limpiarCachesWalletPrueba();
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const llamadas: Array<{ url: string; method: string }> = [];
  const mockFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";
    llamadas.push({ url, method });
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return Response.json({ access_token: "tok-prueba", expires_in: 3600 });
    }
    if (method === "GET" && url.includes("/transitClass/")) {
      return Response.json({ error: { message: "not found" } }, { status: 404 });
    }
    if (method === "POST" && url.endsWith("/transitClass")) {
      return Response.json({ id: "3388000000023251775.gran_continental_bus_v1" }, { status: 200 });
    }
    if (method === "POST" && url.endsWith("/transitObject")) {
      const cuerpo = JSON.parse(String(init?.body ?? "{}"));
      return cuerpo.id.endsWith("_1") || cuerpo.id.includes("99999999")
        ? Response.json({ error: { message: "exists" } }, { status: 409 })
        : Response.json({ id: cuerpo.id }, { status: 200 });
    }
    if (method === "PUT" && url.includes("/transitObject/")) {
      return Response.json({ ok: true }, { status: 200 });
    }
    return Response.json({ error: "unexpected" }, { status: 500 });
  }) as typeof fetch;

  const r = await generarEnlaceWalletOficial(
    datos,
    {
      GOOGLE_WALLET_ISSUER_ID: "3388000000023251775",
      GOOGLE_WALLET_CLIENT_EMAIL: "wallet@proyecto.iam.gserviceaccount.com",
      GOOGLE_WALLET_PRIVATE_KEY: pem,
    },
    mockFetch,
  );
  assert.equal(r.disponible, true);
  if (!r.disponible) return;
  const token = r.saveUrl.split("/").pop()!;
  const [h, c, f] = token.split(".");
  assert.ok(createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, Buffer.from(f, "base64url")));
  const claims = JSON.parse(Buffer.from(c, "base64url").toString());
  assert.deepEqual(claims.payload, {
    transitObjects: r.objectIds.map((id) => ({ id })),
  });
  assert.ok(llamadas.some((x) => x.method === "POST" && x.url.endsWith("/transitClass")));
  assert.ok(llamadas.some((x) => x.method === "PUT" && x.url.includes("/transitObject/")));
});
