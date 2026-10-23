import { useId, useState } from "react";
import type {
  ClaseAsientoCodigo,
  DetalleViaje,
  ServicioBus,
  ViajeResultado,
} from "../../types/compra/viajes";
import { formatearCentavos } from "../../features/compra/dinero";
import {
  formatearDuracion,
  formatearHora,
  minutosEntre,
} from "../../features/compra/fechas";
import { mensajeDeError } from "../../features/compra/errores";
import { BusImagen } from "./BusImagen";
import { Icono } from "./Icono";
import type { NombreIcono } from "./Icono";

export const SERVICIOS_BUS: Record<ServicioBus, [NombreIcono, string]> = {
  AIRE: ["clima", "Aire acondicionado"],
  ASIENTO_CAMA: ["asiento", "Asientos cama 160°"],
  ASIENTO_RECLINABLE: ["asiento", "Asientos reclinables"],
  WIFI: ["wifi", "WiFi"],
  BANO: ["bano", "Baño"],
  PANTALLAS: ["pantalla", "Pantallas"],
  ENCHUFES: ["enchufe", "Enchufes USB"],
  PORTAEQUIPAJE: ["maleta", "Portaequipaje"],
};

export const NOMBRE_CLASE: Record<ClaseAsientoCodigo, string> = {
  NORMAL: "Normal",
  EJECUTIVO: "VIP",
};

export function nombreGrupo(grupo: string, pisos: number) {
  return `${grupo} (${pisos >= 2 ? "Dos pisos" : "Un piso"})`;
}

interface TripCardProps {
  viaje: ViajeResultado;
  seleccionando: boolean;
  deshabilitado: boolean;
  onSeleccionar: () => void;
  cargarDetalle: () => Promise<DetalleViaje>;
}

type EstadoDetalle =
  | { estado: "cerrado" }
  | { estado: "cargando" }
  | { estado: "listo"; detalle: DetalleViaje }
  | { estado: "error"; mensaje: string };

