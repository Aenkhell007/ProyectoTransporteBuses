import { fotoDestino } from "../../../features/compra/fotos";
import type { DestinoDestacado } from "../../../types/compra/catalogo";
import { formatearCentavos } from "../../../features/compra/dinero";
import { Icono } from "../Icono";
import { EncabezadoSeccion } from "./EncabezadoSeccion";

// Contenido visual permanente. Las tarifas y los IDs siguen procediendo del servidor.
const CIUDADES_DESTACADAS = ["Quito", "Guayaquil", "Cuenca", "Ambato", "Loja"];

interface DestinosSeccionProps {
  destinos: DestinoDestacado[];
  cargando: boolean;
  onElegir: (nombre: string) => void;
}

export function DestinosSeccion({ destinos, cargando, onElegir }: DestinosSeccionProps) {
  return (
    <section id="rutas" aria-labelledby="rutas-titulo" className="py-8">
      <EncabezadoSeccion
        idTitulo="rutas-titulo"
        antetitulo="Rutas destacadas"
        titulo="Conéctate con los principales destinos del Ecuador"
      />
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
        {CIUDADES_DESTACADAS.map(nombre => {
          const destino = destinos.find(d => d.nombre.trim().localeCompare(nombre, "es", { sensitivity: "base" }) === 0);
          const tarifa = destino?.tarifa_desde_centavos;
          const tieneTarifa = typeof tarifa === "number" && Number.isSafeInteger(tarifa) && tarifa >= 0;
          return (
            <li key={nombre} className="w-40 shrink-0 snap-start sm:w-auto">
              <button
                type="button"
                onClick={() => onElegir(nombre)}
                className="group relative flex h-28 w-full items-end justify-between overflow-hidden rounded-lg bg-slate-800 p-3 text-left text-white shadow focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <img src={fotoDestino(nombre)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />
                <span className="relative">
                  <span className="block text-lg font-bold">{nombre}</span>
                  <span className="text-sm">{tieneTarifa ? `Desde ${formatearCentavos(tarifa)}` : "Consultar viajes"}</span>
                  <span className="sr-only">. Buscar viajes a {nombre}</span>
                </span>
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 transition group-hover:translate-x-0.5">
                  <Icono nombre="chevronDerecha" className="h-4 w-4" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-center text-xs text-slate-500" role={cargando ? "status" : undefined}>
        {cargando ? "Consultando tarifas disponibles…" : "Los precios se muestran cuando hay tarifas disponibles. El valor final y la disponibilidad se confirman al elegir el viaje."}
      </p>
    </section>
  );
}
