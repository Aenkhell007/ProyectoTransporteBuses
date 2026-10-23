import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { Ciudad } from "../../types/compra/catalogo";
import type { ViajeResultado } from "../../types/compra/viajes";
import { obtenerCiudades } from "../../features/compra/catalogoApi";
import {
  criteriosAUrl,
  formularioDesdeUrl,
  validarBusqueda,
} from "../../features/compra/busqueda";
import type { CriteriosBusqueda } from "../../features/compra/busqueda";
import {
  FILTROS_VACIOS,
  ORDENES,
  aplicarFiltrosEnUrl,
  filtrosDesdeUrl,
  hayFiltrosActivos,
  validarFiltros,
} from "../../features/compra/filtrosViajes";
import type {
  FiltrosViajes,
  OrdenViajes,
} from "../../features/compra/filtrosViajes";
import {
  buscarViajes,
  obtenerDetalleViaje,
  obtenerOpcionesFiltro,
  verificarViaje,
} from "../../features/compra/viajesApi";
import { formatearCentavos } from "../../features/compra/dinero";
import {
  formatearFechaLarga,
  formatearHora,
  hoyEnEcuador,
} from "../../features/compra/fechas";
import { mensajeDeError } from "../../features/compra/errores";
import { ProgresoCompra } from "../../components/compra/ProgresoCompra";
import { TripCard } from "../../components/compra/TripCard";
import { FiltrosViajesPanel } from "../../components/compra/FiltrosViajesPanel";
import type { OpcionesFiltro } from "../../components/compra/FiltrosViajesPanel";
import { Icono } from "../../components/compra/Icono";

type Lista =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string }
  | {
      estado: "listo";
      viajes: ViajeResultado[];
      cursor: string | null;
      cargandoMas: boolean;
      errorMas: string | null;
    };

const SIN_OPCIONES: OpcionesFiltro = {
  cooperativas: [],
  chasis: [],
  carrocerias: [],
};

