import { createContext, startTransition, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { ReactNode } from "react";
import { authApi, ErrorAuth } from "../../services/authApi";
import type { UsuarioSesion } from "../../services/authApi";

interface AuthState {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  errorSesion: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Contexto = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorSesion, setErrorSesion] = useState("");
  useEffect(() => {
    let activo = true;
    authApi.me().then(({ usuario }) => { if (activo) setUsuario(usuario); })
      .catch((error: unknown) => { if (activo && !(error instanceof ErrorAuth && error.status === 401)) setErrorSesion("No se pudo consultar la sesión. Comprueba que el backend esté encendido."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);
  async function login(email: string, password: string) {
    const datos = await authApi.login(email, password);
    setUsuario(datos.usuario); setErrorSesion("");
  }
  async function logout() {
    await authApi.logout();
    startTransition(() => {
      navigate("/", { replace: true });
      setUsuario(null);
    });
  }
  return <Contexto.Provider value={{ usuario, cargando, errorSesion, login, logout }}>{children}</Contexto.Provider>;
}
export function useAuth() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("Falta AuthProvider");
  return contexto;
}
