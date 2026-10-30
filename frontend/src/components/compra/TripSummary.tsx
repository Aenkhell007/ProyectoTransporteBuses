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
import { SERVICIOS_BUS, nombreGrupo } from "./TripCard";

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
  const { viaje, bus } = reserva;
  const pisos = [...new Set(reserva.asientos.map((a) => a.piso))].sort();
  const carroceria = [bus.carroceria, bus.carroceria_modelo]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      aria-labelledby="info-viaje"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="info-viaje"
          className="flex items-center gap-2 text-lg font-bold text-slate-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-green-700 text-white">
            <Icono nombre="bus" className="h-4 w-4" />
          </span>
          Información del viaje
        </h2>
        {accion}
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-[220px_1fr]">
        <div>
          <BusImagen
            src={bus.foto_url}
            alt={`Bus unidad ${bus.unidad}`}
            className="h-32 w-full rounded-md"
          />
          <ul
            className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600"
            aria-label="Servicios del bus"
          >
            {bus.servicios.map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <Icono nombre={SERVICIOS_BUS[s][0]} className="h-4 w-4" />
                {SERVICIOS_BUS[s][1]}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900">
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
            aria-label="Ubicación de los asientos"
          >
            {pisos.map((p) => (
              <li
                key={p}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700"
              >
                {pisoLegible(p, bus.pisos)}
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-500">Unidad</dt>
            <dd>
              {bus.unidad} · Placa {bus.placa}
            </dd>
            <dt className="text-slate-500">Carrocería</dt>
            <dd>{carroceria}</dd>
            <dt className="text-slate-500">Chasis</dt>
            <dd>{bus.chasis}</dd>
            <dt className="text-slate-500">Salida</dt>
            <dd>
              {viaje.origen.terminal} ({viaje.origen.ciudad})
            </dd>
            <dt className="text-slate-500">Llegada</dt>
            <dd>
              {viaje.destino.terminal} ({viaje.destino.ciudad})
            </dd>
            <dt className="text-slate-500">Servicios</dt>
            <dd>{bus.servicios.map((s) => SERVICIOS_BUS[s][1]).join(", ")}</dd>
          </dl>
        </div>
      </div>
    </section>
  );
}
