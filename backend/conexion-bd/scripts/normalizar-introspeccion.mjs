import { readFileSync, writeFileSync } from "node:fs";
const path = new URL("../prisma/schema.prisma", import.meta.url);
let text = readFileSync(path, "utf8");
// Prisma7.10 introspecta estos índices PARCIALES como si fueran una relación1:1
// global. En SQL solo son únicos para estados activos; el historial sigue siendo1:N.
// No se modifica la base ni se elimina ningún índice SQL.
for (const name of ["un_intento_pendiente", "una_politica_publicada", "reembolso_activo"]) {
  const expression = new RegExp(`@unique\\(map: "${name}", where: raw\\("[^\\n]*?"\\)\\)`, "g");
  text = text.replace(expression, "");
}
for (const [model, field, related] of [
  ["reservas", "intentos_pago", "intentos_pago"],
  ["compras", "solicitudes_reembolso", "solicitudes_reembolso"],
  ["cooperativas", "politicas_reembolso", "politicas_reembolso"],
]) {
  const block = new RegExp(`(model ${model} \\{[\\s\\S]*?)(\\n\\})`);
  text = text.replace(block, (_, body, close) => body.replace(new RegExp(`(\\n\\s*${field}\\s+)${related}\\?`), `$1${related}[]`) + close);
}
writeFileSync(path, text, "utf8");
console.log("Relaciones históricas1:N normalizadas; índices parciales conservados en SQL.");
