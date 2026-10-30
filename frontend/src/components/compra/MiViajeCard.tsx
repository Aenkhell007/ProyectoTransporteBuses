import { useId, useState } from "react";
import { Link } from "react-router";
import type { EstadoMiViaje, MiViaje } from "../../types/compra/misViajes";
import { formatearCentavos } from "../../features/compra/dinero";
import {
  diaEnEcuador,
  formatearDuracion,
  formatearFechaLarga,
  formatearHora,
  minutosEntre,
} from "../../features/compra/fechas";
import { BusImagen } from "./BusImagen";
import { Icono } from "./Icono";
import type { NombreIcono } from "./Icono";
import { nombreGrupo } from "./TripCard";

const ESTADOS: Record<
  EstadoMiViaje,
  { nombre: string; icono: NombreIcono; clase: string }
> = {
  CONFIRMADA: {
    nombre: "Confirmada",
    icono: "checkCirculo",
    clase: "bg-green-50 text-green-800",
  },
  PAGO_EN_VERIFICACION: {
    nombre: "Pago en verificación",
    icono: "reloj",
    clase: "bg-amber-50 text-amber-800",
  },
  FINALIZADO: {
    nombre: "Finalizado",
    icono: "checkCirculo",
    clase: "bg-green-50 text-green-800",
  },
  CANCELADA: {
    nombre: "Cancelado",
    icono: "xCirculo",
    clase: "bg-slate-100 text-slate-700",
  },
  REEMBOLSADA: {
    nombre: "Reembolsado",
    icono: "xCirculo",
    clase: "bg-slate-100 text-slate-700",
  },
};

const boton =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

function piso(pisos: number, lista: number[]) {
  if (pisos < 2) return null;
  return lista
    .map((p) => (p === 1 ? "Piso inferior" : "Piso superior"))
    .join(" y ");
}

