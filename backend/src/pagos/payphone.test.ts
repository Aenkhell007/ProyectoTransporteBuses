import test from "node:test";
import assert from "node:assert/strict";
import {
  generarClientTransactionId,
  construirMontosPayphone,
  prepararPagoPayphone,
  confirmarPagoPayphone,
} from "./payphone";

test("payphone: genera clientTransactionId estable de 15 caracteres alfanuméricos", () => {
  const id = generarClientTransactionId("123e4567-e89b-12d3-a456-426614174000");
  assert.equal(id, "PP123E4567E89B1");
  assert.match(id, /^PP[A-Z0-9]{13}$/);
  assert.throws(() => generarClientTransactionId("abc"), { status: 422 });
});

test("payphone: construye desglose de montos exacto sin IVA y con IVA", () => {
  const sinIva = construirMontosPayphone(2500, 0, 200);
  assert.deepEqual(sinIva, {
    amount: 2500,
    amountWithTax: 0,
    amountWithoutTax: 2500,
    tax: 0,
    service: 0,
    tip: 0,
  });

  const conIva = construirMontosPayphone(2530, 30, 200);
  assert.deepEqual(conIva, {
    amount: 2530,
    amountWithTax: 200,
    amountWithoutTax: 2300,
    tax: 30,
    service: 0,
    tip: 0,
  });
  assert.equal(
    conIva.amountWithTax + conIva.amountWithoutTax + conIva.tax + conIva.service + conIva.tip,
    conIva.amount,
  );

  assert.throws(() => construirMontosPayphone(0, 0), { status: 422 });
  assert.throws(() => construirMontosPayphone(100, 150), { status: 422 });
});

test("payphone: prepararPagoPayphone envía Bearer token, storeId opcional y valida URL HTTPS", async () => {
  const prevToken = process.env.PAYPHONE_TOKEN;
  const prevStore = process.env.PAYPHONE_STORE_ID;
  try {
    delete process.env.PAYPHONE_TOKEN;
    await assert.rejects(
      prepararPagoPayphone({
        clientTransactionId: "PP123E4567E89B1",
        montos: construirMontosPayphone(1500, 0),
        referencia: "Boleto Ambato-Quito",
      }),
      { status: 503 },
    );

    process.env.PAYPHONE_TOKEN = "token-secreto-prueba";
    process.env.PAYPHONE_STORE_ID = "store-001";
    let recibidoUrl = "";
    let recibidoAuth = "";
    let recibidoBody: Record<string, unknown> = {};

    const resp = await prepararPagoPayphone(
      {
        clientTransactionId: "PP123E4567E89B1",
        montos: construirMontosPayphone(1500, 0),
        referencia: "Boleto Ambato-Quito",
        reservaId: "11111111-2222-3333-4444-555555555555",
        email: "pasajero@example.com",
      },
      (async (url: string | URL | Request, init?: RequestInit) => {
        recibidoUrl = String(url);
        recibidoAuth = String((init?.headers as Record<string, string>)?.Authorization ?? "");
        recibidoBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            paymentId: 987654,
            payWithCard: "https://pay.payphonetodoesposible.com/checkout/card",
            payWithPayPhone: "https://pay.payphonetodoesposible.com/checkout/app",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch,
    );

    assert.equal(recibidoUrl, "https://pay.payphonetodoesposible.com/api/button/Prepare");
    assert.equal(recibidoAuth, "Bearer token-secreto-prueba");
    assert.equal(recibidoBody.storeId, "store-001");
    assert.equal(recibidoBody.amount, 1500);
    const cancelUrl = new URL(String(recibidoBody.cancellationUrl));
    assert.equal(cancelUrl.searchParams.get("reserva_id"), "11111111-2222-3333-4444-555555555555");
    assert.equal(cancelUrl.searchParams.get("payphone"), "cancelado");
    assert.equal(cancelUrl.searchParams.get("clientTransactionId"), "PP123E4567E89B1");
    assert.equal(resp.paymentId, "987654");
    assert.equal(resp.payWithCard, "https://pay.payphonetodoesposible.com/checkout/card");

    await assert.rejects(
      prepararPagoPayphone(
        {
          clientTransactionId: "PP123E4567E89B1",
          montos: construirMontosPayphone(1500, 0),
          referencia: "Boleto Ambato-Quito",
        },
        (async () =>
          new Response(JSON.stringify({ message: "Token inválido" }), {
            status: 401,
          })) as typeof fetch,
      ),
      { status: 502 },
    );
  } finally {
    if (prevToken === undefined) delete process.env.PAYPHONE_TOKEN;
    else process.env.PAYPHONE_TOKEN = prevToken;
    if (prevStore === undefined) delete process.env.PAYPHONE_STORE_ID;
    else process.env.PAYPHONE_STORE_ID = prevStore;
  }
});

test("payphone: adapta responseUrl y cancellationUrl al túnel Cloudflare autorizado cuando .env es local", async () => {
  const prevToken = process.env.PAYPHONE_TOKEN;
  const prevResp = process.env.PAYPHONE_RESPONSE_URL;
  const prevCanc = process.env.PAYPHONE_CANCELLATION_URL;
  const prevEnv = process.env.NODE_ENV;
  try {
    delete process.env.NODE_ENV;
    process.env.PAYPHONE_TOKEN = "token-secreto-prueba";
    process.env.PAYPHONE_RESPONSE_URL = "http://127.0.0.1:5173/pago/payphone/respuesta";
    process.env.PAYPHONE_CANCELLATION_URL = "http://127.0.0.1:5173/pago";

    let recibidoTunel: Record<string, unknown> = {};
    await prepararPagoPayphone(
      {
        clientTransactionId: "PP123E4567E89B1",
        montos: construirMontosPayphone(1500, 0),
        referencia: "Boleto Ambato-Quito",
        reservaId: "11111111-2222-3333-4444-555555555555",
        origenSolicitud: "https://defensa-demo.trycloudflare.com",
      },
      (async (_url: string | URL | Request, init?: RequestInit) => {
        recibidoTunel = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            paymentId: 111,
            payWithCard: "https://pay.payphonetodoesposible.com/checkout/card",
          }),
          { status: 200 },
        );
      }) as typeof fetch,
    );

    assert.equal(
      recibidoTunel.responseUrl,
      "https://defensa-demo.trycloudflare.com/pago/payphone/respuesta",
    );
    const cancelTunel = new URL(String(recibidoTunel.cancellationUrl));
    assert.equal(cancelTunel.origin, "https://defensa-demo.trycloudflare.com");
    assert.equal(cancelTunel.pathname, "/pago");
    assert.equal(cancelTunel.searchParams.get("reserva_id"), "11111111-2222-3333-4444-555555555555");
    assert.equal(cancelTunel.searchParams.get("payphone"), "cancelado");
    assert.equal(cancelTunel.searchParams.get("clientTransactionId"), "PP123E4567E89B1");

    let recibidoAjeno: Record<string, unknown> = {};
    await prepararPagoPayphone(
      {
        clientTransactionId: "PP123E4567E89B1",
        montos: construirMontosPayphone(1500, 0),
        referencia: "Boleto Ambato-Quito",
        reservaId: "11111111-2222-3333-4444-555555555555",
        origenSolicitud: "https://ajeno.invalid",
      },
      (async (_url: string | URL | Request, init?: RequestInit) => {
        recibidoAjeno = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            paymentId: 112,
            payWithCard: "https://pay.payphonetodoesposible.com/checkout/card",
          }),
          { status: 200 },
        );
      }) as typeof fetch,
    );

    assert.equal(recibidoAjeno.responseUrl, "http://127.0.0.1:5173/pago/payphone/respuesta");
    assert.equal(new URL(String(recibidoAjeno.cancellationUrl)).origin, "http://127.0.0.1:5173");
  } finally {
    if (prevToken === undefined) delete process.env.PAYPHONE_TOKEN;
    else process.env.PAYPHONE_TOKEN = prevToken;
    if (prevResp === undefined) delete process.env.PAYPHONE_RESPONSE_URL;
    else process.env.PAYPHONE_RESPONSE_URL = prevResp;
    if (prevCanc === undefined) delete process.env.PAYPHONE_CANCELLATION_URL;
    else process.env.PAYPHONE_CANCELLATION_URL = prevCanc;
    if (prevEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevEnv;
  }
});

