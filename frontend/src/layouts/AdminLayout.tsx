import { accesoPanel } from '../features/auth/accesoPanel';
import { destinoTrasLogin } from '../features/auth/destinoTrasLogin';
import { useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router";
import { AdminHeader } from "../components/layout/AdminHeader";
import { AdminSidebar } from "../components/layout/AdminSidebar";
import { SiteFooter } from "../components/layout";
import { useAuth } from "../features/auth/AuthContext";

const paneles = {
  cooperativa: { titulo: "Panel de la cooperativa", descripcion: "Gestiona buses, grupos y configuración de la cooperativa." },
  admin: { titulo: "Panel de administración", descripcion: "Gestiona cooperativas, usuarios y accesos al sistema." },
  oficina: { titulo: "Panel del oficinista", descripcion: "Gestiona las ventas de oficina y los comprobantes pendientes." },
};
export default function AdminLayout({
  children,
  variant = "admin",
  panelFijo = false,
}: {
  children?: ReactNode;
  variant?: keyof typeof paneles;
  panelFijo?: boolean;
}) {
  const { usuario, cargando, logout } = useAuth();
  const location = useLocation();
  const ruta = location.pathname;
  const homeHref = ruta.startsWith('/oficina') ? '/oficina' : ruta.startsWith('/cooperativa') ? '/cooperativa' : ruta.startsWith('/panel') ? '/panel' : variant === 'cooperativa' ? '/vista-previa/cooperativa' : variant === 'oficina' ? '/vista-previa/oficinista' : '/vista-previa/panel';
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

  if (!ruta.startsWith('/vista-previa/')) {
    if (cargando) return <p role="status" className="m-6 rounded-lg bg-white p-6">Comprobando acceso…</p>;
    if (!usuario) return <Navigate to="/iniciar-sesion" state={{from:location}} replace />;
    if (!accesoPanel(variant,usuario.roles,usuario.permisos)) return <section className="mx-auto mt-10 max-w-lg rounded-lg bg-white p-6 text-blue-950"><h1 className="text-2xl font-bold">Acceso restringido</h1><p className="my-4">Tu cuenta no tiene permisos para este panel.</p><Link className="underline" to={destinoTrasLogin(null,usuario.roles).pathname}>Volver a mi inicio</Link></section>;
  }
  return (
    <div className={panelFijo ? "gc-shell gc-shell--public" : "gc-shell gc-shell--public p-3 sm:p-5"}>
      {panelFijo && (
        <AdminHeader cabeceraApp {...paneles[variant]} homeHref={homeHref} nombreUsuario={nombreUsuario} cargando={cargando} />
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
              variant={variant}
              puedeVerAbordaje={!!usuario && accesoPanel("abordaje", usuario.roles, usuario.permisos)}
              puedeSalir={!!usuario}
              saliendo={saliendo}
              onSalir={cerrarSesion}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col self-stretch">
          {!panelFijo && (
            <AdminHeader
              {...paneles[variant]}
              nombreUsuario={nombreUsuario}
              cargando={cargando}
            />
          )}
          <main id={variant === "cooperativa" ? "contenido-cooperativa" : variant === "oficina" ? "contenido-oficina" : "contenido-administracion"} className="min-w-0 flex-1 px-4 pb-4 sm:px-5">
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