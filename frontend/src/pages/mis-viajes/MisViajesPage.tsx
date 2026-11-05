import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import type {
  FiltrosMisViajes,
  MiViaje,
  SeccionMisViajes,
} from "../../types/compra/misViajes";
import {
  ESTADOS_POR_SECCION,
  filtrosMisViajesAUrl,
  filtrosMisViajesDesdeUrl,
  listarMisViajes,
  validarFiltrosMisViajes,
} from "../../features/compra/misViajesApi";
import { ErrorCompra, mensajeDeError } from "../../features/compra/errores";
import { MyTripsTabs } from "../../components/compra/MyTripsTabs";
import { MiViajeCard } from "../../components/compra/MiViajeCard";
import { Icono } from "../../components/compra/Icono";

type Lista =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string; status: number }
  | { estado: "listo"; viajes: MiViaje[]; siguiente: string | null };

const PANEL = "panel-mis-viajes";
const control =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-200";

/** Vistas 9 y 9.1: Mis viajes con pestañas Próximos e Historial. Solo compras de la sesión. */
export function MisViajesPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const clave = params.toString();
  const filtros = useMemo(
    () => filtrosMisViajesDesdeUrl(new URLSearchParams(clave)),
    [clave],
  );
  const errorFiltros = validarFiltrosMisViajes(filtros);
  const [busqueda, setBusqueda] = useState(filtros.q);
  // Cursores de las páginas visitadas; se reinician al cambiar cualquier filtro.
  const [cursores, setCursores] = useState<(string | null)[]>([null]);
  const [pagina, setPagina] = useState(0);
  const [lista, setLista] = useState<Lista>({ estado: "cargando" });
  const [recarga, setRecarga] = useState(0);
  const peticion = useRef(0);

  const cambiar = (nuevos: FiltrosMisViajes) =>
    setParams(filtrosMisViajesAUrl(nuevos), { replace: true });

  useEffect(() => {
    setCursores([null]);
    setPagina(0);
  }, [clave]);

  useEffect(() => setBusqueda(filtros.q), [filtros.q]);

  // La búsqueda por texto se aplica tras una pausa para no consultar en cada tecla.
  useEffect(() => {
    if (busqueda.trim() === filtros.q) return;
    const t = setTimeout(() => cambiar({ ...filtros, q: busqueda }), 400);
    return () => clearTimeout(t);
  });

  const cursor = cursores[pagina] ?? null;
  useEffect(() => {
    if (errorFiltros) return;
    const n = ++peticion.current;
    setLista({ estado: "cargando" });
    listarMisViajes(filtros, cursor)
      .then(
        (r) =>
          n === peticion.current &&
          setLista({
            estado: "listo",
            viajes: r.data,
            siguiente: r.next_cursor,
          }),
      )
      .catch(
        (e) =>
          n === peticion.current &&
          setLista({
            estado: "error",
            mensaje: mensajeDeError(e),
            status: e instanceof ErrorCompra ? e.status : 0,
          }),
      );
  }, [filtros, cursor, errorFiltros, recarga]);

  const irSiguiente = () => {
    if (lista.estado !== "listo" || !lista.siguiente) return;
    const siguiente = lista.siguiente;
    setCursores((c) => [...c.slice(0, pagina + 1), siguiente]);
    setPagina((p) => p + 1);
  };

  const cambiarSeccion = (seccion: SeccionMisViajes) =>
    cambiar({ seccion, estado: "", q: filtros.q, desde: "", hasta: "" });

  const historial = filtros.seccion === "historial";
  const hayFiltros = !!(
    filtros.estado ||
    filtros.q ||
    filtros.desde ||
    filtros.hasta
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 sm:w-[calc(100%-36px)] sm:px-0">
      <div className="space-y-5 rounded-lg bg-white p-3 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 sm:text-4xl">
              Mis viajes
            </h1>
            <p className="text-blue-900 sm:text-lg">
              Consulta tus reservas y accede al boleto de cada compra.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-md border-2 border-blue-700 px-5 font-semibold text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Icono nombre="lupa" /> Buscar un viaje
          </Link>
        </div>

        <MyTripsTabs
          actual={filtros.seccion}
          onCambiar={cambiarSeccion}
          panelId={PANEL}
        />

        <div
          id={PANEL}
          role="tabpanel"
          aria-labelledby={`pestana-${filtros.seccion}`}
          className="space-y-4"
        >
          <div
            className={`grid gap-3 ${historial ? "md:grid-cols-[1fr_170px_170px_220px]" : "md:grid-cols-[1fr_260px]"}`}
          >
            <div className="relative">
              <label htmlFor="mv-buscar" className="sr-only">
                Buscar por código o destino
              </label>
              <Icono
                nombre="lupa"
                className="pointer-events-none absolute top-3 left-3 h-5 w-5 text-blue-700"
              />
              <input
                id="mv-buscar"
                type="search"
                value={busqueda}
                maxLength={60}
                placeholder="Buscar por código o destino"
                onChange={(e) => setBusqueda(e.target.value)}
                className={`${control} pl-10`}
              />
            </div>
            {historial && (
              <>
                <div>
                  <label
                    htmlFor="mv-desde"
                    className="mb-1 block text-xs font-semibold text-slate-600 md:sr-only"
                  >
                    Desde
                  </label>
                  <input
                    id="mv-desde"
                    type="date"
                    value={filtros.desde}
                    aria-invalid={!!errorFiltros}
                    aria-describedby={
                      errorFiltros ? "mv-error-fechas" : undefined
                    }
                    onChange={(e) =>
                      cambiar({ ...filtros, desde: e.target.value })
                    }
                    className={control}
                    title="Desde"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mv-hasta"
                    className="mb-1 block text-xs font-semibold text-slate-600 md:sr-only"
                  >
                    Hasta
                  </label>
                  <input
                    id="mv-hasta"
                    type="date"
                    value={filtros.hasta}
                    aria-invalid={!!errorFiltros}
                    aria-describedby={
                      errorFiltros ? "mv-error-fechas" : undefined
                    }
                    onChange={(e) =>
                      cambiar({ ...filtros, hasta: e.target.value })
                    }
                    className={control}
                    title="Hasta"
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="mv-estado" className="sr-only">
                Estado
              </label>
              <select
                id="mv-estado"
                value={filtros.estado}
                onChange={(e) =>
                  cambiar({
                    ...filtros,
                    estado: e.target.value as FiltrosMisViajes["estado"],
                  })
                }
                className={control}
              >
                <option value="">Todos los estados</option>
                {ESTADOS_POR_SECCION[filtros.seccion].map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {errorFiltros && (
            <p
              id="mv-error-fechas"
              role="alert"
              className="text-sm text-red-700"
            >
              {errorFiltros}
            </p>
          )}

          {errorFiltros ? null : lista.estado === "cargando" ? (
            <p
              role="status"
              className="rounded-lg border border-slate-200 p-6 text-center text-slate-600"
            >
              Cargando tus viajes…
            </p>
          ) : lista.estado === "error" ? (
            <div
              role="alert"
              className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center"
            >
              <p className="font-semibold text-slate-900">
                {lista.status === 401
                  ? "Inicia sesión para ver tus viajes."
                  : lista.mensaje}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {lista.status === 401 ? (
                  <Link
                    to="/iniciar-sesion"
                    state={{ from: location }}
                    className="inline-flex min-h-11 items-center rounded-md bg-red-600 px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    Iniciar sesión
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRecarga((r) => r + 1)}
                    className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 font-semibold focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          ) : lista.viajes.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="font-semibold text-slate-900">
                {hayFiltros
                  ? "No encontramos viajes con esos filtros."
                  : historial
                    ? "Tu historial todavía está vacío."
                    : "No tienes viajes próximos."}
              </p>
              <p className="mt-1 text-slate-600">
                {hayFiltros
                  ? "Prueba con otro código, destino o estado."
                  : "Cuando compres un pasaje aparecerá aquí."}
              </p>
              <Link
                to="/"
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Icono nombre="lupa" /> Buscar un viaje
              </Link>
            </div>
          ) : (
            <>
              <ul
                className="space-y-4"
                aria-label={
                  historial ? "Historial de viajes" : "Próximos viajes"
                }
              >
                {lista.viajes.map((v) => (
                  <li key={v.reserva_id}>
                    <MiViajeCard viaje={v} />
                  </li>
                ))}
              </ul>
              {!historial && (
                <p className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
                  <Icono nombre="info" className="h-5 w-5" /> Los boletos
                  estarán disponibles cuando tu pago esté confirmado.
                </p>
              )}
            </>
          )}

          {lista.estado === "listo" && lista.viajes.length > 0 && (
            <nav
              aria-label="Páginas de Mis viajes"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"
            >
              <p role="status" className="text-sm text-slate-600">
                Mostrando <strong>{lista.viajes.length}</strong>{" "}
                {historial
                  ? lista.viajes.length === 1
                    ? "compra"
                    : "compras"
                  : lista.viajes.length === 1
                    ? "reserva"
                    : "reservas"}{" "}
                · Página {pagina + 1}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(0, p - 1))}
                  disabled={pagina === 0}
                  aria-label="Página anterior"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40"
                >
                  <Icono nombre="chevronIzquierda" />
                </button>
                <span
                  aria-current="page"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-blue-700 font-semibold text-white"
                >
                  {pagina + 1}
                </span>
                <button
                  type="button"
                  onClick={irSiguiente}
                  disabled={!lista.siguiente}
                  aria-label="Página siguiente"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40"
                >
                  <Icono nombre="chevronDerecha" />
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
