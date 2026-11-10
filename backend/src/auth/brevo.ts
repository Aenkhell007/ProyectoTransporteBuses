export function correoConfigurado(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim() && process.env.BREVO_SENDER_EMAIL?.trim());
}

export function enlacePlataforma(ruta: string): URL {
  const url = new URL(process.env.FRONTEND_URL ?? "http://127.0.0.1:5173");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("FRONTEND_URL debe usar HTTPS o localhost.");
  url.pathname = ruta; url.search = ""; url.hash = "";
  return url;
}
function enlaceToken(ruta: string, token: string): string {
  const url = enlacePlataforma(ruta);
  url.hash = new URLSearchParams({token}).toString();
  return url.toString();
}
export const enlaceRecuperacion = (token: string) => enlaceToken("/restablecer-contrasena", token);
export const enlaceActivacion = (token: string) => enlaceToken("/activar-cuenta", token);

export class ErrorCorreo extends Error {
  constructor(public estado: number, public codigo: string) { super(`Brevo: HTTP ${estado}, ${codigo}`); }
}

export async function enviarCorreo(email: string, subject: string, textContent: string, opciones: {htmlContent?: string; idempotencyKey?: string} = {}): Promise<{messageId: string | null}> {
  if (!correoConfigurado()) throw new Error("Correo no configurado.");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {"Content-Type":"application/json", "Accept":"application/json", "api-key":process.env.BREVO_API_KEY!.trim()},
    body: JSON.stringify({sender:{email:process.env.BREVO_SENDER_EMAIL!.trim(),name:process.env.BREVO_SENDER_NAME ?? "Gran Continental"},to:[{email}],subject,textContent,
      ...(opciones.htmlContent ? {htmlContent:opciones.htmlContent} : {}),
      ...(opciones.idempotencyKey ? {headers:{IdempotencyKey:opciones.idempotencyKey}} : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  const datos = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const codigo = typeof datos.code === "string" && /^[a-z_]{1,80}$/.test(datos.code) ? datos.code : "proveedor";
    throw new ErrorCorreo(response.status, codigo);
  }
  return {messageId:typeof datos.messageId === "string" ? datos.messageId : null};
}
