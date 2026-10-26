import { Router } from "express";
import type { Request, Response, NextFunction, CookieOptions } from "express";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../database";
import { DatosInvalidos, leerCredenciales, leerRegistro } from "./validation";
import { hashPassword, verifyPassword, HASH_SIN_USUARIO } from "./password";

import { correoConfigurado, enviarCorreo, enlaceRecuperacion } from "./brevo";

export const authRouter = Router();
const COOKIE = "transporte_sesion";
const DURACION = 8 * 60 * 60 * 1000;
const opcionesCookie: CookieOptions = {
  httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/api",
};
const origenes = new Set([process.env.FRONTEND_URL ?? "http://127.0.0.1:5173","http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:3000"]);
const intentos = new Map<string, { cantidad: number; vence: number }>();
const limpieza = setInterval(() => {
  for (const [clave, intento] of intentos) if (intento.vence <= Date.now()) intentos.delete(clave);
}, 60_000);
limpieza.unref();

authRouter.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") { next(); return; }
  if ((req.headers.origin && !origenes.has(req.headers.origin)) || req.headers["sec-fetch-site"] === "cross-site") {
    res.status(403).json({ error: "Origen de solicitud no permitido." }); return;
  }
  if (!req.is("application/json")) { res.status(415).json({ error: "Envía los datos como JSON." }); return; }
  const clave = req.ip ?? "local";
  const ahora = Date.now();
  let intento = intentos.get(clave);
  if (!intento || intento.vence <= ahora) {
    if (intentos.size >= 10_000 && !intentos.has(clave)) { res.status(503).json({ error: "Inténtalo más tarde." }); return; }
    intento = { cantidad: 0, vence: ahora + 15 * 60_000 };
    intentos.set(clave, intento);
  }
  if (++intento.cantidad > 30) {
    res.setHeader("Retry-After", Math.ceil((intento.vence - ahora) / 1000));
    res.status(429).json({ error: "Demasiados intentos. Espera unos minutos antes de continuar." }); return;
  }
  next();
});

function codigo(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
}
function errorRespuesta(res: Response, error: unknown) {
  if (error instanceof DatosInvalidos) { res.status(400).json({ error: error.message }); return; }
  if (codigo(error) === "23505") { res.status(409).json({ error: "No se pudo registrar: el correo o documento ya está en uso." }); return; }
  if (codigo(error) === "28000") { res.clearCookie(COOKIE, opcionesCookie); res.status(401).json({ error: "La sesión ha vencido. Inicia sesión otra vez." }); return; }
  console.error("Error de autenticación; código:", codigo(error) ?? "interno");
  res.status(503).json({ error: "El servicio no está disponible. Inténtalo de nuevo." });
}

function tokenPeticion(req: Request): string | null {
  const token: unknown = req.cookies?.[COOKIE];
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function conSesion<T>(token: string, trabajo: (cliente: PoolClient) => Promise<T>) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("SELECT transporte.abrir_contexto($1::text, $2::text)", [hashToken(token), randomUUID()]);
    const resultado = await trabajo(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (error) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { cliente.release(); }
}

async function perfil(cliente: PoolClient) {
  const usuario = await cliente.query(
    "SELECT id, nombres, apellidos, email, email_verificado_at FROM transporte.usuarios WHERE id = transporte.actor()",
  );
  const roles = await cliente.query(`
    SELECT r.codigo FROM transporte.usuario_roles_globales ur JOIN transporte.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=transporte.actor()
    UNION SELECT r.codigo FROM transporte.membresias m JOIN transporte.roles r ON r.id=m.rol_id WHERE m.usuario_id=transporte.actor() AND m.activa
  `);
  return { ...usuario.rows[0], roles: roles.rows.length ? roles.rows.map((r) => r.codigo as string) : ["CLIENTE"] };
}

authRouter.post("/register", async (req, res) => {
  try {
    const datos = leerRegistro(req.body);
    const hash = await hashPassword(datos.password);
    const resultado = await pool.query(
      "SELECT transporte.registrar_cliente($1,$2,$3,$4,$5,$6,$7,$8) AS id",
      [datos.nombres, datos.apellidos, datos.tipoDocumento, datos.documento, datos.email, datos.telefono, hash, "PRUEBA_ACADEMICA_20261026"],
    );
    let correoEnviado = false;
    if (correoConfigurado()) {
      try { await enviarCorreo(datos.email, "Bienvenido a Gran Continental", "Tu cuenta se creó correctamente. Ya puedes iniciar sesión. Si no solicitaste esta cuenta, puedes ignorar este mensaje."); correoEnviado = true; }
      catch { console.error("No se pudo enviar el correo de bienvenida."); }
    }
    res.status(201).json({id:resultado.rows[0].id, correoEnviado, mensaje: "Cuenta creada. Ya puedes iniciar sesión." + (correoEnviado ? " Enviamos un correo de bienvenida." : " El correo de bienvenida no se pudo enviar; tu cuenta sí quedó creada.")});
  } catch (error) { errorRespuesta(res, error); }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = leerCredenciales(req.body);
    const resultado = await pool.query("SELECT * FROM transporte.credencial_login($1)", [email]);
    const credencial = resultado.rows[0];
    const valida = await verifyPassword(password, credencial?.password_hash ?? HASH_SIN_USUARIO);
    if (!credencial?.activo || !valida) { res.status(401).json({ error: "Correo o contraseña incorrectos." }); return; }
    const token = randomBytes(32).toString("base64url");
    // Crear la sesión y cargar el perfil dentro de una única transacción.
    const cliente = await pool.connect();
    let usuario;
    try {
      await cliente.query("BEGIN");
      await cliente.query("SELECT transporte.emitir_sesion_autenticada($1::uuid,$2::text,$3::timestamptz)", [credencial.usuario_id, hashToken(token), new Date(Date.now() + DURACION)]);
      await cliente.query("SELECT transporte.abrir_contexto($1::text,$2::text)", [hashToken(token), randomUUID()]);
      usuario = await perfil(cliente);
      await cliente.query("COMMIT");
    } catch (error) {
      await cliente.query("ROLLBACK").catch(() => {}); throw error;
    } finally { cliente.release(); }
    res.cookie(COOKIE, token, { ...opcionesCookie, maxAge: DURACION });
    res.json({ usuario });
  } catch (error) { errorRespuesta(res, error); }
});

