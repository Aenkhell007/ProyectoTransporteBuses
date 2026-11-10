import { useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { AdminHeader } from "../components/layout/AdminHeader";
import { AdminSidebar } from "../components/layout/AdminSidebar";
import { SiteFooter } from "../components/layout";
import { useAuth } from "../features/auth/AuthContext";

export default function AdminLayout({ children }: { children?: ReactNode }) {
  const { usuario, cargando, logout } = useAuth();
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState("");
  const nombreUsuario = usuario
    ? `${usuario.nombres} ${usuario.apellidos}`.trim() || usuario.email
    : undefined;

  async function cerrarSesion() {
    setSaliendo(true);
    setError("");
    try {
      await logout();
    } catch {
      setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
    } finally {
      setSaliendo(false);
    }
  }

  return (
    <div className="gc-shell gc-shell--public p-3 sm:p-5">
      <div className="relative mx-auto grid w-full max-w-[1440px] flex-1 grid-rows-[auto_1fr] overflow-hidden rounded-lg bg-white lg:grid-cols-[200px_minmax(0,1fr)] lg:grid-rows-1">
        <AdminSidebar puedeSalir={!!usuario} saliendo={saliendo} onSalir={cerrarSesion} />
        <div className="flex min-w-0 flex-col">
          <AdminHeader nombreUsuario={nombreUsuario} cargando={cargando} />
          <main id="contenido-administracion" className="min-w-0 flex-1 px-4 pb-4 sm:px-5">
            {error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {children ?? <Outlet />}
          </main>
          <SiteFooter variant="admin" />
        </div>
      </div>
    </div>
  );
}
