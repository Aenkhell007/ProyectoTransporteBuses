import { Suspense, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from "react";
import { CargaSeccion } from '../components/ui/CargaSeccion';
import { accesoPanel } from '../features/auth/accesoPanel';
import { destinoTrasLogin } from '../features/auth/destinoTrasLogin';
import { Link, Navigate, NavLink, Outlet, useLocation, useSearchParams } from "react-router";
import { AdminHeader } from "../components/layout/AdminHeader";
import { AdminSidebar } from "../components/layout/AdminSidebar";
import { IconoBiblioteca, type NombreIconoBiblioteca } from "../components/ui/IconoBiblioteca";
import { SiteFooter } from "../components/layout";
import { useAuth } from "../features/auth/AuthContext";
import { precargarHttp } from "../services/http";

const tabsMovil: Record<
  "admin" | "oficina" | "cooperativa",
  {
    principales: { sub: string; label: string; icono: NombreIconoBiblioteca; end?: boolean }[];
    mas: { sub: string; label: string; icono: NombreIconoBiblioteca }[];
  }
> = {
  admin: {
    principales: [
      { sub: "", label: "Resumen", icono: "inicio", end: true },
      { sub: "/cooperativas", label: "Cooperativas", icono: "personas" },
      { sub: "/usuarios", label: "Usuarios", icono: "persona" },
    ],
    mas: [
      { sub: "/reportes", label: "Reportes", icono: "grafico" },
      { sub: "/abordaje", label: "Abordaje QR", icono: "boleto" },
      { sub: "/configuracion", label: "Configuración", icono: "configuracion" },
    ],
  },
  oficina: {
    principales: [
      { sub: "", label: "Resumen", icono: "inicio", end: true },
      { sub: "/ventas", label: "Ventas", icono: "ventas" },
      { sub: "/comprobantes", label: "Pagos", icono: "documento" },
    ],
    mas: [
      { sub: "/reservas", label: "Reservas", icono: "calendario" },
      { sub: "/reembolsos", label: "Reembolsos", icono: "reembolso" },
      { sub: "/abordaje", label: "Abordaje QR", icono: "boleto" },
    ],
  },
  cooperativa: {
    principales: [
      { sub: "", label: "Resumen", icono: "inicio", end: true },
      { sub: "/buses", label: "Buses", icono: "bus" },
      { sub: "/frecuencias", label: "Horarios", icono: "calendario" },
    ],
    mas: [
      { sub: "/grupos", label: "Grupos", icono: "personas" },
      { sub: "/hoja-ruta", label: "Hoja de ruta", icono: "ruta" },
      { sub: "/abordaje", label: "Abordaje QR", icono: "boleto" },
      { sub: "/configuracion", label: "Configuración", icono: "configuracion" },
    ],
  },
};

type VariantePanel = "admin" | "oficina" | "cooperativa";

function obtenerEncabezadoPanel(
  variant: VariantePanel,
  identidadActiva: { nombre?: string; ambito_operacion?: string; provincia?: string | null } | null,
): { titulo: string; descripcion: string } {
  if (variant === "admin") {
    return {
      titulo: "Administración Global del Sistema",
      descripcion: "Consola central de cooperativas, usuarios, roles y configuración global.",
    };
  }
  if (variant === "oficina") {
    return {
      titulo: identidadActiva?.nombre
        ? `Oficina y Ventas - ${identidadActiva.nombre}`
        : "Gestión de Oficina y Ventas",
      descripcion: "Gestiona ventas en ventanilla, reservas y validación de comprobantes.",
    };
  }
  const ambito = identidadActiva?.ambito_operacion;
  const esLocal = (ambito === "URBANA" || ambito === "RURAL") && Boolean(identidadActiva?.provincia);
  return {
    titulo: identidadActiva?.nombre
      ? `Gestión Operativa - ${identidadActiva.nombre}`
      : "Gestión Operativa de Cooperativa",
    descripcion: esLocal
      ? `Cooperativa ${ambito === "URBANA" ? "Urbana" : "Rural"} · Provincia de ${identidadActiva?.provincia} · Flota, frecuencias y hoja de ruta.`
      : "Gestiona flota, grupos, frecuencias, hoja de ruta y configuración operativa.",
  };
}

export default function AdminLayout({
  children,
  variant = "admin",
  panelFijo = false,
}: {
  children?: ReactNode;
  variant?: VariantePanel;
  panelFijo?: boolean;
}) {
  const { usuario, cargando, logout } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const ruta = location.pathname;
  const homeHref = ruta.startsWith('/oficina') ? '/oficina' : ruta.startsWith('/cooperativa') ? '/cooperativa' : ruta.startsWith('/panel') ? '/panel' : variant === 'cooperativa' ? '/vista-previa/cooperativa' : variant === 'oficina' ? '/vista-previa/oficinista' : '/vista-previa/panel';
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState("");
  const [masAbierto, setMasAbierto] = useState(false);
  const masMenuId = useId();
  const nombreUsuario = usuario
    ? `${usuario.nombres} ${usuario.apellidos}`.trim() || usuario.email
    : undefined;

  const coopIdUrl = searchParams.get('cooperativaId');
  const identidadActiva =
    variant === 'admin'
      ? null
      : (usuario?.cooperativas?.find((c) => c.id === coopIdUrl) ?? usuario?.cooperativa ?? null);
  const logoSrc = identidadActiva?.logo_archivo_id
    ? `/api/mikel/imagenes/${identidadActiva.logo_archivo_id}`
    : "/images/Logo G-C.png";
  const brandName = identidadActiva?.nombre ?? "Gran Continental";
  const colorPrimario = identidadActiva?.color_primario ?? undefined;
  const temaEstilo = identidadActiva
    ? ({
        "--coop-primario": identidadActiva.color_primario ?? "#CB102E",
        "--coop-secundario": identidadActiva.color_secundario ?? "#00833E",
        "--coop-texto": identidadActiva.color_texto ?? "#1A2A33",
      } as CSSProperties)
    : undefined;

  // Precarga silenciosa de catálogos y ámbitos compartidos al entrar al panel (una sola vez en caché).
  useEffect(() => {
    if (!usuario || ruta.startsWith('/vista-previa/')) return;
    if (variant === 'cooperativa') {
      const coopId = identidadActiva?.id ?? '';
      precargarHttp([
        '/mikel/ambitos/flota.admin',
        '/mikel/ambitos/operacion.admin',
        '/mikel/identidad/ambitos',
        '/catalogos/ciudades',
        ...(coopId ? [`/mikel/buses?cooperativaId=${encodeURIComponent(coopId)}`] : []),
      ]);
    } else if (variant === 'oficina') {
      precargarHttp(['/oficina/contexto', '/catalogos/ciudades', '/oficina/reservas', '/oficina/comprobantes']);
    } else if (variant === 'admin') {
      precargarHttp(['/identidad/administracion', '/catalogos/ciudades']);
    }
  }, [usuario?.id, variant, identidadActiva?.id, ruta]);

  useEffect(() => {
    setMasAbierto(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [ruta]);

  useEffect(() => {
    if (!masAbierto) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMasAbierto(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [masAbierto]);

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

  const contenidoScroll = (
    <div
      ref={scrollRef}
      className={`gc-panel-scroll gc-print-unclip flex min-w-0 flex-1 flex-col min-[961px]:min-h-0 min-[961px]:overflow-y-auto ${panelFijo ? "lg:h-full" : ""}`}
    >
      <main
        id={variant === "cooperativa" ? "contenido-cooperativa" : variant === "oficina" ? "contenido-oficina" : "contenido-administracion"}
        className="min-w-0 flex-[1_0_auto] px-4 pb-4 sm:px-5"
      >
        {error && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <Suspense fallback={<CargaSeccion retraso />}>{children ?? <Outlet />}</Suspense>
      </main>
      <SiteFooter variant="admin" brandName={brandName} />
    </div>
  );

  const mobileConfig = tabsMovil[variant];
  const encabezadoPanel = obtenerEncabezadoPanel(variant, identidadActiva);
  const mostrarMiCuenta =
    (variant === "admin" && homeHref === "/panel") ||
    (variant === "oficina" && homeHref === "/oficina") ||
    (variant === "cooperativa" && homeHref === "/cooperativa");

  return (
    <div
      style={temaEstilo}
      className={
        panelFijo
          ? "gc-shell gc-shell--public gc-shell--fixed gc-shell--with-tabbar gc-print-unclip"
          : "gc-shell gc-shell--public gc-shell--fixed gc-shell--with-tabbar gc-print-unclip p-3 sm:p-5"
      }
    >
      {panelFijo && (
        <AdminHeader cabeceraApp {...encabezadoPanel} homeHref={homeHref} nombreUsuario={nombreUsuario} cargando={cargando} logoSrc={logoSrc} brandName={brandName} colorTexto={identidadActiva?.color_texto ?? undefined} />
      )}
      <div
        className={`gc-print-unclip relative mx-auto flex max-w-[1440px] flex-1 flex-col rounded-lg bg-white min-[961px]:min-h-0 min-[961px]:overflow-hidden lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] ${panelFijo ? "mb-4 w-[calc(100%-36px)] max-[960px]:w-full" : "w-full"}`}
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
              logoSrc={logoSrc}
              brandName={brandName}
              colorPrimario={colorPrimario}
              puedeVerAbordaje={!!usuario && accesoPanel("abordaje", usuario.roles, usuario.permisos)}
              puedeSalir={!!usuario}
              saliendo={saliendo}
              onSalir={cerrarSesion}
            />
          </div>
        </div>
        {panelFijo ? (
          contenidoScroll
        ) : (
          <div className="gc-print-unclip flex min-w-0 flex-1 flex-col min-[961px]:min-h-0 lg:h-full">
            <div className="shrink-0">
              <AdminHeader
                {...encabezadoPanel}
                nombreUsuario={nombreUsuario}
                cargando={cargando}
                logoSrc={logoSrc}
                brandName={brandName}
                colorTexto={identidadActiva?.color_texto ?? undefined}
              />
            </div>
            {contenidoScroll}
          </div>
        )}
      </div>

      {masAbierto && (
        <div id={masMenuId} role="menu" aria-label="Más opciones del panel" className="gc-mobile-tabbar__more">
          {mobileConfig.mas.map((item) => (
            <NavLink
              key={item.sub}
              to={`${homeHref}${item.sub}`}
              role="menuitem"
              onClick={() => setMasAbierto(false)}
            >
              <IconoBiblioteca nombre={item.icono} className="size-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {mostrarMiCuenta && (
            <NavLink
              to={`${homeHref}/mi-cuenta`}
              role="menuitem"
              onClick={() => setMasAbierto(false)}
            >
              <IconoBiblioteca nombre="persona" className="size-4" />
              <span>Mi cuenta</span>
            </NavLink>
          )}
          {!!usuario && (
            <button
              type="button"
              role="menuitem"
              data-logout="true"
              disabled={saliendo}
              onClick={() => {
                setMasAbierto(false);
                void cerrarSesion();
              }}
            >
              <IconoBiblioteca nombre="salir" className="size-4" />
              <span>{saliendo ? "Cerrando sesión…" : "Cerrar sesión"}</span>
            </button>
          )}
        </div>
      )}

      <nav className="gc-mobile-tabbar" aria-label="Accesos principales del panel">
        {mobileConfig.principales.map((item) => (
          <NavLink
            key={item.sub || "index"}
            to={`${homeHref}${item.sub}`}
            end={item.end}
            onClick={() => setMasAbierto(false)}
          >
            <IconoBiblioteca nombre={item.icono} className="size-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          aria-expanded={masAbierto}
          aria-controls={masMenuId}
          onClick={() => setMasAbierto((prev) => !prev)}
        >
          <IconoBiblioteca nombre={masAbierto ? "cerrar" : "menu"} className="size-[18px]" />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
}