authRouter.get("/me", async (req, res) => {
  const token = tokenPeticion(req);
  if (!token) { res.status(401).json({ error: "Inicia sesión para consultar tu cuenta." }); return; }
  try { res.json({ usuario: await conSesion(token, perfil) }); }
  catch (error) { errorRespuesta(res, error); }
});

authRouter.post("/logout", async (req, res) => {
  const token = tokenPeticion(req);
  try {
    if (token) await conSesion(token, async (cliente) => { await cliente.query("SELECT transporte.cerrar_sesion($1)", [hashToken(token)]); });
    res.clearCookie(COOKIE, opcionesCookie);
    res.status(204).end();
  } catch (error) {
    if (codigo(error) === "28000") { res.clearCookie(COOKIE, opcionesCookie); res.status(204).end(); }
    else errorRespuesta(res, error);
  }
});

authRouter.post("/password/forgot", async (req, res) => {
  const inicio = Date.now();
  try {
    const datos = req.body as Record<string, unknown> | undefined;
    const email = typeof datos?.email === "string" ? datos.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DatosInvalidos("Ingresa un correo válido.");
    if (!correoConfigurado()) {res.status(503).json({error:"El servicio de correo todavía no está configurado."}); return;}
    const token = randomBytes(32).toString("base64url");
    const enlace = enlaceRecuperacion(token);
    const cliente = await pool.connect();
    try {
      await cliente.query("BEGIN");
      const credencial = await cliente.query("SELECT * FROM transporte.credencial_login($1)", [email]);
      await cliente.query("SELECT transporte.solicitar_recuperacion($1,$2)", [email, hashToken(token)]);
      if (credencial.rows[0]?.activo) {
        await enviarCorreo(email, "Recupera tu contraseña — Gran Continental", `Recibimos una solicitud para cambiar tu contraseña.\n\nAbre este enlace:\n${enlace}\n\nVence en 30 minutos y solo puede usarse una vez. Si no lo solicitaste, ignora este correo.`);
      }
      await cliente.query("COMMIT");
    } catch (error) {
      await cliente.query("ROLLBACK").catch(() => {});
      // Respuesta pública uniforme: no revela si existe una dirección o falló su envío.
      console.error("No se pudo completar la solicitud de recuperación.");
    } finally {cliente.release();}
    const restante = 600 - (Date.now() - inicio);
    if (restante > 0) await new Promise(resolve => setTimeout(resolve, restante));
    res.json({mensaje:"Si existe una cuenta activa con ese correo, recibirás un enlace para recuperar el acceso."});
  } catch (error) {errorRespuesta(res,error);}
});

authRouter.post("/password/reset", async (req, res) => {
  try {
    const datos = req.body as Record<string, unknown> | undefined;
    const token = datos?.token;
    const password = datos?.password;
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new DatosInvalidos("El enlace no es válido. Solicita uno nuevo.");
    if (typeof password !== "string" || password.length < 8 || password.length > 128) throw new DatosInvalidos("La contraseña debe tener entre 8 y 128 caracteres.");
    const hash = await hashPassword(password);
    try {await pool.query("SELECT transporte.restablecer_password($1,$2)",[hashToken(token),hash]);}
    catch (error) {
      if (codigo(error) === "P0001") throw new DatosInvalidos("El enlace venció o ya fue utilizado. Solicita uno nuevo.");
      throw error;
    }
    res.clearCookie(COOKIE,opcionesCookie);
    res.json({mensaje:"Contraseña actualizada. Inicia sesión con tu nueva contraseña."});
  } catch (error) {errorRespuesta(res,error);}
});
