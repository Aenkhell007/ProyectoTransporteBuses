import { config } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { Pool } from "pg";

const carpetasEnv = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "conexion-bd/.env"),
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../conexion-bd/.env"),
  resolve(__dirname, "../../../.env"),
  resolve(__dirname, "../../../conexion-bd/.env"),
];
for (const ruta of carpetasEnv) {
  if (existsSync(ruta)) config({ path: ruta, quiet: true });
}
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL en las variables de entorno o backend/conexion-bd/.env");

function resolverArchivoCa(ca: string | undefined): string | undefined {
  if (!ca) return undefined;
  const candidatos = [
    ...(isAbsolute(ca) ? [ca] : []),
    resolve(process.cwd(), ca),
    resolve(process.cwd(), "conexion-bd", ca),
    resolve(__dirname, "../conexion-bd", ca),
    resolve(__dirname, "../../../conexion-bd", ca),
  ];
  return candidatos.find((r) => existsSync(r));
}

export function crearPool(connectionString: string, max = 15) {
  const url = new URL(connectionString);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (process.env.DB_SSL === "false" && !local) throw new Error("TLS solo se desactiva en PostgreSQL local");
  for (const k of ["sslmode", "sslcert", "sslrootcert", "sslkey", "sslidentity", "sslaccept", "schema"]) {
    url.searchParams.delete(k);
  }
  const rutaCa = resolverArchivoCa(process.env.DB_SSL_CA_FILE);
  return new Pool({
    connectionString: url.toString(),
    ssl:
      process.env.DB_SSL === "false"
        ? false
        : {
            rejectUnauthorized: true,
            ...(rutaCa ? { ca: readFileSync(rutaCa, "utf8") } : {}),
          },
    min: 1,
    max,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 60000,
    statement_timeout: 15000,
    idle_in_transaction_session_timeout: 15000,
    keepAlive: true,
  });
}

const maxConexiones = Math.min(50, Math.max(5, Number(process.env.PG_POOL_MAX ?? 15) || 15));
export const pool = crearPool(process.env.DATABASE_URL, maxConexiones);

// El pool retira las conexiones inactivas fallidas y crea otras cuando se necesitan.
pool.on("error", () => console.error("Se perdió una conexión inactiva con la base de datos. Se abrirá otra cuando sea necesaria."));
