import { Router } from "express";
import type { Request, Response, NextFunction, CookieOptions } from "express";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../database";
import { DatosInvalidos, leerCredenciales, leerRegistro } from "./validation";
import { hashPassword, verifyPassword, HASH_SIN_USUARIO } from "./password";

import { correoConfigurado, enviarCorreo, enlaceRecuperacion } from "./brevo";
import { prepararActivacion, enviarActivacion, procesarBienvenidas, registrarErrorCorreo } from "./activacion";
import { correoRecuperacion } from "./correos";

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
  if (codigo(error) === "PAV02") { res.clearCookie(COOKIE, opcionesCookie); res.status(403).json({error:"Tu cuenta está pendiente de activación. Abre el enlace enviado a tu correo o solicita uno nuevo.",codigo:"CUENTA_NO_ACTIVADA"}); return; }
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
    if (!correoConfigurado()) { res.status(503).json({error:"El registro no está disponible temporalmente. Inténtalo más tarde."}); return; }
    const hash = await hashPassword(datos.password);
    const cliente = await pool.connect();
    let id: string;
    let solicitud: Awaited<ReturnType<typeof prepararActivacion>>;
    try {
      await cliente.query("BEGIN");
      const resultado = await cliente.query("SELECT transporte.registrar_cliente($1,$2,$3,$4,$5,$6,$7,$8) AS id",
        [datos.nombres,datos.apellidos,datos.tipoDocumento,datos.documento,datos.email,datos.telefono,hash,"PRUEBA_ACADEMICA_20261026"]);
      id = resultado.rows[0].id;
      solicitud = await prepararActivacion(datos.email,cliente);
      await cliente.query("COMMIT");
    } catch(error) { await cliente.query("ROLLBACK").catch(()=>{}); throw error; }
    finally { cliente.release(); }
    let correoAceptado = false;
    if (solicitud) {
      try { await enviarActivacion(solicitud); correoAceptado = true; }
      catch(error) { registrarErrorCorreo(error); }
    }
    res.status(201).json({id,activacionRequerida:true,correoAceptado,mensaje:
      "Tu cuenta se creó correctamente. Para iniciar sesión, debes activarla mediante el enlace enviado a tu correo electrónico. " +
      (correoAceptado ? "Revisa tu bandeja de entrada y la carpeta de spam. El enlace vence en 60 minutos." : "No pudimos confirmar el envío del correo. Tu cuenta está guardada; solicita un nuevo enlace de activación en unos minutos.")});
  } catch(error) { errorRespuesta(res,error); }
});

authRouter.post("/activation/resend",async(req,res)=>{
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DatosInvalidos("Ingresa un correo válido.");
    if (!correoConfigurado()) { res.status(503).json({error:"El servicio de correo no está disponible temporalmente."}); return; }
    const solicitud = await prepararActivacion(email);
    if (solicitud) { try {await enviarActivacion(solicitud);} catch(error) {registrarErrorCorreo(error);} }
    res.json({mensaje:"Si existe una cuenta pendiente de activación y el tiempo de espera lo permite, recibirás un nuevo enlace. Revisa tu bandeja de entrada y spam. Espera al menos un minuto antes de solicitar otro correo."});
  } catch(error) {errorRespuesta(res,error);}
});

authRouter.post("/activation/confirm",async(req,res)=>{
  try {
    const token = req.body?.token;
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new DatosInvalidos("El enlace de activación no es válido. Solicita uno nuevo.");
    await pool.query("SELECT transporte.confirmar_activacion($1)",[hashToken(token)]);
    void procesarBienvenidas();
    res.json({mensaje:"Tu cuenta ha sido activada correctamente. Ya puedes iniciar sesión en Gran Continental."});
  } catch(error) {
    if(codigo(error)==="PAV01") {res.status(400).json({error:"El enlace de activación venció, ya fue utilizado o no es válido. Si tu cuenta ya está activada, inicia sesión; de lo contrario, solicita otro enlace."});return;}
    errorRespuesta(res,error);
  }
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
        const contenido = correoRecuperacion(enlace);
        await enviarCorreo(email,contenido.subject,contenido.textContent,{htmlContent:contenido.htmlContent});
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
