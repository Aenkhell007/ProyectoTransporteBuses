import { Pool } from "pg";
import { hashPassword } from "./password.js";
import { connectionOptions } from "./config-db.js";
const required = (key: string) => { const value=process.env[key]?.trim(); if(!value) throw new Error(`Falta ${key}`); return value; };
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length<12) throw new Error("Proporciona ADMIN_PASSWORD temporal de al menos12 caracteres");
const pool = new Pool(connectionOptions("DIRECT_URL"));
const db = await pool.connect();
try {
  await db.query("BEGIN");
  const rol=await db.query("SELECT id FROM transporte.roles WHERE codigo='ADMIN_SISTEMA' FOR UPDATE");
  if(rol.rowCount!==1) throw new Error("Instala primero el esquema SQL");
  const user=await db.query("INSERT INTO transporte.usuarios(nombres,apellidos,tipo_documento,documento,email) VALUES($1,$2,$3,$4,lower($5)) RETURNING id",[required("ADMIN_NOMBRES"),required("ADMIN_APELLIDOS"),process.env.ADMIN_TIPO_DOCUMENTO||"CEDULA",required("ADMIN_DOCUMENTO"),required("ADMIN_EMAIL")]);
  await db.query("INSERT INTO transporte.credenciales(usuario_id,password_hash) VALUES($1,$2)",[user.rows[0].id,hashPassword(password)]);
  await db.query("INSERT INTO transporte.usuario_roles_globales(usuario_id,rol_id) VALUES($1,$2)",[user.rows[0].id,rol.rows[0].id]);
  await db.query("COMMIT"); console.log("Administrador creado; no se imprime contraseña ni cadena de conexión.");
} catch(error) { await db.query("ROLLBACK"); throw error; }
finally { db.release(); await pool.end(); delete process.env.ADMIN_PASSWORD; }
