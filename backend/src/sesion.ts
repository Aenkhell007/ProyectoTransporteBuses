import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "./database";

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/** Ejecuta consultas con el contexto de sesión en una misma conexión y transacción. */
export async function conSesion<T>(
  token: string,
  trabajo: (cliente: PoolClient) => Promise<T>,
) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query(
      "SELECT transporte.abrir_contexto($1::text, $2::text)",
      [hashToken(token), randomUUID()],
    );
    const resultado = await trabajo(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (error) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    cliente.release();
  }
}
