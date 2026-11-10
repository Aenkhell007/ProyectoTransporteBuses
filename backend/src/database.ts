import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

const carpeta = resolve(__dirname, "../conexion-bd");
config({path: resolve(__dirname, "../.env"), quiet: true});
config({path: resolve(carpeta, ".env"), quiet: true});
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL en backend/conexion-bd/.env");
const url = new URL(process.env.DATABASE_URL);
const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
if (process.env.DB_SSL === "false" && !local) throw new Error("TLS solo se desactiva en PostgreSQL local");
for (const k of ["sslmode","sslcert","sslrootcert","sslkey","sslidentity","sslaccept","schema"]) url.searchParams.delete(k);
const ca = process.env.DB_SSL_CA_FILE;
export const pool = new Pool({connectionString:url.toString(), ssl:process.env.DB_SSL === "false" ? false : {rejectUnauthorized:true,...(ca ? {ca:readFileSync(resolve(carpeta,ca),"utf8")} : {})}, max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});
