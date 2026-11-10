import { Pool } from "pg";
import { connectionOptions } from "./config-db.js";
const pool = new Pool(connectionOptions());
try {
  const resultado = await pool.query("SELECT current_user AS rol, version AS version_esquema FROM transporte.schema_version");
  console.log(resultado.rows);
  console.log("Conexión correcta. Sin sesión, las tablas privadas no deben devolver datos.");
} finally { await pool.end(); }
