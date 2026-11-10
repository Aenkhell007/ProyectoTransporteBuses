import { randomBytes, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../database";
import { correoConfigurado, enviarCorreo, enlaceActivacion, enlacePlataforma, ErrorCorreo } from "./brevo";
import { correoActivacion, correoBienvenida } from "./correos";

type Consultor = Pick<PoolClient,"query">;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function prepararActivacion(email: string, db: Consultor = pool) {
  const token = randomBytes(32).toString("base64url");
  const resultado = await db.query("SELECT * FROM transporte.solicitar_activacion($1,$2)", [email,hash(token)]);
  const destinatario = resultado.rows[0] as {destinatario:string;nombre:string} | undefined;
  return destinatario ? {...destinatario,token} : null;
}

export async function enviarActivacion(solicitud: NonNullable<Awaited<ReturnType<typeof prepararActivacion>>>) {
  const contenido = correoActivacion(solicitud.nombre,enlaceActivacion(solicitud.token));
  await enviarCorreo(solicitud.destinatario,contenido.subject,contenido.textContent,{htmlContent:contenido.htmlContent});
}

export function registrarErrorCorreo(error: unknown) {
  // No registrar cuerpo del proveedor, destinatarios ni enlaces de activación.
  console.error("Correo no aceptado o resultado desconocido:", error instanceof ErrorCorreo ? `HTTP ${error.estado}; ${error.codigo}` : "red o configuración");
}

let procesando = false;
export async function procesarBienvenidas() {
  if (procesando || !correoConfigurado()) return;
  procesando = true;
  try {
    for (let i=0;i<5;i++) {
      const resultado = await pool.query("SELECT * FROM transporte.reclamar_bienvenida(NULL)");
      const n = resultado.rows[0] as {notificacion_id:string;destinatario:string;nombre:string} | undefined;
      if (!n) break;
      const contenido = correoBienvenida(n.nombre,enlacePlataforma("/iniciar-sesion").toString());
      let aceptado = false; let referencia: string | null = null; let codigo: string | null = null;
      try {
        const r = await enviarCorreo(n.destinatario,contenido.subject,contenido.textContent,{htmlContent:contenido.htmlContent,idempotencyKey:n.notificacion_id});
        aceptado = true; referencia = r.messageId;
      } catch(error) {
        if (error instanceof ErrorCorreo && error.codigo === "duplicate_parameter") aceptado = true;
        else {
          registrarErrorCorreo(error);
          // Solo respuestas explícitas transitorias se reintentan, en ventana menor al TTL de idempotencia.
          codigo = error instanceof ErrorCorreo ? (error.estado === 429 || error.estado >= 500 ? "REINTENTABLE" : `HTTP_${error.estado}`) : "RESULTADO_DESCONOCIDO";
        }
      }
      await pool.query("SELECT transporte.finalizar_bienvenida($1,$2,$3,$4)",[n.notificacion_id,aceptado,referencia,codigo]);
    }
  } catch { console.error("No se pudo procesar la cola de bienvenida. Comprueba la migración de activación."); }
  finally { procesando = false; }
}

export function iniciarBienvenidas() {
  void procesarBienvenidas();
  const temporizador = setInterval(() => void procesarBienvenidas(),60_000);
  temporizador.unref();
  return () => clearInterval(temporizador);
}
