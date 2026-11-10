// Límites de la tabla contactos y regla de correo de enviar_contacto().
export const LIMITES_CONTACTO = {
  nombre: 150,
  email: 254,
  asunto: 150,
  mensaje: 4000,
} as const;

/** Identificador de la versión de la política aceptada; el equipo debe publicar la definitiva. */
export const VERSION_POLITICA_PRIVACIDAD = "privacidad-borrador-2026-10";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FormularioContacto {
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  consentimiento: boolean;
}

export type ErroresContacto = Partial<Record<keyof FormularioContacto, string>>;

export const CONTACTO_VACIO: FormularioContacto = {
  nombre: "",
  email: "",
  asunto: "",
  mensaje: "",
  consentimiento: false,
};

export function esCorreoValido(correo: string): boolean {
  return CORREO.test(correo.trim());
}

export function validarContacto(f: FormularioContacto): ErroresContacto {
  const errores: ErroresContacto = {};
  if (!f.nombre.trim()) errores.nombre = "Escribe tu nombre.";
  else if (f.nombre.trim().length > LIMITES_CONTACTO.nombre)
    errores.nombre = `Máximo ${LIMITES_CONTACTO.nombre} caracteres.`;

  if (!f.email.trim()) errores.email = "Escribe tu correo electrónico.";
  else if (
    !esCorreoValido(f.email) ||
    f.email.trim().length > LIMITES_CONTACTO.email
  )
    errores.email = "Escribe un correo válido, por ejemplo tu@ejemplo.com.";

  if (!f.asunto.trim()) errores.asunto = "Selecciona un asunto.";

  if (!f.mensaje.trim()) errores.mensaje = "Escribe tu mensaje.";
  else if (f.mensaje.length > LIMITES_CONTACTO.mensaje)
    errores.mensaje = `Máximo ${LIMITES_CONTACTO.mensaje} caracteres.`;

  if (!f.consentimiento)
    errores.consentimiento = "Debes aceptar la política de privacidad.";
  return errores;
}
