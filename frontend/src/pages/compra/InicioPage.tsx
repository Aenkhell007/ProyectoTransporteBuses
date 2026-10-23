import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import type { Ciudad, DestinoDestacado } from "../../types/compra/catalogo";
import {
  obtenerCiudades,
  obtenerDestinosDestacados,
} from "../../features/compra/catalogoApi";
import {
  criteriosAUrl,
  formularioDesdeUrl,
  validarBusqueda,
} from "../../features/compra/busqueda";
import type {
  ErroresBusqueda,
  FormularioBusqueda,
} from "../../features/compra/busqueda";
import { hoyEnEcuador } from "../../features/compra/fechas";
import { TripSearch } from "../../components/compra/TripSearch";
import type { EstadoCarga } from "../../components/compra/TripSearch";
import { Icono } from "../../components/compra/Icono";
import type { NombreIcono } from "../../components/compra/Icono";
import { ServiciosSeccion } from "../../components/compra/inicio/ServiciosSeccion";
import type { ClaseServicio } from "../../components/compra/inicio/ServiciosSeccion";
import { DestinosSeccion } from "../../components/compra/inicio/DestinosSeccion";
import { SobreNosotrosSeccion } from "../../components/compra/inicio/SobreNosotrosSeccion";
import { ContactoSeccion } from "../../components/compra/inicio/ContactoSeccion";

const ventajas: [NombreIcono, string, string][] = [
  ["montana", "Rutas nacionales", "a todo el Ecuador"],
  ["asiento", "Asientos cómodos", "y espaciosos"],
  ["escudo", "Viajes seguros", "y confiables"],
  ["soporte", "Soporte 24/7", "a nuestros pasajeros"],
];

/** Vistas 1 y 1.1: inicio, búsqueda, servicios, destinos, sobre nosotros y contacto. */
export function InicioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [estadoCiudades, setEstadoCiudades] = useState<EstadoCarga>("cargando");
  const [destinos, setDestinos] = useState<DestinoDestacado[]>([]);
  const [cargandoDestinos, setCargandoDestinos] = useState(true);
  // "Editar" en la vista 2 vuelve aquí con los criterios en la URL.
  const [valores, setValores] = useState<FormularioBusqueda>(() =>
    formularioDesdeUrl(params),
  );
  const [errores, setErrores] = useState<ErroresBusqueda>({});
  const [clase, setClase] = useState<{
    codigo: ClaseServicio;
    nombre: string;
  } | null>(null);
  const hoy = hoyEnEcuador();

  const cargarCiudades = useCallback(() => {
    setEstadoCiudades("cargando");
    obtenerCiudades()
      .then((lista) => {
        setCiudades(lista);
        setEstadoCiudades("listo");
      })
      .catch(() => setEstadoCiudades("error"));
  }, []);

  useEffect(() => {
    cargarCiudades();
    obtenerDestinosDestacados()
      .then(setDestinos)
      .catch(() => setDestinos([]))
      .finally(() => setCargandoDestinos(false));
  }, [cargarCiudades]);

  // Al entrar con /#contacto desde otra página, el ancla aún no existía cuando el navegador intentó desplazarse.
  useEffect(() => {
    if (!location.hash) return;
    document
      .getElementById(decodeURIComponent(location.hash.slice(1)))
      ?.scrollIntoView({ block: "start" });
  }, [location.hash]);

  const idsCiudades = useMemo(
    () => new Set(ciudades.map((c) => c.id)),
    [ciudades],
  );

  const cambiar = (nuevos: FormularioBusqueda) => {
    setValores(nuevos);
    setErrores((actuales) => {
      const siguiente = { ...actuales };
      for (const campo of Object.keys(nuevos) as (keyof FormularioBusqueda)[]) {
        if (nuevos[campo] !== valores[campo]) delete siguiente[campo];
      }
      return siguiente;
    });
  };

  const buscar = () => {
    const { criterios, errores: encontrados } = validarBusqueda(
      valores,
      idsCiudades,
      hoyEnEcuador(),
    );
    setErrores(encontrados);
    if (!criterios) return;
    navigate(
      `/viajes?${criteriosAUrl(criterios, { clase: clase?.codigo ?? "" })}`,
    );
  };

  const llevarAlFormulario = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    formRef.current
      ?.querySelector<HTMLSelectElement>("select")
      ?.focus({ preventScroll: true });
  };

  const elegirDestino = (destino: DestinoDestacado) => {
    cambiar({
      ...valores,
      destino: destino.ciudad_id,
      origen: valores.origen === destino.ciudad_id ? "" : valores.origen,
    });
    llevarAlFormulario();
  };

  const elegirServicio = (codigo: ClaseServicio, nombre: string) => {
    setClase({ codigo, nombre });
    llevarAlFormulario();
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 sm:w-[calc(100%-36px)] sm:px-0">
      <section
        aria-labelledby="inicio-titulo"
        className="relative overflow-hidden rounded-lg bg-slate-900 bg-[url('/images/fondo-andino.png')] bg-cover bg-center"
      >
        <div
          className="absolute inset-0 bg-linear-to-r from-slate-950/85 via-slate-900/55 to-slate-900/10"
          aria-hidden="true"
        />
        <div className="relative px-4 pt-10 pb-4 sm:px-8 sm:pt-16">
          <h1
            id="inicio-titulo"
            className="max-w-xl text-3xl leading-tight font-bold text-white sm:text-5xl"
          >
            Viaja por todo Ecuador con{" "}
            <span className="text-green-400">Gran Continental</span>
          </h1>
          <p className="mt-3 font-serif text-xl text-white italic sm:text-3xl">
            El camino merece grandeza.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-2 sm:mt-14 lg:grid-cols-4">
            {ventajas.map(([icono, titulo, texto]) => (
              <li
                key={titulo}
                className="flex items-center gap-3 rounded-md bg-slate-900/60 px-3 py-2 text-sm text-white"
              >
                <Icono nombre={icono} className="h-7 w-7" />
                <span>
                  <span className="block">{titulo}</span>
                  <span className="text-slate-200">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <TripSearch
              ref={formRef}
              ciudades={ciudades}
              estadoCiudades={estadoCiudades}
              onReintentar={cargarCiudades}
              valores={valores}
              onCambiar={cambiar}
              errores={errores}
              onBuscar={buscar}
              hoy={hoy}
              aviso={
                clase && (
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <span>Servicio preferido:</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 font-semibold text-green-800">
                      {clase.nombre}
                      <button
                        type="button"
                        onClick={() => setClase(null)}
                        aria-label={`Quitar el servicio ${clase.nombre}`}
                        className="rounded-full p-0.5 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-blue-600"
                      >
                        <Icono nombre="cerrar" className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </p>
                )
              }
            />
          </div>
        </div>
      </section>

      <div className="mt-4 rounded-lg bg-white/95 px-4 sm:px-8">
        <ServiciosSeccion onElegir={elegirServicio} />
        <DestinosSeccion
          destinos={destinos}
          cargando={cargandoDestinos}
          onElegir={elegirDestino}
        />
        <SobreNosotrosSeccion />
        <ContactoSeccion />
      </div>
    </div>
  );
}
