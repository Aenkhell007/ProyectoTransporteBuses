import { useState } from "react";
import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { AdminHeader } from "../components/layout/AdminHeader";
import { AdminSidebar } from "../components/layout/AdminSidebar";
import { SiteFooter } from "../components/layout";
import { useAuth } from "../features/auth/AuthContext";

export default function AdminLayout({
  children,
  cooperativa = false,
  panelFijo = false,
}: {
  children?: ReactNode;
  cooperativa?: boolean;
  panelFijo?: boolean;
}) {
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
    <div className={panelFijo ? "gc-shell gc-shell--public" : "gc-shell gc-shell--public p-3 sm:p-5"}>
      {panelFijo && (
        <AdminHeader cabeceraApp nombreUsuario={nombreUsuario} cargando={cargando} />
      )}
      <div
        className={`relative mx-auto grid w-full max-w-[1440px] flex-1 items-start rounded-lg bg-white lg:grid-cols-[200px_minmax(0,1fr)] ${panelFijo ? "w-[calc(100%-36px)] max-[960px]:w-full" : ""}`}
      >
        <div className="min-w-0 self-stretch lg:rounded-bl-lg lg:bg-[#061340]">
          <div
            className={
              panelFijo
                ? "lg:sticky lg:top-[110px] lg:grid lg:max-h-[calc(100dvh-126px)] lg:min-h-[calc(100dvh-126px)] lg:overflow-y-auto"
                : "lg:grid lg:h-full"
            }
          >
            <AdminSidebar
              sinLogo={panelFijo}
             
              cooperativa={cooperativa}
              puedeSalir={!!usuario}
              saliendo={saliendo}
              onSalir={cerrarSesion}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col self-stretch">
          {!panelFijo && (
            <AdminHeader
              cooperativa={cooperativa}
              nombreUsuario={nombreUsuario}
              cargando={cargando}
            />
          )}
          <main id="contenido-administracion" className="min-w-0 flex-1 px-4 pb-4 sm:px-5">
            {error && (
              <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}
            {children ?? <Outlet />}
          </main>
          <SiteFooter variant="admin" />
        </div>
      </div>
    </div>
  );
}
