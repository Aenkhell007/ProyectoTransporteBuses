import { Link } from "react-router";
import { Icono } from "../compra/Icono";

const fechaDelPanel = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Guayaquil",
});

interface AdminHeaderProps {
  titulo: string;
  descripcion: string;
  nombreUsuario?: string;
  cargando: boolean;
}

export function AdminHeader({ titulo, descripcion, nombreUsuario, cargando }: AdminHeaderProps) {
  const hoy = new Date();
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-white px-4 pt-2 pb-4 text-[#08064e] sm:px-5 lg:min-h-24 lg:py-4">
      <div>
        <h1 className="text-2xl leading-tight font-bold lg:text-4xl">{titulo}</h1>
        <p className="mt-1 text-sm text-indigo-900">{descripcion}</p>
      </div>
      <div className="flex items-center gap-4">
        <time dateTime={hoy.toISOString()} className="flex items-center gap-2 rounded-lg border border-indigo-100 px-3 py-2 text-sm">
          <Icono nombre="calendario" className="size-4" />
          {fechaDelPanel.format(hoy)}
        </time>
        <div className="absolute top-[18px] right-3 z-20 lg:static lg:border-l lg:border-indigo-100 lg:pl-4">
          {cargando ? (
            <span role="status" className="sr-only text-sm text-slate-600 lg:not-sr-only">Consultando sesión…</span>
          ) : nombreUsuario ? (
            <details className="relative">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-md text-sm lg:px-1 [&::-webkit-details-marker]:hidden">
                <span className="grid size-10 place-items-center rounded-full bg-blue-50"><Icono nombre="persona" /></span>
                <span className="sr-only lg:not-sr-only lg:max-w-44 lg:truncate" title={nombreUsuario}>{nombreUsuario}</span>
                <Icono nombre="chevronAbajo" className="hidden size-4 lg:block" />
              </summary>
              <div className="absolute right-0 z-10 mt-2 min-w-36 rounded-md border border-indigo-100 bg-white p-1 shadow-md">
                <Link to="/mi-cuenta" className="block rounded px-3 py-2 text-sm hover:bg-blue-50">Mi cuenta</Link>
              </div>
            </details>
          ) : (
            <Link to="/iniciar-sesion" className="flex size-11 items-center justify-center gap-2 rounded-full bg-blue-50 text-sm hover:bg-indigo-50 lg:w-auto lg:rounded-md lg:px-3">
              <Icono nombre="persona" />
              <span className="sr-only lg:not-sr-only">Iniciar sesión</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
