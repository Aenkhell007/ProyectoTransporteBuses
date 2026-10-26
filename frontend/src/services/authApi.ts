export interface UsuarioSesion {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  email_verificado_at: string | null;
  roles: string[];
}

export class ErrorAuth extends Error {
  constructor(public status: number, mensaje: string) { super(mensaje); }
}

// Misma base pública que el cliente HTTP integrado; la cookie es HttpOnly.
async function peticion<T>(ruta: string, body?: unknown): Promise<T> {
  const base = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
  const respuesta = await fetch(`${base}/auth${ruta}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let datos;
  try { datos = respuesta.status === 204 ? null : await respuesta.json(); }
  catch { throw new ErrorAuth(respuesta.status, "No se pudo contactar con el servicio. Inténtalo de nuevo."); }
  if (!respuesta.ok) throw new ErrorAuth(respuesta.status, datos?.error ?? "No se pudo completar la solicitud.");
  return datos as T;
}

export const authApi = {
  forgot: (email: string) => peticion<{mensaje:string}>("/password/forgot", {email}),
  reset: (token: string, password: string) => peticion<{mensaje:string}>("/password/reset", {token,password}),
  me: () => peticion<{ usuario: UsuarioSesion }>("/me"),
  login: (email: string, password: string) => peticion<{ usuario: UsuarioSesion }>("/login", { email, password }),
  logout: () => peticion<void>("/logout", {}),
  register: (datos: { nombres: string; apellidos: string; email: string; password: string; tipoDocumento: string; documento: string; telefono?: string; aceptaTerminos: boolean }) => peticion<{ id: string; mensaje: string }>("/register", datos),
};
