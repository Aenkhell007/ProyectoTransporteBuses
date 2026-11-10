import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

// Esta prueba usa un cliente simulado: no abre conexiones ni carga credenciales reales.
process.env.DATABASE_URL = "postgresql://prueba:prueba@127.0.0.1:1/prueba";
const { pool } = require("./database") as typeof import("./database");
const { conSesion } = require("./sesion") as typeof import("./sesion");

for (const fallo of [null, "contexto", "trabajo", "commit", "rollback"] as const) {
  test(`sesión: ${fallo ?? "confirmación correcta"}`, async (t) => {
    const consultas: { sql: string; valores?: unknown[] }[] = [];
    let liberaciones = 0;
    let trabajoEjecutado = false;
    const errorOriginal = new Error("Fallo simulado");
    const cliente = {
      async query(sql: string, valores?: unknown[]) {
        consultas.push({ sql, valores });
        if (fallo === "contexto" && sql.includes("abrir_contexto")) throw errorOriginal;
        if (fallo === "commit" && sql === "COMMIT") throw errorOriginal;
        if (fallo === "rollback" && sql === "ROLLBACK") throw new Error("Fallo al revertir");
        return { rows: [] };
      },
      release() { liberaciones++; },
    } as unknown as PoolClient;
    t.mock.method(pool, "connect", (async () => cliente) as unknown as typeof pool.connect);
    const token = "token-ficticio";
    const ejecutar = () => conSesion(token, async (conexion) => {
      trabajoEjecutado = true;
      assert.equal(conexion, cliente);
      if (fallo === "trabajo" || fallo === "rollback") throw errorOriginal;
      await conexion.query("SELECT prueba");
      return 42;
    });

    if (fallo) await assert.rejects(ejecutar, (error) => error === errorOriginal);
    else assert.equal(await ejecutar(), 42);
    assert.equal(consultas[0].sql, "BEGIN");
    assert.match(consultas[1].sql, /transporte\.abrir_contexto/);
    assert.equal(consultas[1].valores?.[0], createHash("sha256").update(token).digest("hex"));
    assert.match(String(consultas[1].valores?.[1]), /^[0-9a-f-]{36}$/);
    assert.equal(trabajoEjecutado, fallo !== "contexto");
    assert.equal(consultas.at(-1)?.sql, fallo ? "ROLLBACK" : "COMMIT");
    assert.equal(liberaciones, 1);
  });
}

test("no ejecuta el trabajo si no consigue una conexión", async (t) => {
  const errorOriginal = new Error("Pool no disponible");
  t.mock.method(pool, "connect", (async () => { throw errorOriginal; }) as unknown as typeof pool.connect);
  await assert.rejects(
    () => conSesion("token-ficticio", async () => assert.fail("No debe ejecutar consultas")),
    (error) => error === errorOriginal,
  );
});