/** Vista 2: resultados de búsqueda con filtros, orden y paginación. */
export function ResultadosPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const clave = params.toString();
  const formulario = useMemo(
    () => formularioDesdeUrl(new URLSearchParams(clave)),
    [clave],
  );
  const filtros = useMemo(
    () => filtrosDesdeUrl(new URLSearchParams(clave)),
    [clave],
  );
  const errorFiltros = validarFiltros(filtros);

  const [ciudades, setCiudades] = useState<Ciudad[] | null>(null);
  const [errorCiudades, setErrorCiudades] = useState(false);
  const [opciones, setOpciones] = useState<OpcionesFiltro>(SIN_OPCIONES);
  const [lista, setLista] = useState<Lista>({ estado: "cargando" });
  const [aviso, setAviso] = useState<string | null>(null);
  const [seleccionando, setSeleccionando] = useState<string | null>(null);
  const [panelMovil, setPanelMovil] = useState<"filtros" | "orden" | null>(
    null,
  );
  const [recarga, setRecarga] = useState(0);
  const peticion = useRef(0);

  const cargarCiudades = useCallback(() => {
    setErrorCiudades(false);
    obtenerCiudades()
      .then(setCiudades)
      .catch(() => setErrorCiudades(true));
  }, []);

  useEffect(() => {
    cargarCiudades();
    obtenerOpcionesFiltro()
      .then(setOpciones)
      .catch(() => setOpciones(SIN_OPCIONES));
  }, [cargarCiudades]);

  const validacion = useMemo(
    () =>
      ciudades
        ? validarBusqueda(
            formulario,
            new Set(ciudades.map((c) => c.id)),
            hoyEnEcuador(),
          )
        : null,
    [ciudades, formulario],
  );
  const criterios = validacion?.criterios ?? null;

  useEffect(() => {
    if (!criterios || errorFiltros) return;
    const n = ++peticion.current;
    setLista({ estado: "cargando" });
    buscarViajes(criterios, filtros, null)
      .then((r) => {
        if (n === peticion.current)
          setLista({
            estado: "listo",
            viajes: r.data,
            cursor: r.next_cursor,
            cargandoMas: false,
            errorMas: null,
          });
      })
      .catch((e) => {
        if (n === peticion.current)
          setLista({ estado: "error", mensaje: mensajeDeError(e) });
      });
  }, [criterios, filtros, errorFiltros, recarga]);

  const cargarMas = () => {
    if (
      lista.estado !== "listo" ||
      !lista.cursor ||
      !criterios ||
      lista.cargandoMas
    )
      return;
    const n = peticion.current;
    setLista({ ...lista, cargandoMas: true, errorMas: null });
    buscarViajes(criterios, filtros, lista.cursor)
      .then((r) => {
        if (n !== peticion.current) return;
        setLista((actual) =>
          actual.estado === "listo"
            ? {
                ...actual,
                viajes: [...actual.viajes, ...r.data],
                cursor: r.next_cursor,
                cargandoMas: false,
              }
            : actual,
        );
      })
      .catch((e) => {
        if (n !== peticion.current) return;
        setLista((actual) =>
          actual.estado === "listo"
            ? { ...actual, cargandoMas: false, errorMas: mensajeDeError(e) }
            : actual,
        );
      });
  };

  const cambiarFiltros = useCallback(
    (nuevos: FiltrosViajes) => {
      setAviso(null);
      setParams((actuales) => aplicarFiltrosEnUrl(actuales, nuevos), {
        replace: true,
      });
    },
    [setParams],
  );

  const limpiar = () => cambiarFiltros(FILTROS_VACIOS);

  const seleccionar = async (viaje: ViajeResultado) => {
    if (!criterios || seleccionando) return;
    setSeleccionando(viaje.viaje_id);
    setAviso(null);
    try {
      const actual = await verificarViaje(
        viaje,
        criterios.fecha,
        filtros.clase,
      );
      if (actual.plazas_disponibles < criterios.cantidad) {
        setAviso(
          `El viaje de las ${formatearHora(viaje.salida)} ya no tiene asientos suficientes para ${criterios.cantidad} ${criterios.cantidad === 1 ? "pasajero" : "pasajeros"}. Actualizamos la lista.`,
        );
        setRecarga((r) => r + 1);
        return;
      }
      if (actual.tarifa_desde_centavos !== viaje.tarifa_desde_centavos) {
        setAviso(
          `El precio del viaje de las ${formatearHora(viaje.salida)} cambió a ${formatearCentavos(actual.tarifa_desde_centavos)} por pasajero. Actualizamos la lista; revisa antes de continuar.`,
        );
        setRecarga((r) => r + 1);
        return;
      }
      // Selección de asientos de Mikel (vistas 3.1 / 3.2); elige la vista según el plano del bus.
      const destino = new URLSearchParams({
        viaje_id: viaje.viaje_id,
        origen_orden: String(viaje.origen_orden),
        destino_orden: String(viaje.destino_orden),
        cantidad: String(criterios.cantidad),
        plano_id: viaje.bus.plano_id,
      });
      navigate(`/asientos?${destino}`);
    } catch (e) {
      setAviso(mensajeDeError(e));
      setRecarga((r) => r + 1);
    } finally {
      setSeleccionando(null);
    }
  };

  const enlaceEditar = criterios
    ? `/?${criteriosAUrl(criterios)}#buscar`
    : `/?${new URLSearchParams(Object.entries(formulario).filter(([, v]) => v))}#buscar`;

  const nombreCiudad = (id: string) =>
    ciudades?.find((c) => c.id === id)?.nombre ?? "—";

  const selectorOrden = (idControl: string) => (
    <div className="flex items-center gap-2">
      <label
        htmlFor={idControl}
        className="text-sm whitespace-nowrap text-slate-700"
      >
        Ordenar por:
      </label>
      <select
        id={idControl}
        value={filtros.orden}
        onChange={(e) =>
          cambiarFiltros({ ...filtros, orden: e.target.value as OrdenViajes })
        }
        className="h-10 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:outline-none"
      >
        {ORDENES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.nombre}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 sm:w-[calc(100%-36px)] sm:px-0">
      <div className="rounded-lg bg-white p-3 sm:p-5">
        <ProgresoCompra pasoActual={2} />

        <div className="mt-4 grid gap-4 lg:grid-cols-[250px_1fr] xl:grid-cols-[250px_1fr_220px]">
          <aside className="space-y-4" aria-label="Tu búsqueda y filtros">
            <section
              aria-labelledby="tu-busqueda"
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <h2
                  id="tu-busqueda"
                  className="flex items-center gap-2 font-bold text-slate-900"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-green-700 text-white">
                    <Icono nombre="bus" className="h-4 w-4" />
                  </span>
                  Tu búsqueda
                </h2>
                <Link
                  to={enlaceEditar}
                  className="text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  Editar<span className="sr-only"> la búsqueda</span>
                </Link>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900">
                {nombreCiudad(formulario.origen)}{" "}
                <Icono nombre="flechaDerecha" className="h-4 w-4" />{" "}
                {nombreCiudad(formulario.destino)}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                <Icono nombre="calendario" className="h-4 w-4" />{" "}
                {formatearFechaLarga(formulario.fecha)}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                <Icono nombre="persona" className="h-4 w-4" />{" "}
                {formulario.cantidad}{" "}
                {formulario.cantidad === "1" ? "pasajero" : "pasajeros"}
              </p>
            </section>

            <div className="grid grid-cols-2 gap-2 lg:hidden">
              <button
                type="button"
                aria-expanded={panelMovil === "filtros"}
                aria-controls="panel-filtros"
                onClick={() =>
                  setPanelMovil(panelMovil === "filtros" ? null : "filtros")
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Icono nombre="filtros" className="h-4 w-4" /> Filtros
                {hayFiltrosActivos(filtros) ? " •" : ""}
              </button>
              <button
                type="button"
                aria-expanded={panelMovil === "orden"}
                aria-controls="panel-orden"
                onClick={() =>
                  setPanelMovil(panelMovil === "orden" ? null : "orden")
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Icono nombre="ordenar" className="h-4 w-4" /> Ordenar
              </button>
            </div>
            <div
              id="panel-orden"
              className={`${panelMovil === "orden" ? "block" : "hidden"} rounded-lg border border-slate-200 p-3 lg:hidden`}
            >
              {selectorOrden("orden-movil")}
            </div>
            <div
              id="panel-filtros"
              className={`${panelMovil === "filtros" ? "block" : "hidden"} lg:block`}
            >
              <FiltrosViajesPanel
                filtros={filtros}
                opciones={opciones}
                error={errorFiltros}
                onCambiar={cambiarFiltros}
                onLimpiar={limpiar}
              />
            </div>
          </aside>

          <section aria-labelledby="titulo-viajes" className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1
                  id="titulo-viajes"
                  className="text-2xl font-bold text-slate-900"
                >
                  Selecciona tu viaje
                </h1>
                <p className="text-slate-600">
                  Elige el horario y tipo de bus que más se adapte a tu viaje.
                </p>
              </div>
              <div className="hidden lg:block">
                {selectorOrden("orden-escritorio")}
              </div>
            </div>

            <div aria-live="polite" className="mt-3">
              {aviso && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                >
                  <Icono nombre="alerta" className="mt-0.5 h-4 w-4" /> {aviso}
                </p>
              )}
            </div>

            <div className="mt-3 space-y-3">
              {errorCiudades ? (
                <Estado
                  icono="alerta"
                  titulo="No pudimos cargar el catálogo de ciudades."
                >
                  <button
                    type="button"
                    onClick={cargarCiudades}
                    className={botonSecundario}
                  >
                    Reintentar
                  </button>
                </Estado>
              ) : !validacion ? (
                <p role="status" className="text-slate-600">
                  Cargando…
                </p>
              ) : !criterios ? (
                <Estado
                  icono="alerta"
                  titulo="Tu búsqueda está incompleta o no es válida."
                >
                  <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                    {Object.values(validacion.errores).map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                  <Link to={enlaceEditar} className={`${botonSecundario} mt-3`}>
                    Editar la búsqueda
                  </Link>
                </Estado>
              ) : errorFiltros ? (
                <Estado icono="alerta" titulo={errorFiltros}>
                  <p className="text-sm text-slate-700">
                    Ajusta el rango de precio para ver los viajes.
                  </p>
                </Estado>
              ) : lista.estado === "cargando" ? (
                <p
                  role="status"
                  className="rounded-lg border border-slate-200 p-6 text-center text-slate-600"
                >
                  Buscando viajes disponibles…
                </p>
              ) : lista.estado === "error" ? (
                <Estado icono="alerta" titulo={lista.mensaje}>
                  <button
                    type="button"
                    onClick={() => setRecarga((r) => r + 1)}
                    className={botonSecundario}
                  >
                    Reintentar
                  </button>
                </Estado>
              ) : lista.viajes.length === 0 ? (
                <Estado
                  icono="lupa"
                  titulo="No hay viajes con plazas para esta búsqueda."
                >
                  <p className="text-sm text-slate-700">
                    Prueba con otra fecha
                    {hayFiltrosActivos(filtros)
                      ? " o quita algunos filtros"
                      : ""}
                    .
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hayFiltrosActivos(filtros) && (
                      <button
                        type="button"
                        onClick={limpiar}
                        className={botonSecundario}
                      >
                        Limpiar filtros
                      </button>
                    )}
                    <Link to={enlaceEditar} className={botonSecundario}>
                      Cambiar la búsqueda
                    </Link>
                  </div>
                </Estado>
              ) : (
                <>
                  <p className="text-sm text-slate-600" role="status">
                    Mostrando {lista.viajes.length}{" "}
                    {lista.viajes.length === 1 ? "viaje" : "viajes"}
                    {lista.cursor ? "; hay más resultados" : ""}.
                  </p>
                  <ul className="space-y-3">
                    {lista.viajes.map((v) => (
                      <li key={v.viaje_id}>
                        <TripCard
                          viaje={v}
                          seleccionando={seleccionando === v.viaje_id}
                          deshabilitado={seleccionando !== null}
                          onSeleccionar={() => void seleccionar(v)}
                          cargarDetalle={() =>
                            obtenerDetalleViaje(
                              v.viaje_id,
                              (criterios as CriteriosBusqueda).fecha,
                              v.origen_orden,
                              v.destino_orden,
                              filtros.clase,
                            )
                          }
                        />
                      </li>
                    ))}
                  </ul>
                  {lista.errorMas && (
                    <p role="alert" className="text-sm text-red-700">
                      {lista.errorMas}
                    </p>
                  )}
                  {lista.cursor && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={cargarMas}
                        disabled={lista.cargandoMas}
                        aria-busy={lista.cargandoMas}
                        className={botonSecundario}
                      >
                        {lista.cargandoMas ? "Cargando…" : "Ver más viajes"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <aside
            aria-label="Ventajas y ayuda"
            className="space-y-4 lg:col-span-2 xl:col-span-1"
          >
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="font-bold text-slate-900">
                ¿Por qué viajar con Gran Continental?
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {[
                  "Viajes seguros y cómodos",
                  "Buses modernos",
                  "Atención de calidad",
                  "Cobertura en todo el país",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Icono
                      nombre="checkCirculo"
                      className="h-4 w-4 text-green-700"
                    />{" "}
                    {t}
                  </li>
                ))}
              </ul>
            </section>
            <div className="hidden rounded-lg bg-linear-to-b from-blue-900 to-green-800 p-5 text-center font-bold text-white xl:block">
              <p className="text-lg leading-snug">
                VIAJA SEGURO
                <br />
                VIAJA CÓMODO
                <br />
                VIAJA CON GRAN CONTINENTAL
              </p>
              <p className="mt-3 font-serif text-sm font-normal italic">
                El camino merece grandeza
              </p>
            </div>
            <section className="rounded-lg border border-slate-200 bg-white p-4 text-center">
              <h2 className="flex items-center justify-center gap-2 font-semibold text-slate-900">
                <Icono nombre="soporte" className="h-5 w-5" /> ¿Necesitas ayuda?
              </h2>
              <p className="text-sm text-slate-600">
                Contáctanos por WhatsApp o escríbenos.
              </p>
              <Link
                to="/#contacto"
                className={`${botonSecundario} mt-3 border-green-700 text-green-800`}
              >
                <Icono nombre="whatsapp" className="h-4 w-4" /> Contacto
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

const botonSecundario =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60";

function Estado({
  icono,
  titulo,
  children,
}: {
  icono: "alerta" | "lupa";
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <p className="flex items-center gap-2 font-semibold text-slate-900">
        <Icono nombre={icono} className="h-5 w-5 text-red-600" /> {titulo}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
