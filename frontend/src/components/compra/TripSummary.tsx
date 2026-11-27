import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { ReservaPendiente } from "../../types/compra/reserva";
import {
  diaEnEcuador,
  formatearDuracion,
  formatearFechaLarga,
  formatearHora,
  minutosEntre,
} from "../../features/compra/fechas";
import { BusImagen } from "./BusImagen";
import { Icono } from "./Icono";
import { infoServicioBus, NOMBRE_CLASE, nombreGrupo } from "./TripCard";

interface TripSummaryProps {
  reserva: ReservaPendiente;
  /** Acción "Editar" de la tarjeta (cambiar de viaje). */
  accion?: ReactNode;
}

function pisoLegible(piso: number, pisos: number) {
  if (pisos < 2) return "Un piso";
  return piso === 1 ? "Piso inferior" : "Piso superior";
}

/** Información del viaje y del bus de una reserva (vista 5). Solo muestra datos. */
export function TripSummary({ reserva, accion }: TripSummaryProps) {
  const idContenido = useId();
  const [abierta, setAbierta] = useState(true);
  const { viaje, bus } = reserva;
  const pisos = [...new Set(reserva.asientos.map((a) => a.piso))].sort();
  const clases = [...new Set(reserva.asientos.map((a) => a.clase))];

  return (
    <section
      aria-labelledby="info-viaje"
      className="rounded-lg border border-indigo-100 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-indigo-50 pb-3">
        <h2
          id="info-viaje"
          className="flex items-center gap-2 text-lg font-bold text-[#08035b]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-green-700 text-white">
            <Icono nombre="bus" className="h-4 w-4" />
          </span>
          Información del viaje
        </h2>
        <div className="flex items-center gap-2">
          {accion}
          <button
            type="button"
            onClick={() => setAbierta(!abierta)}
            aria-expanded={abierta}
            aria-controls={idContenido}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 lg:hidden"
          >
            <Icono nombre={abierta ? "chevronArriba" : "chevronAbajo"} />
            <span className="sr-only">
              {abierta ? "Contraer" : "Expandir"} información del viaje
            </span>
          </button>
        </div>
      </div>

      <div
        id={idContenido}
        className={`mt-3 gap-4 md:grid-cols-[200px_1fr] ${abierta ? "grid" : "hidden lg:grid"}`}
      >
        <div>
          <BusImagen
            src={bus.foto_url} pisos={bus.pisos}
            alt={`Bus unidad ${bus.unidad}`}
            className="h-36 w-full rounded-md"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="flex flex-wrap items-center gap-2 text-xl font-bold text-[#08035b]">
              {viaje.origen.ciudad}{" "}
              <Icono nombre="flechaDerecha" className="h-4 w-4" />{" "}
              {viaje.destino.ciudad}
            </p>
            <span className="rounded-md bg-green-50 px-2.5 py-1 text-sm font-medium text-green-800">
              {nombreGrupo(bus.grupo, bus.pisos)}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-2 text-slate-700">
            <Icono nombre="calendario" className="h-4 w-4" />{" "}
            {formatearFechaLarga(diaEnEcuador(viaje.salida))}
          </p>
          <p className="flex items-center gap-2 text-slate-700">
            <Icono nombre="reloj" className="h-4 w-4" />
            {formatearHora(viaje.salida)} → {formatearHora(viaje.llegada)} (
            {formatearDuracion(minutosEntre(viaje.salida, viaje.llegada))})
          </p>
          <ul
            className="mt-2 flex flex-wrap gap-2 text-sm"
            aria-label="Ubicación y clase de los asientos"
          >
            {pisos.map((p) => (
              <li
                key={p}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700"
              >
                {pisoLegible(p, bus.pisos)}
              </li>
            ))}
            {clases.map((c) => (
              <li
                key={c}
                className={`rounded-md px-2.5 py-1 ${c === "VIP" || c === "EJECUTIVO" ? "bg-amber-100 font-semibold text-amber-900" : "bg-blue-50 text-blue-800"}`}
              >
                {NOMBRE_CLASE[c]}
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-slate-500">Unidad</dt>
            <dd>
              {bus.unidad} · Placa {bus.placa}
            </dd>
            <dt className="text-slate-500">Salida</dt>
            <dd>
              {viaje.origen.terminal} ({viaje.origen.ciudad})
            </dd>
            <dt className="text-slate-500">Llegada</dt>
            <dd>
              {viaje.destino.terminal} ({viaje.destino.ciudad})
            </dd>
            {bus.servicios.length > 0 && (
              <>
                <dt className="text-slate-500">Servicios</dt>
                <dd>
                  <ul
                    className="flex flex-wrap gap-1.5"
                    aria-label="Servicios del bus"
                  >
                    {bus.servicios.map((s) => {
                      const [icono, etiqueta] = infoServicioBus(s);
                      return (
                        <li
                          key={s}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
                        >
                          <Icono nombre={icono} className="h-3.5 w-3.5 shrink-0 text-[#08035b]" />
                          <span>{etiqueta}</span>
                        </li>
                      );
                    })}
                  </ul>
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}
