import type { PoolClient } from "pg";
import { crearPool } from "../database";
import { PROVINCIAS_CANTONES_ECUADOR } from "./ecuadorDpa";

let catalogoEcuadorSincronizado = false;

export function estaCatalogoEcuadorSincronizado() {
  return catalogoEcuadorSincronizado;
}

async function ejecutarConSavepoint(db: PoolClient, nombre: string, fn: () => Promise<void>): Promise<boolean> {
  await db.query(`SAVEPOINT ${nombre}`);
  try {
    await fn();
    await db.query(`RELEASE SAVEPOINT ${nombre}`);
    return true;
  } catch {
    await db.query(`ROLLBACK TO SAVEPOINT ${nombre}`);
    await db.query(`RELEASE SAVEPOINT ${nombre}`);
    return false;
  }
}

export async function sincronizarCatalogoEcuador(db: PoolClient): Promise<{
  ciudadesInsertadas: number;
  terminalesInsertadas: number;
}> {
  const provincias = PROVINCIAS_CANTONES_ECUADOR.map((p) => p.provincia);
  const nombres: string[] = [];
  const provinciasDeCanton: string[] = [];
  for (const item of PROVINCIAS_CANTONES_ECUADOR) {
    for (const canton of item.cantones) {
      nombres.push(canton);
      provinciasDeCanton.push(item.provincia);
    }
  }

  await ejecutarConSavepoint(db, "sync_ecuador_provincias", async () => {
    await db.query(
      "INSERT INTO transporte.provincias(nombre) SELECT u FROM unnest($1::text[]) AS u ON CONFLICT DO NOTHING",
      [provincias],
    );
  });

  const cRes = await db.query(
    `INSERT INTO transporte.ciudades(nombre, provincia)
     SELECT u.nombre, u.provincia
     FROM unnest($1::text[], $2::text[]) AS u(nombre, provincia)
     ON CONFLICT (nombre, provincia) DO NOTHING`,
    [nombres, provinciasDeCanton],
  );

  await ejecutarConSavepoint(db, "sync_ecuador_prov_id", async () => {
    await db.query(
      `UPDATE transporte.ciudades c
       SET provincia_id = p.id
       FROM transporte.provincias p
       WHERE c.provincia_id IS NULL AND lower(trim(c.provincia)) = lower(p.nombre)`,
    );
  });

  const tRes = await db.query(
    `INSERT INTO transporte.terminales(ciudad_id, nombre)
     SELECT c.id, 'Terminal Terrestre ' || c.nombre
     FROM transporte.ciudades c
     WHERE c.activa
       AND NOT EXISTS (
         SELECT 1 FROM transporte.terminales t
         WHERE t.ciudad_id = c.id AND t.activa
       )
     ON CONFLICT (ciudad_id, nombre) DO NOTHING`,
  );

  catalogoEcuadorSincronizado = true;
  return {
    ciudadesInsertadas: cRes.rowCount ?? 0,
    terminalesInsertadas: tRes.rowCount ?? 0,
  };
}

/** Ejecuta la sincronización dentro de un SAVEPOINT seguro en transacciones activas. */
export async function sincronizarCatalogoEnTransaccion(db: PoolClient): Promise<boolean> {
  if (catalogoEcuadorSincronizado) return false;
  let cambiado = false;
  await ejecutarConSavepoint(db, "sync_ecuador_dpa", async () => {
    const res = await sincronizarCatalogoEcuador(db);
    cambiado = res.ciudadesInsertadas > 0 || res.terminalesInsertadas > 0;
  });
  return cambiado;
}

export async function asegurarCatalogoEcuadorEnArranque(): Promise<void> {
  const url = process.env.DIRECT_URL || process.env.MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) return;
  const p = crearPool(url, 2);
  let cliente: PoolClient | undefined;
  try {
    cliente = await p.connect();
    await cliente.query("BEGIN");
    await sincronizarCatalogoEcuador(cliente);
    await cliente.query("COMMIT");
  } catch {
    if (cliente) await cliente.query("ROLLBACK").catch(() => {});
  } finally {
    cliente?.release();
    await p.end().catch(() => {});
  }
}