/** Tarjeta de una compra o reserva en Mis viajes. Las acciones abren las vistas de Ángel. */
export function MiViajeCard({ viaje }: { viaje: MiViaje }) {
  const id = useId();
  const [avisoDescarga, setAvisoDescarga] = useState(false);
  const estado = ESTADOS[viaje.estado];
  const enVerificacion = viaje.estado === "PAGO_EN_VERIFICACION";
  const conBoleto =
    viaje.tipo === "COMPRA" &&
    (viaje.estado === "CONFIRMADA" || viaje.estado === "FINALIZADO");
  const listo = viaje.estado_documento === "LISTO";
  const ubicacion = piso(viaje.pisos, viaje.pisos_asientos);
  const fecha = formatearFechaLarga(diaEnEcuador(viaje.salida));
  const mensajeWhatsApp = `Mi viaje con Gran Continental: ${viaje.origen.ciudad} → ${viaje.destino.ciudad}, ${fecha}, salida ${formatearHora(viaje.salida)}. Código de compra ${viaje.codigo}.`;

  return (
    <article
      aria-labelledby={`${id}-titulo`}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span
          className={`inline-flex min-w-40 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${estado.clase}`}
        >
          <Icono nombre={estado.icono} className="h-5 w-5" /> {estado.nombre}
        </span>
        <h3 id={`${id}-titulo`}>
          <span className="block text-xs text-slate-600">
            {enVerificacion ? "Código de la reserva" : "Código de la compra"}
          </span>
          <span className="text-xl font-bold text-slate-900">
            {viaje.codigo}
          </span>
        </h3>
        <p className="flex items-center gap-2 text-slate-700">
          <Icono nombre="calendario" className="h-5 w-5 text-blue-700" />{" "}
          {fecha}
        </p>
      </header>

      <div className="mt-3 grid gap-4 md:grid-cols-[220px_1fr] lg:grid-cols-[220px_1fr_220px]">
        <BusImagen
          src={viaje.foto_url}
          alt=""
          className="h-32 w-full rounded-md"
        />
        <div className="min-w-0">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <p>
              <span className="block text-xl font-bold text-blue-800">
                {viaje.origen.ciudad}
              </span>
              <time
                dateTime={viaje.salida}
                className="text-lg font-bold text-blue-800"
              >
                {formatearHora(viaje.salida)}
              </time>
              <span className="flex items-center gap-1 text-sm text-slate-600">
                <Icono nombre="ubicacion" className="h-4 w-4 text-green-700" />
                {viaje.origen.terminal}
              </span>
            </p>
            <Icono
              nombre="flechaDerecha"
              className="mt-2 h-6 w-6 text-blue-700"
            />
            <p>
              <span className="block text-xl font-bold text-blue-800">
                {viaje.destino.ciudad}
              </span>
              <time
                dateTime={viaje.llegada}
                className="text-lg font-bold text-blue-800"
              >
                {formatearHora(viaje.llegada)}
              </time>
              <span className="ml-2 text-sm text-slate-600">
                ({formatearDuracion(minutosEntre(viaje.salida, viaje.llegada))})
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-600">
                <Icono nombre="ubicacion" className="h-4 w-4 text-green-700" />
                {viaje.destino.terminal}
              </span>
            </p>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <Icono nombre="bus" className="h-4 w-4 text-blue-700" />
                {nombreGrupo(viaje.grupo, viaje.pisos)}
                {ubicacion && ` · ${ubicacion}`}
              </span>
              <span className="flex items-center gap-1.5">
                <Icono nombre="persona" className="h-4 w-4 text-blue-700" />
                {viaje.pasajeros.length}{" "}
                {viaje.pasajeros.length === 1 ? "pasajero" : "pasajeros"} ·{" "}
                {viaje.asientos.length === 1 ? "Asiento" : "Asientos"}{" "}
                <strong>{viaje.asientos.join(" y ")}</strong>
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              <Icono nombre="personas" className="h-4 w-4 text-blue-700" />
              {viaje.pasajeros.join(" · ")}
            </li>
          </ul>
        </div>

        <div className="md:col-span-2 lg:col-span-1">
          {enVerificacion ? (
            <div className="rounded-md bg-amber-50 p-3 text-center">
              <p className="text-sm text-slate-700">Monto reportado</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatearCentavos(viaje.monto_reportado_centavos ?? 0)}
              </p>
              <p className="mt-1 text-xs text-slate-700">
                Comprobante recibido. Te avisaremos cuando se valide tu pago;
                aún no es un pago confirmado.
              </p>
            </div>
          ) : (
            <div
              className={`rounded-md p-3 text-center ${viaje.estado === "CANCELADA" || viaje.estado === "REEMBOLSADA" ? "bg-slate-100" : "bg-green-50"}`}
            >
              <p className="text-sm text-slate-700">
                {viaje.estado === "CANCELADA" || viaje.estado === "REEMBOLSADA"
                  ? "Monto pagado"
                  : "Total pagado"}
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {formatearCentavos(viaje.total_pagado_centavos ?? 0)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {conBoleto && (
          <>
            <Link
              to={`/boleto?compra_id=${encodeURIComponent(viaje.compra_id ?? "")}`}
              className={`${boton} border-red-600 bg-red-600 text-white hover:bg-red-700`}
            >
              <Icono nombre="boleto" /> Ver boleto
              <span className="sr-only"> {viaje.codigo}</span>
            </Link>
            <button
              type="button"
              disabled={!listo}
              onClick={() => setAvisoDescarga(true)}
              aria-describedby={!listo ? `${id}-emision` : undefined}
              className={`${boton} border-blue-700 text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400`}
            >
              <Icono nombre="descarga" /> Descargar PDF
              <span className="sr-only"> {viaje.codigo}</span>
            </button>
            {viaje.estado === "CONFIRMADA" && (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${boton} border-green-700 text-green-800 hover:bg-green-50`}
              >
                <Icono nombre="whatsapp" /> Compartir por WhatsApp
                <span className="sr-only"> (se abre en otra pestaña)</span>
              </a>
            )}
          </>
        )}
        {enVerificacion && (
          <Link
            to={`/pago/seguimiento?reserva_id=${encodeURIComponent(viaje.reserva_id)}`}
            className={`${boton} border-blue-700 text-blue-800 hover:bg-blue-50 sm:max-w-xs sm:self-end lg:ml-auto`}
          >
            <Icono nombre="documento" /> Ver reserva
            <span className="sr-only"> {viaje.codigo}</span>
          </Link>
        )}
        {(viaje.estado === "CANCELADA" || viaje.estado === "REEMBOLSADA") && (
          <Link
            to={`/boleto?compra_id=${encodeURIComponent(viaje.compra_id ?? "")}`}
            className={`${boton} border-blue-700 text-blue-800 hover:bg-blue-50 sm:max-w-xs lg:ml-auto`}
          >
            <Icono nombre="documento" /> Ver detalle
            <span className="sr-only"> {viaje.codigo}</span>
          </Link>
        )}
      </div>
      {conBoleto && !listo && (
        <p id={`${id}-emision`} className="mt-2 text-sm text-slate-600">
          El boleto se está emitiendo; podrás descargarlo cuando esté listo.
        </p>
      )}
      {avisoDescarga && (
        <p role="status" className="mt-2 text-sm text-slate-600">
          La descarga del PDF se habilitará cuando se integre el servicio de
          boletos.
        </p>
      )}
    </article>
  );
}
