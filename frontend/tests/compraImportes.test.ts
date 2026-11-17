// Vista 5: importes en centavos, desglose de la cotización y mensajes de error.
import test from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { formatearCentavos, formatearPuntosBase } from "../src/features/compra/dinero.ts";
import { ErrorCompra, erroresPorCampo, mensajeDeError } from "../src/features/compra/errores.ts";
import type { Cotizacion, LineaCotizacion } from "../src/types/compra/cotizacion.ts";

// tsx compila el JSX de los componentes con React.createElement.
(globalThis as { React?: typeof React }).React = React;
const { PriceBreakdown } = await import("../src/components/compra/PriceBreakdown.tsx");

const linea = (extra: Partial<LineaCotizacion>): LineaCotizacion => ({
  tipo_pasajero: "ADULTO",
  reserva_asiento_id: "ra-1",
  asiento_codigo: "U8",
  pasajero: "Pasajero 1",
  clase: "EJECUTIVO",
  beneficio_codigo: null,
  beneficio_nombre: null,
  descuento_bp: null,
  base_centavos: 2800,
  descuento_centavos: 0,
  servicio_centavos: 0,
  impuesto_bp: 0,
  impuesto_servicio_bp: 0,
  iva_centavos: 0,
  subtotal_neto_centavos: 2800,
  total_centavos: 2800,
  ...extra,
});

// Caso del diseño: 2 asientos Ejecutivo de $28.00, uno de un niño con 30 %.
const casoDiseno: Cotizacion = {
  version: 1,
  moneda: "USD",
  base_centavos: 5600,
  descuento_centavos: 840,
  servicio_centavos: 0,
  subtotal_neto_centavos: 4760,
  iva_centavos: 0,
  total_centavos: 4760,
  impuesto_bp: 0,
  expires_at: "2026-11-16T20:00:00-05:00",
  lineas: [
    linea({}),
    linea({
      reserva_asiento_id: "ra-2",
      asiento_codigo: "U9",
      tipo_pasajero: "NINO",
      beneficio_codigo: "NINO",
      beneficio_nombre: "Niño",
      descuento_bp: 3000,
      descuento_centavos: 840,
      subtotal_neto_centavos: 1960,
      total_centavos: 1960,
    }),
  ],
};

const html = (cotizacion: Cotizacion) =>
  renderToStaticMarkup(React.createElement(PriceBreakdown, { cotizacion }));

test("los centavos se muestran con dos decimales y separador de miles", () => {
  assert.equal(formatearCentavos(4760), "$ 47.60");
  assert.equal(formatearCentavos(0), "$ 0.00");
  assert.equal(formatearCentavos(-840), "- $ 8.40");
  assert.equal(formatearCentavos(5), "$ 0.05");
  assert.equal(formatearCentavos(123456789), "$ 1,234,567.89");
});

test("un importe que no es entero de centavos no se muestra como número", () => {
  assert.equal(formatearCentavos(12.5), "—");
  assert.equal(formatearCentavos(Number.NaN), "—");
});

test("los puntos base se muestran como porcentaje", () => {
  assert.equal(formatearPuntosBase(3000), "30 %");
  assert.equal(formatearPuntosBase(0), "0 %");
  assert.equal(formatearPuntosBase(1250), "12.50 %");
});

test("caso del diseño: base 5600 menos 840 da un total de $ 47.60 con IVA 0 %", () => {
  const salida = html(casoDiseno);
  assert.match(salida, /\$ 56\.00/);
  assert.match(salida, /- \$ 8\.40/);
  assert.match(salida, /\$ 19\.60/);
  assert.match(salida, /\$ 47\.60/);
  assert.match(salida, /IVA \(0 %\)/);
  assert.match(salida, /Tarifa de asiento \(Niño\) · U9/);
});

test("un servicio de 0 se muestra como $ 0.00 y no como dato faltante", () => {
  const salida = html(casoDiseno);
  assert.match(salida, /Tarifa de servicio<\/th><td[^>]*>\$ 0\.00/);
});

test("dos asientos Normal de $ 20.00 sin descuento suman $ 40.00", () => {
  const normal = (id: string, asiento: string) =>
    linea({ reserva_asiento_id: id, asiento_codigo: asiento, clase: "NORMAL", base_centavos: 2000, subtotal_neto_centavos: 2000, total_centavos: 2000 });
  const salida = html({
    ...casoDiseno,
    base_centavos: 4000,
    descuento_centavos: 0,
    subtotal_neto_centavos: 4000,
    total_centavos: 4000,
    lineas: [normal("ra-1", "N1"), normal("ra-2", "N2")],
  });
  assert.match(salida, /\$ 40\.00/);
  assert.doesNotMatch(salida, /- \$/);
});

test("el desglose muestra el total del servidor y no lo recalcula", () => {
  const salida = html({ ...casoDiseno, total_centavos: 9999 });
  assert.match(salida, /\$ 99\.99/);
});

test("un error 500 no muestra el detalle del servidor", () => {
  const error = new ErrorCompra(500, { mensaje: "Error: at transporte.cotizar (stack)" });
  const mensaje = mensajeDeError(error);
  assert.doesNotMatch(mensaje, /stack|transporte\./);
  assert.match(mensaje, /más tarde/);
});

test("cada código HTTP tiene su mensaje", () => {
  assert.match(mensajeDeError(new ErrorCompra(0)), /conexión/);
  assert.match(mensajeDeError(new ErrorCompra(401)), /Inicia sesión/);
  assert.match(mensajeDeError(new ErrorCompra(403)), /permiso/);
  assert.match(mensajeDeError(new ErrorCompra(409, { mensaje: "La cotización cambió." })), /cotización cambió/);
  assert.match(mensajeDeError(new Error("interno")), /inesperado/);
});

test("los errores 422 se ubican junto a su campo", () => {
  const error = new ErrorCompra(422, {
    mensaje: "Revisa los datos.",
    errores_campo: [{ campo: "documento", mensaje: "Documento repetido." }],
  });
  assert.deepEqual(erroresPorCampo(error), { documento: "Documento repetido." });
  assert.deepEqual(erroresPorCampo(new Error("x")), {});
});
