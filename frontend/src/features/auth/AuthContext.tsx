import { descartarLecturasPendientes } from '../../services/lecturasPendientes';
import { startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { ReactNode } from "react";
import { authApi, ErrorAuth } from "../../services/authApi";
import type { UsuarioSesion } from "../../services/authApi";
import {Contexto} from "./contextoSesion";
export {useAuth} from "./contextoSesion";

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorSesion, setErrorSesion] = useState("");
  useEffect(()=>{const invalidar=()=>{descartarLecturasPendientes();setUsuario(null);setErrorSesion('La sesión venció. Inicia sesión nuevamente.');};window.addEventListener('transporte:sesion-vencida',invalidar);return()=>window.removeEventListener('transporte:sesion-vencida',invalidar);},[]);
  useEffect(() => {
    let activo = true;
    authApi.me().then(({ usuario }) => { if (activo) setUsuario(usuario); })
      .catch((error: unknown) => { if (activo && !(error instanceof ErrorAuth && error.status === 401)) setErrorSesion("No se pudo consultar la sesión. Comprueba que el backend esté encendido."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);
  async function login(email: string, password: string, recordar = false) {
    const datos = await authApi.login(email, password, recordar);
    descartarLecturasPendientes();
    setUsuario(datos.usuario); setErrorSesion("");
  }
  async function refrescar() { try{const datos = await authApi.me(); setUsuario(datos.usuario);}catch(e){if(e instanceof ErrorAuth&&e.status===401){descartarLecturasPendientes();setUsuario(null);}throw e;} }
  async function logout() {
    await authApi.logout();
    descartarLecturasPendientes();
    startTransition(() => {
      navigate("/", { replace: true });
      setUsuario(null);
    });
  }
  return <Contexto.Provider value={{ usuario, cargando, errorSesion, login, logout, refrescar }}>{children}</Contexto.Provider>;
}
