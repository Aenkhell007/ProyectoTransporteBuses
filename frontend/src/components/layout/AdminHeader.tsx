import { Link } from "react-router";
import { Icono } from "../compra/Icono";

const fechaDelPanel = new Intl.DateTimeFormat("es-EC", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Guayaquil",
});

interface AdminHeaderProps {
  cabeceraApp?: boolean;
  nombreUsuario?: string;
  cargando: boolean;
}

export function AdminHeader({ cabeceraApp = false, nombreUsuario, cargando }: AdminHeaderProps) {
  const hoy = new Date();
  const tituloPanel = "Panel de administración";
  const descripcionPanel = "Gestiona cooperativas, usuarios y accesos al sistema.";
  const titulo = (
    <div className={cabeceraApp ? "min-w-0 max-[960px]:sr-only" : ""}>
      <h1 className={cabeceraApp ? "truncate text-xl font-bold xl:text-2xl" : "text-2xl leading-tight font-bold lg:text-4xl"}>
        {tituloPanel}
      </h1>
      <p className="mt-1 text-sm text-indigo-900">{descripcionPanel}</p>
    </div>
  );

  if (cabeceraApp) {
    return (
      <header className="gc-header">
        <div className="gc-header__inner">
          <Link to="/vista-previa/panel" className="gc-brand" aria-label="Gran Continental, resumen de administración">
            <img src="/images/Logo G-C.png" alt="Gran Continental" width="216" height="88" />
          </Link>
          {titulo}
          <div className="flex shrink-0 items-center gap-4">
            <time dateTime={hoy.toISOString()} className="hidden items-center gap-2 rounded-lg border border-indigo-100 px-3 py-2 text-sm min-[1121px]:flex">
              <Icono nombre="calendario" className="size-4" />
              {fechaDelPanel.format(hoy)}
            </time>
            {cargando ? (
              <span role="status" className="text-sm">Consultando…</span>
            ) : (
              <Link
                to={nombreUsuario ? "/mi-cuenta" : "/iniciar-sesion"}
                title={nombreUsuario}
                aria-label={nombreUsuario ? `Mi cuenta, ${nombreUsuario}` : "Iniciar sesión"}
                className="flex min-h-11 items-center gap-2 rounded-md bg-blue-50 px-3 text-sm"
              >
                <Icono nombre="persona" />
                <span className="hidden max-w-36 truncate min-[961px]:inline">{nombreUsuario ?? "Iniciar sesión"}</span>
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-white px-4 pt-2 pb-4 text-[#08064e] sm:px-5 lg:min-h-24 lg:py-4">
      <div>
        <h1 className="text-2xl leading-tight font-bold lg:text-4xl">Panel de administración</h1>
        <p className="mt-1 text-sm text-indigo-900">Gestiona cooperativas, usuarios y accesos al sistema.</p>
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
