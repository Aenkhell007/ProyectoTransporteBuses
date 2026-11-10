import {createContext,useContext} from 'react';
import type {UsuarioSesion} from '../../services/authApi';
// La identidad del contexto no cambia al recargar el componente proveedor con Vite.
export interface AuthState {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  errorSesion: string;
  login: (email: string, password: string, recordar?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refrescar: () => Promise<void>;
}
export const Contexto = createContext<AuthState | null>(null);

export function useAuth() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("Falta AuthProvider");
  return contexto;
}
