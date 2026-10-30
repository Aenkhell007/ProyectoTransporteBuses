import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type {
  BeneficioVigente,
  ReservaPendiente,
} from "../../types/compra/reserva";
import {
  aceptarCotizacion,
  cancelarReservaResumen,
  obtenerBeneficiosResumen,
  obtenerResumen,
  recotizar,
} from "../../features/compra/resumenApi";
import { ErrorCompra, mensajeDeError } from "../../features/compra/errores";
import { formatearCentavos } from "../../features/compra/dinero";
import {
  diaEnEcuador,
  edadEnFecha,
  formatearFechaNumerica,
  formatearHora,
} from "../../features/compra/fechas";
import { ProgresoCompra } from "../../components/compra/ProgresoCompra";
import { TripSummary } from "../../components/compra/TripSummary";
import { PriceBreakdown } from "../../components/compra/PriceBreakdown";
import { Icono } from "../../components/compra/Icono";
import type { NombreIcono } from "../../components/compra/Icono";

type Carga =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string; status: number }
  | {
      estado: "listo";
      reserva: ReservaPendiente & {
        cotizacion: NonNullable<ReservaPendiente["cotizacion"]>;
      };
      beneficios: BeneficioVigente[];
    };

const TIPO_DOCUMENTO: Record<string, string> = {
  CEDULA: "Cédula",
  PASAPORTE: "Pasaporte",
  OTRO: "Otro",
};