export function TripCard({
  viaje,
  seleccionando,
  deshabilitado,
  onSeleccionar,
  cargarDetalle,
}: TripCardProps) {
  const id = useId();
  const [detalle, setDetalle] = useState<EstadoDetalle>({ estado: "cerrado" });
  const { bus } = viaje;
  const abierto = detalle.estado !== "cerrado";

  const alternarDetalle = () => {
    if (abierto) return setDetalle({ estado: "cerrado" });
    setDetalle({ estado: "cargando" });
    cargarDetalle()
      .then((d) => setDetalle({ estado: "listo", detalle: d }))
      .catch((e) =>
        setDetalle({ estado: "error", mensaje: mensajeDeError(e) }),
      );
  };

  const etiqueta = "rounded-md px-2 py-0.5 text-xs font-medium";

  return (
    <article
      aria-labelledby={`${id}-titulo`}
      className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[150px_1fr] lg:grid-cols-[160px_1fr_190px]">
        <BusImagen
          src={bus.foto_url}
          alt={`Bus unidad ${bus.unidad}`}
          className="h-28 w-full rounded-md sm:h-full sm:max-h-32"
        />

        <div className="min-w-0">
          <ul
            className="flex flex-wrap gap-1.5"
            aria-label="Características del viaje"
          >
            <li className={`${etiqueta} bg-green-50 text-green-800`}>
              {nombreGrupo(bus.grupo, bus.pisos)}
            </li>
            {viaje.clases.map((c) => (
              <li key={c} className={`${etiqueta} bg-blue-50 text-blue-800`}>
                {NOMBRE_CLASE[c]}
              </li>
            ))}
            <li
              className={`${etiqueta} ${viaje.tipo_viaje === "DIRECTO" ? "bg-green-50 text-green-800" : "bg-sky-50 text-sky-800"}`}
            >
              {viaje.tipo_viaje === "DIRECTO" ? "Directo" : "Con paradas"}
            </li>
          </ul>
          <h3
            id={`${id}-titulo`}
            className="mt-1.5 text-lg font-bold text-slate-900"
          >
            {viaje.cooperativa}
            <span className="sr-only">
              , salida {formatearHora(viaje.salida)} desde {viaje.origen.ciudad}
            </span>
          </h3>
          <p className="flex flex-wrap items-baseline gap-x-3 text-xl font-bold text-slate-900">
            <time dateTime={viaje.salida}>{formatearHora(viaje.salida)}</time>
            <Icono
              nombre="flechaDerecha"
              className="h-4 w-4 self-center text-slate-500"
            />
            <time dateTime={viaje.llegada}>{formatearHora(viaje.llegada)}</time>
            <span className="text-base font-normal text-slate-600">
              {formatearDuracion(minutosEntre(viaje.salida, viaje.llegada))}
            </span>
          </p>
          <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-sm">
            <Terminal
              ciudad={viaje.origen.ciudad}
              terminal={viaje.origen.terminal}
            />
            <Icono
              nombre="flechaDerecha"
              className="mt-1 h-4 w-4 text-slate-400"
            />
            <Terminal
              ciudad={viaje.destino.ciudad}
              terminal={viaje.destino.terminal}
            />
          </div>
          <p className="mt-2 text-sm text-slate-700">
            Unidad {bus.unidad} · Placa {bus.placa}
          </p>
          <p className="text-sm text-slate-500">
            Chasis {bus.chasis} · Carrocería {bus.carroceria}
          </p>
          <button
            type="button"
            onClick={alternarDetalle}
            aria-expanded={abierto}
            aria-controls={`${id}-detalle`}
            className="mt-1 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {abierto ? "Ocultar detalles del bus" : "Ver detalles del bus"}
            <Icono
              nombre={abierto ? "chevronArriba" : "flechaDerecha"}
              className="h-4 w-4"
            />
          </button>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 pt-3 sm:col-span-2 sm:flex-row sm:items-end lg:col-span-1 lg:flex-col lg:items-stretch lg:border-0 lg:pt-0">
          <p className="text-right">
            <span className="block text-sm text-slate-600">desde</span>
            <span className="text-2xl font-bold text-slate-900">
              {formatearCentavos(viaje.tarifa_desde_centavos)}
            </span>
            <span className="block text-xs text-slate-500">por pasajero</span>
          </p>
          <p className="flex items-center gap-2 text-sm text-slate-700 lg:justify-end">
            <Icono nombre="asiento" className="h-5 w-5 text-green-700" />
            {viaje.plazas_disponibles}{" "}
            {viaje.plazas_disponibles === 1
              ? "asiento disponible"
              : "asientos disponibles"}
          </p>
          <button
            type="button"
            onClick={onSeleccionar}
            disabled={deshabilitado}
            aria-busy={seleccionando}
            aria-describedby={`${id}-titulo`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-5 font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {seleccionando ? "Verificando…" : "Seleccionar"}
            <Icono nombre="flechaDerecha" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ul
        className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600"
        aria-label="Servicios del bus"
      >
        {bus.servicios.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <Icono nombre={SERVICIOS_BUS[s][0]} className="h-4 w-4" />
            {SERVICIOS_BUS[s][1]}
          </li>
        ))}
      </ul>

      <div
        id={`${id}-detalle`}
        hidden={!abierto}
        className="mt-3 rounded-md bg-slate-50 p-3 text-sm"
      >
        {detalle.estado === "cargando" && (
          <p role="status">Cargando detalles del bus…</p>
        )}
        {detalle.estado === "error" && (
          <p role="alert" className="text-red-700">
            {detalle.mensaje}
          </p>
        )}
        {detalle.estado === "listo" && (
          <div className="grid gap-3 md:grid-cols-2">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-slate-500">Unidad</dt>
              <dd>{detalle.detalle.bus.unidad}</dd>
              <dt className="text-slate-500">Placa</dt>
              <dd>{detalle.detalle.bus.placa}</dd>
              <dt className="text-slate-500">Chasis</dt>
              <dd>{detalle.detalle.bus.chasis}</dd>
              <dt className="text-slate-500">Carrocería</dt>
              <dd>{detalle.detalle.bus.carroceria}</dd>
              <dt className="text-slate-500">Pisos</dt>
              <dd>{detalle.detalle.bus.pisos}</dd>
            </dl>
            <div>
              <p className="font-semibold text-slate-800">
                {detalle.detalle.tipo_viaje === "DIRECTO"
                  ? "Ruta directa"
                  : "Paradas de la ruta"}
              </p>
              <ol className="mt-1 space-y-1">
                {detalle.detalle.paradas.map((parada) => {
                  const enTramo =
                    parada.orden >= viaje.origen_orden &&
                    parada.orden <= viaje.destino_orden;
                  return (
                    <li
                      key={parada.orden}
                      className={`flex gap-2 ${enTramo ? "text-slate-900" : "text-slate-400"}`}
                    >
                      <time
                        dateTime={parada.hora}
                        className="w-12 shrink-0 tabular-nums"
                      >
                        {formatearHora(parada.hora)}
                      </time>
                      <span>
                        {parada.ciudad} · {parada.terminal}
                        {!enTramo && (
                          <span className="sr-only"> (fuera de tu tramo)</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function Terminal({ ciudad, terminal }: { ciudad: string; terminal: string }) {
  return (
    <span className="flex min-w-0 gap-1.5">
      <Icono nombre="ubicacion" className="mt-0.5 h-4 w-4 text-green-700" />
      <span className="min-w-0">
        <span className="block font-semibold text-slate-900">{ciudad}</span>
        <span className="block text-slate-500">{terminal}</span>
      </span>
    </span>
  );
}
