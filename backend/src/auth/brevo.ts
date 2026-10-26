export function correoConfigurado(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim() && process.env.BREVO_SENDER_EMAIL?.trim());
}

export function enlaceRecuperacion(token: string): string {
  const url = new URL(process.env.FRONTEND_URL ?? "http://127.0.0.1:5173");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("FRONTEND_URL debe usar HTTPS o localhost.");
  }
  url.pathname = "/restablecer-contrasena";
  url.search = "";
  url.hash = new URLSearchParams({token}).toString();
  return url.toString();
}

export async function enviarCorreo(email: string, subject: string, textContent: string): Promise<void> {
  if (!correoConfigurado()) throw new Error("Correo no configurado.");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {"Content-Type":"application/json", "Accept":"application/json", "api-key":process.env.BREVO_API_KEY!},
    body: JSON.stringify({sender:{email:process.env.BREVO_SENDER_EMAIL,name:process.env.BREVO_SENDER_NAME ?? "Gran Continental"},to:[{email}],subject,textContent}),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`El proveedor de correo devolvió HTTP ${response.status}.`);
}
