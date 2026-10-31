function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
}

function plantilla(titulo: string, nombre: string, contenido: string, enlace: string, boton: string, nota: string) {
  const saludo = nombre.trim() ? `Estimado/a ${nombre.trim()}:` : "Estimado/a usuario/a:";
  return {
    textContent: `${titulo}\n\n${saludo}\n\n${contenido}\n\n${boton}: ${enlace}\n\n${nota}\n\nAtentamente,\nEquipo de Gran Continental`,
    htmlContent: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#17243b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:12px;overflow:hidden"><tr><td style="padding:24px 28px;background:#08064e;color:white;font-size:22px;font-weight:bold">GRAN CONTINENTAL</td></tr><tr><td style="padding:28px"><h1 style="font-size:25px;line-height:1.3;color:#08064e;margin:0 0 24px">${escapar(titulo)}</h1><p style="line-height:1.7">${escapar(saludo)}</p><p style="line-height:1.7">${escapar(contenido)}</p><table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0"><tr><td bgcolor="#ed0020" style="border-radius:6px"><a href="${escapar(enlace)}" style="display:inline-block;padding:15px 24px;color:white;text-decoration:none;font-weight:bold">${escapar(boton)}</a></td></tr></table><p style="font-size:13px;line-height:1.7;color:#53627c">Si el botón no funciona, copia este enlace en tu navegador:</p><p style="font-size:12px;word-break:break-all"><a href="${escapar(enlace)}">${escapar(enlace)}</a></p><p style="font-size:13px;line-height:1.7;color:#53627c">${escapar(nota)}</p><p style="line-height:1.7;margin-top:28px">Atentamente,<br><strong>Equipo de Gran Continental</strong></p></td></tr><tr><td style="padding:18px 28px;border-top:1px solid #e4e9f2;font-size:12px;color:#63718a">Mensaje automático de Gran Continental. Por tu seguridad, nunca compartas tus contraseñas ni enlaces de activación o recuperación.</td></tr></table></td></tr></table></body></html>`,
  };
}

export function correoActivacion(nombre: string, enlace: string) {
  return { subject: "Activa tu cuenta — Gran Continental", ...plantilla("Activa tu cuenta", nombre,
    "Tu registro en Gran Continental se ha completado. Para proteger tu cuenta y confirmar que esta dirección de correo te pertenece, activa tu cuenta mediante el siguiente botón. Una vez activada, podrás iniciar sesión.",
    enlace, "Activar mi cuenta", "Este enlace es personal, vence en 60 minutos y puede utilizarse una sola vez. Si no solicitaste este registro, ignora este mensaje; la cuenta permanecerá sin activar.") };
}
export function correoBienvenida(nombre: string, enlace: string) {
  return { subject: "Tu cuenta está activada — Bienvenido/a a Gran Continental", ...plantilla("Te damos la bienvenida", nombre,
    "Tu dirección de correo ha sido verificada y tu cuenta de Gran Continental está activada. Ya puedes iniciar sesión y consultar las opciones disponibles en la plataforma. Conserva tus credenciales de forma segura.",
    enlace, "Iniciar sesión", "Este mensaje confirma la activación de tu cuenta. No contiene contraseñas ni datos de pago.") };
}
export function correoRecuperacion(enlace: string) {
  return { subject: "Solicitud de recuperación de contraseña — Gran Continental", ...plantilla("Recupera el acceso a tu cuenta", "",
    "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de Gran Continental. Si realizaste esta solicitud, utiliza el siguiente botón para establecer una contraseña nueva.",
    enlace, "Restablecer contraseña", "El enlace vence en 30 minutos y solo puede utilizarse una vez. Si no solicitaste este cambio, ignora el mensaje: tu contraseña actual no se modificará.") };
}
