import type { DestinoDestacado } from "../../../types/compra/catalogo";
import { formatearCentavos } from "../../../features/compra/dinero";
import { Icono } from "../Icono";
import { EncabezadoSeccion } from "./EncabezadoSeccion";

const fondos = [
  "from-sky-700 to-emerald-700",
  "from-blue-800 to-sky-600",
  "from-amber-700 to-rose-800",
  "from-emerald-800 to-amber-700",
  "from-orange-700 to-sky-800",
];

interface DestinosSeccionProps {
  destinos: DestinoDestacado[];
  cargando: boolean;
  onElegir: (destino: DestinoDestacado) => void;
}

export function DestinosSeccion({
  destinos,
  cargando,
  onElegir,
}: DestinosSeccionProps) {
  return (
    <section id="rutas" aria-labelledby="rutas-titulo" className="py-8">
      <EncabezadoSeccion
        idTitulo="rutas-titulo"
        antetitulo="Rutas destacadas"
        titulo="Conéctate con los principales destinos del Ecuador"
      />
      {cargando ? (
        <p role="status" className="text-center text-sm text-slate-600">
          Cargando destinos…
        </p>
      ) : (
        <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
          {destinos.map((d, i) => (
            <li
              key={d.ciudad_id}
              className="w-40 shrink-0 snap-start sm:w-auto"
            >
              <button
                type="button"
                onClick={() => onElegir(d)}
                className={`group relative flex h-28 w-full items-end justify-between overflow-hidden rounded-lg bg-linear-to-br p-3 text-left text-white shadow focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${fondos[i % fondos.length]}`}
              >
                <span>
                  <span className="block text-lg font-bold">{d.nombre}</span>
                  <span className="text-sm">
                    Desde {formatearCentavos(d.tarifa_desde_centavos)}
                  </span>
                  <span className="sr-only">. Buscar viajes a {d.nombre}</span>
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900 transition group-hover:translate-x-0.5">
                  <Icono nombre="chevronDerecha" className="h-4 w-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-center text-xs text-slate-500">
        Precios referenciales por pasajero. El valor final y la disponibilidad
        se confirman al elegir el viaje.
      </p>
    </section>
  );
}
