import test from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// tsx compila el JSX de los componentes con React.createElement.
(globalThis as { React?: typeof React }).React = React;
const { ImporteMiViaje } = await import("../src/components/compra/ImporteMiViaje.tsx");

const base = {
  tipo: "RESERVA" as const,
  total_pagado_centavos: null,
};
const html = (viaje: Parameters<typeof ImporteMiViaje>[0]["viaje"] & { monto_reportado_centavos?: number | null }) =>
  renderToStaticMarkup(React.createElement(ImporteMiViaje, { viaje }));

test("en verificación muestra el monto esperado y no un monto reportado", () => {
  const salida = html({ ...base, estado: "PAGO_EN_VERIFICACION", monto_esperado_centavos: 4760, monto_reportado_centavos: 9999 });
  assert.match(salida, /Importe por verificar/);
  assert.match(salida, /\$ 47\.60/);
  assert.doesNotMatch(salida, /99\.99/);
  assert.doesNotMatch(salida, /reportad/i);
});

test("en verificación sin monto esperado no muestra $ 0.00", () => {
  const salida = html({ ...base, estado: "PAGO_EN_VERIFICACION", monto_esperado_centavos: null });
  assert.match(salida, /Por cotizar/);
  assert.doesNotMatch(salida, /\$ 0\.00/);
});

test("una compra confirmada muestra el total pagado", () => {
  const salida = html({ tipo: "COMPRA", estado: "CONFIRMADA", total_pagado_centavos: 4000, monto_esperado_centavos: 4760 });
  assert.match(salida, /Total pagado/);
  assert.match(salida, /\$ 40\.00/);
});
