import "dotenv/config";
import { readFileSync } from "node:fs";
import type { PoolConfig } from "pg";
export function connectionOptions(variable = "DATABASE_URL"): PoolConfig {
  const raw = process.env[variable];
  if (!raw) throw new Error(`Falta ${variable}`);
  const uri = new URL(raw);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname);
  const withoutTLS = process.env.DB_SSL === "false";
  if (withoutTLS && !local) throw new Error("TLS solo se desactiva en PostgreSQL local");
  // Evitar que sslmode en la URL reemplace la validación explícita de pg.
  for (const key of ["sslmode", "sslcert", "sslrootcert", "sslkey", "sslidentity", "sslaccept", "schema"])
    uri.searchParams.delete(key);
  const ca = process.env.DB_SSL_CA_FILE;
  return {
    connectionString: uri.toString(),
    ssl: withoutTLS ? false : { rejectUnauthorized: true, ...(ca ? { ca: readFileSync(ca, "utf8") } : {}) },
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  };
}