/** Vista 5: resumen del viaje, pasajeros, descuentos y total que devuelve el servidor. */
export function ResumenCompraPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reservaId = params.get("reserva_id");
  const [carga, setCarga] = useState<Carga>({ estado: "cargando" });
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aceptando, setAceptando] = useState(false);
  const [confirmarEdicion, setConfirmarEdicion] = useState(false);
  const aceptandoRef = useRef(false);

  const cargar = useCallback(async () => {
    if (!reservaId) return;
    setCarga({ estado: "cargando" });
    try {
      const [reserva, beneficios] = await Promise.all([
        obtenerResumen(reservaId),
        obtenerBeneficiosResumen(),
      ]);
      // Si los pasajeros cambiaron después de la última cotización, se pide una nueva al servidor.
      const cotizacion = reserva.cotizacion ?? (await recotizar(reservaId));
      setCarga({
        estado: "listo",
        reserva: { ...reserva, cotizacion },
        beneficios,
      });
    } catch (e) {
      setCarga({
        estado: "error",
        mensaje: mensajeDeError(e),
        status: e instanceof ErrorCompra ? e.status : 0,
      });
    }
  }, [reservaId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const continuar = async () => {
    if (carga.estado !== "listo" || !reservaId || aceptandoRef.current) return;
    aceptandoRef.current = true;
    setAceptando(true);
    setError(null);
    setAviso(null);
    const version = carga.reserva.cotizacion.version;
    try {
      await aceptarCotizacion(reservaId, version);
      navigate(`/pago?reserva_id=${encodeURIComponent(reservaId)}`);
    } catch (e) {
      if (e instanceof ErrorCompra && e.status === 409) {
        setAviso(e.message);
        await cargar();
      } else {
        setError(mensajeDeError(e));
      }
    } finally {
      aceptandoRef.current = false;
      setAceptando(false);
    }
  };

  if (!reservaId) {
    return (
      <Marco>
        <Vacio
          titulo="No hay una reserva en curso"
          texto="Busca un viaje y registra a los pasajeros para ver el resumen."
        />
      </Marco>
    );
  }
  if (carga.estado === "cargando") {
    return (
      <Marco>
        <p role="status" className="p-6 text-center text-slate-600">
          Cargando el resumen de tu viaje…
        </p>
      </Marco>
    );
  }
  if (carga.estado === "error") {
    return (
      <Marco>
        <Vacio
          titulo={
            carga.status === 409
              ? "Tu reserva ya no está disponible"
              : "No pudimos cargar el resumen"
          }
          texto={carga.mensaje}
          reintentar={
            carga.status === 0 || carga.status >= 500
              ? () => void cargar()
              : undefined
          }
        />
      </Marco>
    );
  }

  const { reserva, beneficios } = carga;
  const { cotizacion } = reserva;
  const fechaSalida = diaEnEcuador(reserva.viaje.salida);
  const enlacePasajeros = `/pasajeros?reserva_id=${encodeURIComponent(reserva.reserva_id)}`;
  const busqueda = new URLSearchParams({
    origen: reserva.viaje.origen.ciudad_id,
    destino: reserva.viaje.destino.ciudad_id,
    fecha: fechaSalida,
    cantidad: String(reserva.cantidad),
  });
  const filas = reserva.asientos.map((a) => {
    const pasajero = reserva.pasajeros.find(
      (p) => p.reserva_asiento_id === a.reserva_asiento_id,
    );
    const linea = cotizacion.lineas.find(
      (l) => l.reserva_asiento_id === a.reserva_asiento_id,
    );
    const edad = pasajero?.nacimiento
      ? edadEnFecha(pasajero.nacimiento, fechaSalida)
      : null;
    return { asiento: a, pasajero, linea, edad };
  });
  const conDescuento = filas.filter(
    (f) => f.linea && f.linea.descuento_centavos > 0,
  );
  const sinRegla = beneficios.filter((b) => !b.activo);
  const tipo = (f: (typeof filas)[number]) =>
    `${f.linea?.beneficio_nombre ?? "Adulto"}${f.linea?.beneficio_codigo === "NINO" && f.edad !== null ? ` (${f.edad} ${f.edad === 1 ? "año" : "años"})` : ""}`;

  const editarViaje = async () => {
    try {
      await cancelarReservaResumen(reserva.reserva_id);
      navigate(`/viajes?${busqueda}`);
    } catch (e) {
      setConfirmarEdicion(false);
      setError(mensajeDeError(e));
    }
  };

  const enlaceEditar = (to: string, texto: string) => (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
    >
      <Icono nombre="editar" className="h-4 w-4" /> Editar
      <span className="sr-only"> {texto}</span>
    </Link>
  );

  return (
    <Marco>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Resumen de tu viaje
        </h1>
        <p className="text-slate-600">
          Revisa la información de tu viaje, los pasajeros, los descuentos
          aplicados y el total a pagar.
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-700">
          <Icono nombre="reloj" className="h-4 w-4 text-amber-600" />
          <span>
            Tus asientos están retenidos hasta las{" "}
            <strong>{formatearHora(reserva.expires_at)}</strong>.
          </span>
        </p>
      </div>

      <div aria-live="polite">
        {aviso && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <Icono nombre="alerta" className="mt-0.5 h-4 w-4" /> {aviso}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <Icono nombre="alerta" className="mt-0.5 h-4 w-4" /> {error}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <div className="min-w-0 space-y-4">
          <TripSummary
            reserva={reserva}
            accion={
              <button
                type="button"
                onClick={() => setConfirmarEdicion(true)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Icono nombre="editar" className="h-4 w-4" /> Editar
                <span className="sr-only"> el viaje</span>
              </button>
            }
          />
          {confirmarEdicion && (
            <div
              role="alertdialog"
              aria-labelledby="confirmar-edicion"
              className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"
            >
              <p id="confirmar-edicion" className="text-amber-900">
                Para cambiar el viaje se cancelará esta reserva, se liberarán
                tus asientos y tendrás que volver a cotizar. ¿Quieres continuar?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void editarViaje()}
                  className="rounded-md bg-amber-600 px-3 py-1.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  Sí, cambiar viaje
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmarEdicion(false)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  No, seguir aquí
                </button>
              </div>
            </div>
          )}

          <Seccion
            icono="personas"
            titulo="Pasajeros registrados"
            resumen={`${reserva.cantidad} ${reserva.cantidad === 1 ? "pasajero" : "pasajeros"}`}
            accion={enlaceEditar(enlacePasajeros, "los pasajeros")}
          >
            <ul className="space-y-2 sm:hidden">
              {filas.map((f, i) => (
                <li
                  key={f.asiento.reserva_asiento_id}
                  className="rounded-md border border-slate-100 p-3 text-sm"
                >
                  <p className="flex items-center justify-between gap-2 font-semibold text-slate-900">
                    <span>
                      {i + 1}.{" "}
                      {f.pasajero
                        ? `${f.pasajero.nombres} ${f.pasajero.apellidos}`
                        : "—"}
                    </span>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-800">
                      {f.asiento.codigo}
                    </span>
                  </p>
                  <p className="text-slate-600">
                    {tipo(f)} ·{" "}
                    {f.pasajero
                      ? `${TIPO_DOCUMENTO[f.pasajero.tipo_documento]} ${f.pasajero.documento}`
                      : "—"}
                  </p>
                  {f.linea && (
                    <p className="mt-1 flex justify-between">
                      <span className="text-slate-600">
                        {formatearCentavos(f.linea.base_centavos)}
                        {f.linea.descuento_centavos > 0 && (
                          <span className="text-green-700">
                            {" "}
                            {formatearCentavos(-f.linea.descuento_centavos)}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold">
                        {formatearCentavos(f.linea.subtotal_neto_centavos)}
                      </span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[560px] text-sm">
                <caption className="sr-only">
                  Pasajeros, documento, asiento y precio por pasajero
                </caption>
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th scope="col" className="py-1.5 font-medium">
                      #
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      Nombre completo
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      Tipo de pasajero
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      Documento
                    </th>
                    <th scope="col" className="py-1.5 font-medium">
                      Asiento
                    </th>
                    <th scope="col" className="py-1.5 text-right font-medium">
                      Tarifa base
                    </th>
                    <th scope="col" className="py-1.5 text-right font-medium">
                      Descuento
                    </th>
                    <th scope="col" className="py-1.5 text-right font-medium">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr
                      key={f.asiento.reserva_asiento_id}
                      className="border-b border-slate-100"
                    >
                      <td className="py-2">{i + 1}</td>
                      <th scope="row" className="py-2 text-left font-normal">
                        {f.pasajero
                          ? `${f.pasajero.nombres} ${f.pasajero.apellidos}`
                          : "—"}
                      </th>
                      <td className="py-2 text-slate-600">{tipo(f)}</td>
                      <td className="py-2">
                        <span className="sr-only">
                          {f.pasajero
                            ? TIPO_DOCUMENTO[f.pasajero.tipo_documento]
                            : ""}{" "}
                        </span>
                        {f.pasajero?.documento ?? "—"}
                      </td>
                      <td className="py-2">
                        <span className="rounded bg-blue-50 px-2 py-0.5 font-semibold text-blue-800">
                          {f.asiento.codigo}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {f.linea
                          ? formatearCentavos(f.linea.base_centavos)
                          : "—"}
                      </td>
                      <td
                        className={`py-2 text-right ${f.linea && f.linea.descuento_centavos > 0 ? "text-green-700" : ""}`}
                      >
                        {f.linea && f.linea.descuento_centavos > 0
                          ? formatearCentavos(-f.linea.descuento_centavos)
                          : "-"}
                      </td>
                      <td className="py-2 text-right font-semibold">
                        {f.linea
                          ? formatearCentavos(f.linea.subtotal_neto_centavos)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Seccion>

          <PriceBreakdown cotizacion={cotizacion} />
        </div>

        <aside
          className="space-y-4 lg:sticky lg:top-28 lg:self-start"
          aria-label="Descuentos"
        >
          <Seccion
            icono="porcentaje"
            titulo="Descuentos aplicados"
            resumen={
              conDescuento.length === 1
                ? "1 descuento"
                : `${conDescuento.length} descuentos`
            }
            accion={enlaceEditar(enlacePasajeros, "los descuentos")}
          >
            {conDescuento.length === 0 ? (
              <p className="text-sm text-slate-600">
                No se aplicaron descuentos a esta compra.
              </p>
            ) : (
              <ul className="space-y-3">
                {conDescuento.map((f) => (
                  <li
                    key={f.asiento.reserva_asiento_id}
                    className="rounded-md bg-green-50 p-3 text-sm"
                  >
                    <p className="font-semibold text-slate-900">
                      {f.pasajero?.nombres} {f.pasajero?.apellidos} -{" "}
                      {f.asiento.codigo}
                    </p>
                    <p className="text-slate-700">{tipo(f)}</p>
                    <p className="font-semibold text-green-800">
                      Descuento aplicado:{" "}
                      {formatearCentavos(-(f.linea?.descuento_centavos ?? 0))}
                    </p>
                    <div className="mt-2 flex gap-2 border-t border-green-100 pt-2 text-xs text-slate-700">
                      <Icono nombre="documento" className="h-4 w-4 shrink-0" />
                      <span>
                        <span className="block font-semibold">
                          Validación del beneficio
                        </span>
                        {f.pasajero?.nacimiento && (
                          <>
                            Fecha de nacimiento registrada:{" "}
                            {formatearFechaNumerica(f.pasajero.nacimiento)}
                            .{" "}
                          </>
                        )}
                        {beneficios.find(
                          (b) => b.codigo === f.linea?.beneficio_codigo,
                        )?.condiciones ??
                          "Presentar documento de identidad al abordar."}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {sinRegla.length > 0 && (
              <div className="mt-3 flex gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                <Icono nombre="personas" className="h-5 w-5 shrink-0" />
                <span>
                  <span className="block font-semibold">Otros beneficios</span>
                  {sinRegla.map((b) => b.nombre).join(" y ")}: según los
                  requisitos de la tarifa vigente. Hoy no tienen una regla de
                  descuento activa.
                </span>
              </div>
            )}
            <p className="mt-3 flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
              <Icono nombre="info" className="mt-0.5 h-4 w-4" /> Los descuentos
              requieren verificación del documento al abordar.
            </p>
          </Seccion>
        </aside>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link
          to={enlacePasajeros}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <Icono nombre="flechaIzquierda" className="h-4 w-4" /> Volver a
          pasajeros
        </Link>
        <button
          type="button"
          onClick={() => void continuar()}
          disabled={aceptando}
          aria-busy={aceptando}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-red-600 px-6 text-lg font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:bg-red-400"
        >
          {aceptando
            ? "Confirmando…"
            : `Continuar al pago · ${formatearCentavos(cotizacion.total_centavos)}`}
          <Icono nombre="flechaDerecha" />
        </button>
      </div>
    </Marco>
  );
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 sm:w-[calc(100%-36px)] sm:px-0">
      <div className="space-y-5 rounded-lg bg-white p-3 sm:p-5">
        <ProgresoCompra pasoActual={5} />
        {children}
      </div>
    </div>
  );
}

/** Sección con encabezado; en móvil se puede plegar sin cambiar los valores. */
function Seccion({
  icono,
  titulo,
  resumen,
  accion,
  children,
}: {
  icono: NombreIcono;
  titulo: string;
  resumen: string;
  accion?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const [abierta, setAbierta] = useState(true);
  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id={`${id}-titulo`}
          className="flex items-center gap-2 text-lg font-bold text-slate-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white">
            <Icono nombre={icono} className="h-4 w-4" />
          </span>
          <span>
            {titulo}
            <span className="block text-xs font-normal text-slate-500 lg:hidden">
              {resumen}
            </span>
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {accion}
          <button
            type="button"
            onClick={() => setAbierta(!abierta)}
            aria-expanded={abierta}
            aria-controls={`${id}-contenido`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 lg:hidden"
          >
            <Icono nombre={abierta ? "chevronArriba" : "chevronAbajo"} />
            <span className="sr-only">
              {abierta ? "Contraer" : "Expandir"} {titulo}
            </span>
          </button>
        </div>
      </div>
      <div
        id={`${id}-contenido`}
        className={`mt-3 ${abierta ? "" : "hidden lg:block"}`}
      >
        {children}
      </div>
    </section>
  );
}

function Vacio({
  titulo,
  texto,
  reintentar,
}: {
  titulo: string;
  texto: string;
  reintentar?: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
      <h1 className="text-xl font-bold text-slate-900">{titulo}</h1>
      <p className="mt-1 text-slate-600">{texto}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {reintentar && (
          <button
            type="button"
            onClick={reintentar}
            className="inline-flex min-h-11 items-center rounded-md border border-slate-300 bg-white px-4 font-semibold focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Reintentar
          </button>
        )}
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-md bg-red-600 px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          Buscar un viaje
        </Link>
      </div>
    </div>
  );
}