test("payphone: confirmarPagoPayphone clasifica APROBADO (3), CANCELADO (2) y PENDIENTE", async () => {
  const prevToken = process.env.PAYPHONE_TOKEN;
  process.env.PAYPHONE_TOKEN = "token-secreto-prueba";
  try {
    const aprobado = await confirmarPagoPayphone(
      { id: 1001, clientTxId: "PP123E4567E89B1" },
      (async () =>
        new Response(
          JSON.stringify({
            statusCode: 3,
            transactionStatus: "Approved",
            transactionId: 1001,
            clientTransactionId: "PP123E4567E89B1",
            amount: 1500,
            authorizationCode: "AUT-777",
          }),
          { status: 200 },
        )) as typeof fetch,
    );
    assert.equal(aprobado.estado, "APROBADO");
    assert.equal(aprobado.authorizationCode, "AUT-777");
    assert.equal(aprobado.amount, 1500);

    const cancelado = await confirmarPagoPayphone(
      { id: 1002, clientTxId: "PP123E4567E89B1" },
      (async () =>
        new Response(
          JSON.stringify({
            statusCode: 2,
            transactionStatus: "Canceled",
            transactionId: 1002,
            clientTransactionId: "PP123E4567E89B1",
            amount: 1500,
            message: "Usuario canceló",
          }),
          { status: 200 },
        )) as typeof fetch,
    );
    assert.equal(cancelado.estado, "CANCELADO");

    const pendiente = await confirmarPagoPayphone(
      { id: 1003, clientTxId: "PP123E4567E89B1" },
      (async () =>
        new Response(
          JSON.stringify({
            statusCode: 1,
            transactionStatus: "Pending",
            transactionId: 1003,
            clientTransactionId: "PP123E4567E89B1",
            amount: 1500,
          }),
          { status: 200 },
        )) as typeof fetch,
    );
    assert.equal(pendiente.estado, "PENDIENTE");
  } finally {
    if (prevToken === undefined) delete process.env.PAYPHONE_TOKEN;
    else process.env.PAYPHONE_TOKEN = prevToken;
  }
});
