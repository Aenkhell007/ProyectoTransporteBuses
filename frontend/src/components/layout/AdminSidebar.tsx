import { useId, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { Icono } from "../compra/Icono";

const resumen = {
  ruta: ".",
  nombre: "Resumen",
  icono: <path d="m3 11 9-8 9 8M5 10v11h5v-6h4v6h5V10" />,
};

const seccionesAdmin = [
  resumen,
  { ruta: "cooperativas", nombre: "Cooperativas", icono: null },
  { ruta: "usuarios", nombre: "Usuarios y roles", icono: null },
  { ruta: "reportes", nombre: "Reportes", icono: <path d="M4 20v-5h4v5M10 20V9h4v11M16 20V4h4v16" /> },
  { ruta: "configuracion", nombre: "Configuración", icono: <><circle cx="12" cy="12" r="3" /><path d="m10 3-.7 2.5-2.2 1L4.6 6l-1.5 2.6 1.8 2v2.8l-1.8 2L4.6 18l2.5-.5 2.2 1L10 21h4l.7-2.5 2.2-1 2.5.5 1.5-2.6-1.8-2v-2.8l1.8-2L19.4 6l-2.5.5-2.2-1L14 3Z" /></> },
];

const seccionesOficina = [
  resumen,
  { ruta: "ventas", nombre: "Ventas", icono: <path d="M2 3h3l2.5 12h11l2.5-8H6M9 20h.01M17 20h.01" /> },
  { ruta: "reservas", nombre: "Reservas", icono: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4m8-4v4m-8 8 2 2 4-4" /></> },
  { ruta: "comprobantes", nombre: "Comprobantes", icono: <path d="M6 3h8l4 4v14H6V3Zm8 0v4h4m-9 5h6m-6 4h6" /> },
  { ruta: "reembolsos", nombre: "Reembolsos", icono: <path d="M3 4v6h6M3.5 10A8.5 8.5 0 1 1 4 16m8-9v10m2.5-8H11a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9.5" /> },
];

const seccionesCooperativa = [
  resumen,
  { ruta: "buses", nombre: "Buses", icono: <><rect x="4" y="3" width="16" height="16" rx="3" /><path d="M4 9h16M7 19v3m10-3v3M7 14h.01M17 14h.01" /></> },
  { ruta: "grupos", nombre: "Grupos", icono: null },
  { ruta: "frecuencias", nombre: "Frecuencias", icono: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4m8-4v4" /></> },
  { ruta: "hoja-ruta", nombre: "Hoja de ruta", icono: <path d="M9 3 6 21m9-18 3 18M12 5v3m0 4v3m0 4v2" /> },
  { ruta: "personal", nombre: "Personal", icono: null },
  seccionesAdmin[4],
];

interface AdminSidebarProps {
  sinLogo?: boolean;
  variant: "admin" | "oficina" | "cooperativa";
  puedeSalir: boolean;
  saliendo: boolean;
  onSalir: () => void;
}

export function AdminSidebar({ sinLogo = false, variant, puedeSalir, saliendo, onSalir }: AdminSidebarProps) {
  const [abierto, setAbierto] = useState(false);
  const menuId = useId();
  const botonMenu = useRef<HTMLButtonElement>(null);
  const oficina = variant === "oficina";
  const secciones = variant === "cooperativa" ? seccionesCooperativa : oficina ? seccionesOficina : seccionesAdmin;

  return (
    <aside
      className="flex flex-col bg-[#061340] text-white"
      onKeyDown={(event) => {
        if (event.key === "Escape" && abierto) {
          setAbierto(false);
          botonMenu.current?.focus();
        }
      }}
    >
      <div className={sinLogo ? "grid min-h-12 items-center bg-white px-3 lg:hidden" : "grid min-h-20 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 bg-white px-3 lg:min-h-24 lg:grid-cols-1 lg:justify-items-center"}>
        {!sinLogo && <Link to="." onClick={() => setAbierto(false)} aria-label={oficina ? "Gran Continental, resumen de oficina" : "Gran Continental, resumen de administración"} className="col-start-2 row-start-1 justify-self-center lg:col-start-1">
          <img src="/images/Logo G-C.png" alt="Gran Continental" width="160" height="64" className="h-16 w-40 object-contain" />
        </Link>}
        <button
          ref={botonMenu}
          type="button"
          aria-controls={menuId}
          aria-expanded={abierto}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className="col-start-1 row-start-1 grid size-11 place-items-center rounded-md text-[#08064e] hover:bg-indigo-50 lg:hidden"
          onClick={() => setAbierto(!abierto)}
        >
          {abierto ? <Icono nombre="cerrar" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>}
        </button>
      </div>

      <div id={menuId} className={`${abierto ? "flex" : "hidden"} flex-1 flex-col px-3 py-4 lg:flex`}>
        <nav aria-label={variant === "cooperativa" ? "Cooperativa" : oficina ? "Oficina" : "Administración"}>
          {!oficina && (
            <p className="px-3 pb-3 text-xs uppercase text-indigo-200">{variant === "cooperativa" ? "Cooperativa" : "Administración"}</p>
          )}
          <ul className="space-y-1">
            {secciones.map(({ ruta, nombre, icono }) => (
              <li key={ruta}>
                <NavLink
                  to={ruta}
                  end={ruta === "."}
                  onClick={() => setAbierto(false)}
                  className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive ? "bg-[#e6001c] text-white" : "text-indigo-50 hover:bg-white/10"}`}
                >
                  {icono ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0" aria-hidden="true">{icono}</svg>
                  ) : (
                    <Icono nombre={ruta === "cooperativas" ? "personas" : "persona"} />
                  )}
                  {nombre}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {puedeSalir && (
          <div className="mt-auto pt-6">
            <button
              type="button"
              disabled={saliendo}
              onClick={onSalir}
              className="flex min-h-12 w-full items-center gap-3 border-t border-white/30 px-3 pt-2 text-left text-sm hover:text-indigo-200 disabled:opacity-70"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0" aria-hidden="true"><path d="M10 3H4v18h6M9 12h12m-5-5 5 5-5 5" /></svg>
              {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
