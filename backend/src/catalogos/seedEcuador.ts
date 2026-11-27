import { crearPool } from "../database";
import { PROVINCIAS_CANTONES_ECUADOR } from "./ecuadorDpa";
import { sincronizarCatalogoEcuador } from "./sincronizarEcuador";

async function main() {
  const url = process.env.DIRECT_URL || process.env.MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DIRECT_URL, MIGRATION_URL o DATABASE_URL en .env");
  }
  const pool = crearPool(url, 2);
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const res = await sincronizarCatalogoEcuador(cliente);
    const total = await cliente.query(
      "SELECT count(DISTINCT provincia)::int provincias, count(*)::int cantones FROM transporte.ciudades WHERE activa",
    );
    const terminales = await cliente.query(
      "SELECT count(*)::int terminales FROM transporte.terminales WHERE activa",
    );
    await cliente.query("COMMIT");
    console.log(
      JSON.stringify({
        esperadoProvincias: PROVINCIAS_CANTONES_ECUADOR.length,
        esperadoCantones: PROVINCIAS_CANTONES_ECUADOR.reduce((n, p) => n + p.cantones.length, 0),
        ciudadesInsertadas: res.ciudadesInsertadas,
        terminalesInsertadas: res.terminalesInsertadas,
        activosEnBd: {
          ...total.rows[0],
          terminales: terminales.rows[0].terminales,
        },
      }),
    );
  } catch (e) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    cliente.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Error sincronizando catálogo DPA:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
