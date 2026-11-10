import { useId, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { Icono } from "../compra/Icono";

const secciones = [
  { ruta: ".", nombre: "Resumen", icono: <path d="m3 11 9-8 9 8M5 10v11h5v-6h4v6h5V10" /> },
  { ruta: "cooperativas", nombre: "Cooperativas", icono: null },
  { ruta: "usuarios", nombre: "Usuarios y roles", icono: null },
  { ruta: "reportes", nombre: "Reportes", icono: <path d="M4 20v-5h4v5M10 20V9h4v11M16 20V4h4v16" /> },
  { ruta: "configuracion", nombre: "Configuración", icono: <><circle cx="12" cy="12" r="3" /><path d="m10 3-.7 2.5-2.2 1L4.6 6l-1.5 2.6 1.8 2v2.8l-1.8 2L4.6 18l2.5-.5 2.2 1L10 21h4l.7-2.5 2.2-1 2.5.5 1.5-2.6-1.8-2v-2.8l1.8-2L19.4 6l-2.5.5-2.2-1L14 3Z" /></> },
];

interface AdminSidebarProps {
  puedeSalir: boolean;
  saliendo: boolean;
  onSalir: () => void;
}

export function AdminSidebar({ puedeSalir, saliendo, onSalir }: AdminSidebarProps) {
  const [abierto, setAbierto] = useState(false);
  const menuId = useId();
  const botonMenu = useRef<HTMLButtonElement>(null);

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
      <div className="grid min-h-20 grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 bg-white px-3 lg:min-h-24 lg:grid-cols-1 lg:justify-items-center">
        <Link to="." onClick={() => setAbierto(false)} aria-label="Gran Continental, resumen de administración" className="col-start-2 row-start-1 justify-self-center lg:col-start-1">
          <img src="/images/Logo G-C.png" alt="Gran Continental" width="160" height="64" className="h-16 w-40 object-contain" />
        </Link>
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
        <nav aria-label="Administración">
          <p className="px-3 pb-3 text-xs uppercase text-indigo-200">Administración</p>
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
