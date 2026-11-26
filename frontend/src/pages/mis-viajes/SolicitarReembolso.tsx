import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../features/auth/AuthContext";
import { http } from "../../services/http";
import type { DatosPago } from "../../../../shared/pagos";
import { Icono } from "../../components/compra/Icono";
import { MyTripsTabs } from "../../components/compra/MyTripsTabs";
import { BusImagen } from "../../components/compra/BusImagen";
import { Confirmacion } from "../../features/operacion/ui";
import {
  diaEnEcuador,
  formatearDuracion,
  formatearFechaLarga,
  formatearHora,
  minutosEntre,
} from "../../features/compra/fechas";

type Datos = {
  pago: DatosPago;
  elegibilidad: {
    elegible: boolean;
    motivo?: string;
    minutos?: number;
    porcentajeBp?: number;
    montoCentavos?: number;
    baseCentavos?: number;
  };
  solicitud: {
    id: string;
    estado: string;
    motivo: string;
    monto_centavos: number;
    decision_motivo: string | null;
  } | null;
  asientos?: {
    id: string;
    estado: string;
    codigo: string;
    piso: number;
    nombre: string;
    pagado_centavos: number | string;
  }[];
  politica: {
    permite_parcial?: boolean;
    numero_version: number;
    condiciones: string | null;
    plazo_abono_dias: number | null;
  } | null;
};

const dinero = (n: number) => "$ " + (n / 100).toFixed(2);
const boton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
const razones: Record<string, string> = {
  SIN_POLITICA_PUBLICADA_EN_LA_COMPRA:
    "Esta compra no tenía una política publicada al confirmarse.",
  VIAJE_INICIADO_CANCELADO_O_ABORDADO:
    "El viaje ya salió, la compra fue cancelada o se registró un abordaje.",
  POLITICA_NO_PERMITE_PARCIAL:
    "La política de esta compra permite cancelar únicamente la reserva completa.",
  REGLA_INCOMPLETA:
    "La política de esta compra no tiene una regla para la anticipación actual.",
};

