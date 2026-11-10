import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ModalPermisos from "../src/components/ModalPermisos";

const props = {
  userName: "Usuario de prueba",
  initialPermisos: {
    venta: true,
    revisarComprobantes: false,
    publicarViajes: true,
    administrarCooperativas: false,
  },
  onClose() {},
  onSave() {},
};

test("al abrir, el modal real muestra los permisos recibidos y etiquetas asociadas", () => {
  const html = renderToStaticMarkup(
    createElement(ModalPermisos, { ...props, isOpen: true }),
  );

  assert.match(html, /role="dialog"/);
  for (const [id, marcado] of [
    ["chk-venta", true],
    ["chk-revisar", false],
    ["chk-publicar", true],
    ["chk-admin", false],
  ] as const) {
    const checkbox = html.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>'));
    assert.ok(checkbox, "Falta el control " + id);
    assert.equal(checkbox[0].includes('checked=""'), marcado, id);
    assert.ok(html.includes('for="' + id + '"'), "Falta la etiqueta de " + id);
  }
});

test("el modal cerrado no renderiza controles de permisos", () => {
  const html = renderToStaticMarkup(
    createElement(ModalPermisos, { ...props, isOpen: false }),
  );
  assert.equal(html, "");
});
