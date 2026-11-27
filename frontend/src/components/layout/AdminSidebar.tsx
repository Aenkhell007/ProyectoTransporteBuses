import {IconoBiblioteca, type NombreIconoBiblioteca} from '../ui/IconoBiblioteca';
import { useId, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { Icono } from "../compra/Icono";

const resumen = {
  ruta: ".",
  nombre: "Resumen",
};

const seccionesAdmin = [
  resumen,
  { ruta: "cooperativas", nombre: "Cooperativas" },
  { ruta: "usuarios", nombre: "Usuarios y roles" },
  { ruta: "reportes", nombre: "Reportes" },
  { ruta: "configuracion", nombre: "Configuración" },
];

const seccionesOficina = [
  resumen,
  { ruta: "ventas", nombre: "Ventas" },
  { ruta: "reservas", nombre: "Reservas" },
  { ruta: "comprobantes", nombre: "Comprobantes" },
  { ruta: "reembolsos", nombre: "Reembolsos" },
];

const seccionesCooperativa = [
  resumen,
  { ruta: "buses", nombre: "Buses" },
  { ruta: "grupos", nombre: "Grupos" },
  { ruta: "frecuencias", nombre: "Frecuencias" },
  { ruta: "hoja-ruta", nombre: "Hoja de ruta" },
  seccionesAdmin[4],
];

interface AdminSidebarProps {
  sinLogo?: boolean;
  variant: "admin" | "oficina" | "cooperativa";
  puedeVerAbordaje?: boolean;
  puedeSalir: boolean;
  saliendo: boolean;
  onSalir: () => void;
}

export function AdminSidebar({ sinLogo = false, variant, puedeVerAbordaje = false, puedeSalir, saliendo, onSalir }: AdminSidebarProps) {
  const [abierto, setAbierto] = useState(false);
  const menuId = useId();
  const botonMenu = useRef<HTMLButtonElement>(null);
  const oficina = variant === "oficina";
  const seccionesPanel = variant === "cooperativa" ? seccionesCooperativa : oficina ? seccionesOficina : seccionesAdmin;

  const secciones = puedeVerAbordaje
    ? [...seccionesPanel, { ruta: "/abordaje", nombre: "Abordaje QR" }]
    : seccionesPanel;

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
          {abierto ? <Icono nombre="cerrar" /> : <IconoBiblioteca nombre="menu" className="size-6"/>}
        </button>
      </div>

      <div id={menuId} className={`${abierto ? "flex" : "hidden"} flex-1 flex-col px-3 py-4 lg:flex`}>
        <nav aria-label={variant === "cooperativa" ? "Cooperativa" : oficina ? "Oficina" : "Administración"}>
          {!oficina && (
            <p className="px-3 pb-3 text-xs uppercase text-indigo-200">{variant === "cooperativa" ? "Cooperativa" : "Administración"}</p>
          )}
          <ul className="space-y-1">
            {secciones.map(({ ruta, nombre }) => (
              <li key={ruta}>
                <NavLink
                  to={ruta}
                  end={ruta === "."}
                  onClick={() => setAbierto(false)}
                  className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive ? "bg-[#e6001c] text-white" : "text-indigo-50 hover:bg-white/10"}`}
                >
                  <IconoBiblioteca nombre={({'.':'inicio',cooperativas:'personas',usuarios:'persona',reportes:'grafico',configuracion:'configuracion',ventas:'ventas',reservas:'calendario',comprobantes:'documento',reembolsos:'reembolso','/abordaje':'documento',buses:'bus',grupos:'personas',frecuencias:'calendario','hoja-ruta':'ruta',personal:'personas'} as Record<string,NombreIconoBiblioteca>)[ruta]??'persona'}/>

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
              <IconoBiblioteca nombre="salir"/>
              {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