export default function SolicitarReembolso() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rid = params.get("reserva_id");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [turno, reintentar] = useState(0);
  const [motivo, M] = useState("Cambio de planes");
  const [observacion, O] = useState("");
  const [ocupado, S] = useState(false);
  const [confirmar, C] = useState(false);
  const [creada, G] = useState("");
  const [pasajeros, seleccionarPasajeros] = useState<string[] | null>(null);
  const seleccionClave =
    pasajeros === null ? "TOTAL" : pasajeros.slice().sort().join(",");
  const clave = useRef(crypto.randomUUID());
  const bloqueo = useRef(false);

  useEffect(() => {
    clave.current = crypto.randomUUID();
    G("");
  }, [rid, auth.usuario?.id, seleccionClave]);

  useEffect(() => {
    let vivo = true;
    if (pasajeros?.length === 0) return;
    setDatos(null);
    setError("");
    setCargando(true);
    if (!auth.usuario) {
      setCargando(false);
      return;
    }
    if (!rid || !/^[0-9a-f-]{36}$/i.test(rid)) {
      setError("Abre la solicitud desde una compra en Mis viajes.");
      setCargando(false);
      return;
    }
    http<Datos>(
      "/reservas/" +
        encodeURIComponent(rid) +
        "/reembolso" +
        (pasajeros ? "?asientos=" + encodeURIComponent(pasajeros.join(",")) : ""),
    )
      .then((d) => {
        if (vivo) setDatos(d);
      })
      .catch((e) => {
        if (vivo) setError(e.message);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [rid, auth.usuario?.id, turno, seleccionClave]);

  if (auth.cargando) {
    return (
      <p role="status" className="p-6 text-center text-slate-700">
        Comprobando sesión…
      </p>
    );
  }
  if (!auth.usuario) {
    return <Navigate to="/iniciar-sesion" state={{ from: location }} replace />;
  }

  const d = datos?.pago;
  const e = datos?.elegibilidad;
  const s = datos?.solicitud;
  const pendiente = !!s && ["SOLICITADO", "APROBADO"].includes(s.estado);
  const monto = pasajeros?.length === 0 ? 0 : Number(e?.montoCentavos ?? 0);
  const pagado =
    pasajeros?.length === 0
      ? 0
      : Number(e?.baseCentavos ?? d?.compra?.totalPagadoCentavos ?? 0);
  const texto = [motivo, observacion.trim()].filter(Boolean).join(": ");
  const pisosTexto = d
    ? [...new Set(d.pasajeros.map((p) => p.piso))].join(" / ")
    : "";

  async function enviar() {
    if (
      bloqueo.current ||
      !!creada ||
      !rid ||
      !datos?.elegibilidad.elegible ||
      pendiente ||
      pasajeros?.length === 0
    ) {
      return;
    }
    bloqueo.current = true;
    S(true);
    setError("");
    try {
      const r = await http<{ id: string }>(
        "/reservas/" + encodeURIComponent(rid) + "/reembolso",
        {
          method: "POST",
          body: JSON.stringify({
            motivo: texto,
            clave: clave.current,
            asientos: pasajeros,
          }),
        },
      );
      G(r.id);
      C(false);
      const datosActualizados = await http<Datos>(
        "/reservas/" + encodeURIComponent(rid) + "/reembolso",
      ).catch(() => null);
      if (datosActualizados) setDatos(datosActualizados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar.");
      C(false);
    } finally {
      bloqueo.current = false;
      S(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 sm:w-[calc(100%-36px)] sm:px-0">
      <div className="space-y-4 rounded-lg bg-white p-3 text-blue-950 sm:p-6">
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
          actual="proximos"
          panelId="panel-reembolso"
          onCambiar={(sec) =>
            navigate(
              sec === "historial" ? "/mis-viajes?seccion=historial" : "/mis-viajes",
            )
          }
        />

        <div className="border-t border-slate-100 pt-3">
          <Link
            to="/mis-viajes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
          >
            <Icono nombre="flechaIzquierda" className="h-4 w-4" />
            Volver a Mis viajes
          </Link>
        </div>

        <section
          id="panel-reembolso"
          className="space-y-4 rounded-xl border border-blue-100 bg-white p-4 sm:p-5"
        >
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-blue-100 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-[#1002b4]">
                  Solicitar reembolso
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    datos?.politica
                      ? "border border-blue-200 bg-blue-50 text-blue-800"
                      : "border border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <Icono nombre="reloj" className="h-3.5 w-3.5" />
                  {datos?.politica
                    ? `Política v${datos.politica.numero_version}`
                    : "Sin política publicada"}
                </span>
              </div>
              <p className="mt-1 text-sm text-blue-800">
                Completa la información para solicitar el reembolso de esta
                reserva.
              </p>
            </div>
          </header>

          {error && (
            <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}{" "}
              <button
                type="button"
                className="ml-2 font-semibold underline"
                onClick={() => reintentar((t) => t + 1)}
              >
                Reintentar
              </button>
            </div>
          )}

          {cargando && (
            <p role="status" className="rounded-md bg-blue-50 p-4 text-sm text-blue-900">
              Consultando compra y política…
            </p>
          )}

          {creada && (
            <p
              role="status"
              className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            >
              Solicitud enviada para revisión. Referencia: {creada}. El abono no
              es inmediato.
            </p>
          )}

          {d && (
            <>
              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.1fr)_minmax(280px,0.95fr)]">
                {/* Columna 1: Resumen de la reserva */}
                <section className="min-w-0 space-y-3 rounded-lg border border-blue-100 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
                      <Icono nombre="checkCirculo" className="h-4 w-4 text-green-700" />
                      Confirmada
                    </span>
                    <div className="text-right">
                      <span className="block text-[11px] text-slate-500">
                        Código de la compra
                      </span>
                      <strong className="text-sm text-[#1002b4]">
                        {d.compra?.codigo}
                      </strong>
                    </div>
                  </div>

                  <BusImagen
                    pisos={d.viaje.pisos}
                    alt={`${d.viaje.cooperativa} ${d.viaje.servicio}`}
                    className="h-36 w-full rounded-lg border border-blue-100"
                  />

                  <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 rounded-md bg-blue-50/40 p-3 text-sm">
                    <div className="min-w-0">
                      <strong className="block truncate text-blue-950">
                        {d.viaje.origen}
                      </strong>
                      <p className="text-lg font-bold text-[#1002b4]">
                        {formatearHora(d.viaje.salida)}
                      </p>
                      <p className="flex items-start gap-1 text-xs text-slate-600">
                        <Icono nombre="ubicacion" className="mt-0.5 h-3.5 w-3.5 text-blue-600" />
                        <span className="truncate">{d.viaje.terminalOrigen}</span>
                      </p>
                    </div>
                    <div className="pt-1 text-center text-xs text-slate-500">
                      <Icono nombre="flechaDerecha" className="mx-auto h-4 w-4 text-blue-700" />
                      <span className="mt-1 block">
                        {formatearDuracion(
                          Math.max(0, minutosEntre(d.viaje.salida, d.viaje.llegada)),
                        )}
                      </span>
                    </div>
                    <div className="min-w-0 text-right">
                      <strong className="block truncate text-blue-950">
                        {d.viaje.destino}
                      </strong>
                      <p className="text-lg font-bold text-[#1002b4]">
                        {formatearHora(d.viaje.llegada)}
                      </p>
                      <p className="flex items-start justify-end gap-1 text-xs text-slate-600">
                        <Icono nombre="ubicacion" className="mt-0.5 h-3.5 w-3.5 text-green-700" />
                        <span className="truncate">{d.viaje.terminalDestino}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-blue-100 pt-3 text-xs text-blue-900">
                    <p className="flex items-center gap-2">
                      <Icono nombre="bus" className="h-4 w-4 text-blue-700" />
                      <span>
                        {d.viaje.servicio} ({d.viaje.pisos === 2 ? "Dos pisos" : "Un piso"})
                        {pisosTexto ? ` · Piso ${pisosTexto}` : ""} · Unidad {d.viaje.unidad}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Icono nombre="asiento" className="h-4 w-4 text-blue-700" />
                      <span>
                        {d.pasajeros.length}{" "}
                        {d.pasajeros.length === 1 ? "pasajero" : "pasajeros"} · Asientos{" "}
                        <strong>
                          {d.pasajeros.map((p) => p.asiento).join(", ")}
                        </strong>
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <Icono nombre="personas" className="mt-0.5 h-4 w-4 text-blue-700" />
                      <span className="wrap-break-word">
                        {d.pasajeros.map((p) => p.nombre).join(" · ")}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 border-t border-blue-50 pt-2">
                      <Icono nombre="calendario" className="h-4 w-4 text-blue-700" />
                      <span>{formatearFechaLarga(diaEnEcuador(d.viaje.salida))}</span>
                    </p>
                  </div>
                </section>

                {/* Columna 2: Alcance y motivo */}
                <section className="min-w-0 rounded-lg border border-blue-100 bg-white p-4">
                  {pendiente ? (
                    <div
                      role="status"
                      className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
                    >
                      <b>Solicitud {s?.estado}</b>
                      <p className="mt-1">{s?.motivo}</p>
                      {s?.decision_motivo && (
                        <p className="mt-1 text-xs">{s.decision_motivo}</p>
                      )}
                    </div>
                  ) : (
                    <form
                      id="form-reembolso"
                      onSubmit={(ev) => {
                        ev.preventDefault();
                        if (texto.length > 500) {
                          setError(
                            "El motivo y la observación admiten hasta 500 caracteres en total.",
                          );
                          return;
                        }
                        C(true);
                      }}
                    >
                      <fieldset
                        disabled={ocupado || !!creada}
                        className="space-y-4"
                      >
                        <fieldset className="space-y-3 rounded-lg bg-blue-50/50 p-3">
                          <legend className="text-sm font-bold text-[#1002b4]">
                            ¿Para qué deseas solicitar el reembolso?
                          </legend>
                          <div className="space-y-1">
                            <label
                              htmlFor="alcance-total"
                              className="flex items-center gap-2 text-sm font-semibold text-blue-950"
                            >
                              <input
                                id="alcance-total"
                                type="radio"
                                name="alcance-reembolso"
                                checked={pasajeros === null}
                                onChange={() => seleccionarPasajeros(null)}
                              />
                              Toda la compra
                            </label>
                            <p className="pl-6 text-xs text-slate-600">
                              Se solicitará el reembolso del total disponible de
                              la reserva.
                            </p>
                          </div>

                          {datos?.politica?.permite_parcial ? (
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <label
                                  htmlFor="alcance-parcial"
                                  className="flex items-center gap-2 text-sm font-semibold text-blue-950"
                                >
                                  <input
                                    id="alcance-parcial"
                                    type="radio"
                                    name="alcance-reembolso"
                                    checked={pasajeros !== null}
                                    onChange={() => seleccionarPasajeros([])}
                                  />
                                  Seleccionar pasajeros
                                </label>
                                <p className="pl-6 text-xs text-slate-600">
                                  Podrás elegir los pasajeros de esta reserva.
                                </p>
                              </div>
                              {pasajeros !== null && (
                                <div className="space-y-1.5 rounded-md border border-blue-100 bg-white p-2.5">
                                  {(datos.asientos ?? [])
                                    .filter((a) => a.estado === "CONFIRMADO")
                                    .map((a) => (
                                      <label
                                        key={a.id}
                                        className="flex items-center gap-2 text-xs text-blue-950"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={pasajeros.includes(a.id)}
                                          onChange={(ev) =>
                                            seleccionarPasajeros(
                                              ev.target.checked
                                                ? [...pasajeros, a.id]
                                                : pasajeros.filter((id) => id !== a.id),
                                            )
                                          }
                                        />
                                        <span>
                                          {a.nombre} · {a.codigo} ·{" "}
                                          {dinero(Number(a.pagado_centavos))}
                                        </span>
                                      </label>
                                    ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="rounded-md bg-white/80 p-2.5 text-xs text-blue-900">
                              Esta compra admite solicitudes por la reserva
                              completa, según su política original.
                            </p>
                          )}
                        </fieldset>

                        <label className="block text-sm font-semibold text-[#1002b4]">
                          Motivo de la solicitud
                          <select
                            className="mt-1 min-h-11 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-normal text-blue-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            value={motivo}
                            onChange={(ev) => M(ev.target.value)}
                          >
                            {[
                              "Cambio de planes",
                              "No podré viajar",
                              "Error en la compra",
                              "Otro motivo",
                            ].map((m) => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-sm font-semibold text-[#1002b4]">
                          Observación (opcional)
                          <textarea
                            className="mt-1 w-full rounded-md border border-blue-200 bg-white p-3 text-sm font-normal text-blue-950 outline-none placeholder:text-indigo-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            rows={4}
                            maxLength={450}
                            placeholder="Puedes escribir un comentario sobre tu solicitud."
                            value={observacion}
                            onChange={(ev) => O(ev.target.value)}
                          />
                          <span className="mt-1 block text-right text-xs font-normal text-slate-500">
                            {observacion.length}/450
                          </span>
                        </label>
                      </fieldset>
                    </form>
                  )}
                </section>

                {/* Columna 3: Estimación de devolución */}
                <aside className="min-w-0 space-y-4 rounded-lg border border-blue-100 bg-white p-4">
                  <h3 className="border-b border-blue-100 pb-3 text-lg font-bold text-[#1002b4]">
                    Estimación de devolución
                  </h3>

                  {e?.elegible ? (
                    <>
                      <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600">
                          <Icono nombre="reloj" className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-blue-800">
                            Tiempo hasta la salida
                          </p>
                          <strong className="mt-0.5 block text-2xl font-bold text-[#1002b4]">
                            {Math.floor((e.minutos ?? 0) / 60)} horas
                          </strong>
                          <p className="mt-0.5 text-xs text-slate-600">
                            La solicitud debe enviarse antes de la salida del
                            bus.
                          </p>
                        </div>
                      </div>

                      <dl className="space-y-2.5 text-sm">
                        <div className="flex justify-between gap-2">
                          <dt className="text-blue-900">
                            {pasajeros ? "Importe seleccionado" : "Total pagado"}
                          </dt>
                          <dd className="font-semibold text-blue-950">
                            {dinero(pagado)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-blue-900">
                            Porcentaje de devolución
                          </dt>
                          <dd className="font-semibold text-blue-950">
                            {Number(e.porcentajeBp) / 100}%
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-green-900">
                          <dt className="text-xs font-semibold">
                            Monto estimado de devolución
                          </dt>
                          <dd className="text-xl font-bold text-green-800">
                            {dinero(monto)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2 pt-1">
                          <dt className="text-blue-900">Monto por retención</dt>
                          <dd className="font-semibold text-blue-950">
                            {dinero(pagado - monto)}
                          </dd>
                        </div>
                      </dl>
                      <p className="flex items-start gap-2 text-xs text-slate-600">
                        <Icono nombre="info" className="mt-0.5 h-4 w-4 text-blue-600" />
                        <span>
                          Corresponde a retención según la política de
                          reembolsos.
                        </span>
                      </p>
                    </>
                  ) : (
                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {razones[e?.motivo ?? ""] ??
                        "Esta compra no admite una nueva solicitud ordinaria."}
                    </p>
                  )}

                  <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
                    <Icono nombre="info" className="mt-0.5 h-4 w-4 text-blue-600" />
                    <span>
                      La devolución se solicita para revisión; no implica un
                      abono inmediato.
                    </span>
                  </div>

                  <details className="rounded-md border border-blue-100 bg-white p-3 text-sm">
                    <summary className="flex cursor-pointer items-center gap-2 font-semibold text-blue-800">
                      <Icono nombre="documento" className="h-4 w-4" />
                      <span>Ver política de reembolsos</span>
                    </summary>
                    <div className="mt-3 space-y-2 border-t border-blue-50 pt-2 text-xs text-slate-700">
                      {datos?.politica && (
                        <p className="font-semibold text-blue-900">
                          Versión {datos.politica.numero_version}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">
                        {datos?.politica?.condiciones ??
                          "No hay condiciones publicadas asociadas a esta compra."}
                      </p>
                      {datos?.politica?.plazo_abono_dias && (
                        <p>
                          Plazo de abono: {datos.politica.plazo_abono_dias}{" "}
                          días, según la política.
                        </p>
                      )}
                    </div>
                  </details>
                </aside>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <Icono nombre="alerta" className="h-5 w-5 text-amber-600" />
                <span>
                  Después de la salida no se permiten solicitudes ordinarias
                  desde esta opción.
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Link className={boton} to="/mis-viajes">
                  <Icono nombre="flechaIzquierda" className="h-4 w-4" />
                  Volver a Mis viajes
                </Link>
                {!pendiente && (
                  <button
                    type="submit"
                    form="form-reembolso"
                    disabled={
                      ocupado ||
                      !!creada ||
                      !e?.elegible ||
                      pasajeros?.length === 0
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#ff0018] px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icono nombre="boleto" className="h-4 w-4" />
                    Solicitar reembolso
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {confirmar && (
        <Confirmacion
          titulo="Confirmar solicitud de reembolso"
          accion="Enviar solicitud"
          ocupado={ocupado}
          cerrar={() => C(false)}
          confirmar={() => void enviar()}
        >
          <p>
            Se solicitará el reembolso de{" "}
            {pasajeros
              ? pasajeros.length + " pasajero(s) seleccionados"
              : "la compra disponible completa"}
            . La estimación actual es {dinero(monto)} y se vuelve a validar en
            el servidor al enviar.
          </p>
        </Confirmacion>
      )}
    </div>
  );
}
