import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type {
  BeneficioVigente,
  ReservaPendiente,
} from "../../types/compra/reserva";
import {
  cancelarReserva,
  cotizarReserva,
  guardarPasajeros,
  obtenerBeneficios,
  obtenerPerfil,
  obtenerReserva,
} from "../../features/compra/reservaApi";
import {
  fichaAPasajero,
  fichaVacia,
  pasajeroAFicha,
  validarFichas,
} from "../../features/compra/pasajeros";
import type {
  ErroresFicha,
  FichaPasajero,
} from "../../features/compra/pasajeros";
import { ErrorCompra, mensajeDeError } from "../../features/compra/errores";
import { formatearCentavos } from "../../features/compra/dinero";
import {
  diaEnEcuador,
  formatearDuracion,
  formatearFechaLarga,
  formatearHora,
  hoyEnEcuador,
  minutosEntre,
} from "../../features/compra/fechas";
import { ProgresoCompra } from "../../components/compra/ProgresoCompra";
import { PassengerForm } from "../../components/compra/PassengerForm";
import { BusImagen } from "../../components/compra/BusImagen";
import { Icono } from "../../components/compra/Icono";
import type { NombreIcono } from "../../components/compra/Icono";

type Carga =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string; status: number }
  | {
      estado: "listo";
      reserva: ReservaPendiente;
      beneficios: BeneficioVigente[];
    };

type Envio =
  | { estado: "inactivo" }
  | { estado: "enviando"; paso: string }
  | { estado: "error"; mensaje: string; conflicto: boolean };

const CAMPOS_PERFIL = [
  "nombres",
  "apellidos",
  "tipo_documento",
  "documento",
  "nacimiento",
  "telefono",
  "email",
] as const;

/** Vista 4: datos de los pasajeros, un pasajero por asiento reservado. */
export function PasajerosPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reservaId = params.get("reserva_id");

  const [carga, setCarga] = useState<Carga>({ estado: "cargando" });
  const [fichas, setFichas] = useState<FichaPasajero[]>([]);
  const [abiertas, setAbiertas] = useState<boolean[]>([]);
  const [errores, setErrores] = useState<ErroresFicha[]>([]);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [envio, setEnvio] = useState<Envio>({ estado: "inactivo" });
  const [perfil, setPerfil] = useState({ marcado: false, cargando: false });
  const [confirmarEdicion, setConfirmarEdicion] = useState(false);
  const antesDelPerfil = useRef<FichaPasajero | null>(null);
  const enviandoRef = useRef(false);
  const hoy = hoyEnEcuador();

  const cargar = useCallback(() => {
    if (!reservaId) return;
    setCarga({ estado: "cargando" });
    Promise.all([obtenerReserva(reservaId), obtenerBeneficios()])
      .then(([reserva, beneficios]) => {
        const iniciales = reserva.asientos.map((a) => {
          const guardado = reserva.pasajeros.find(
            (p) => p.reserva_asiento_id === a.reserva_asiento_id,
          );
          return guardado
            ? pasajeroAFicha(guardado)
            : fichaVacia(a.reserva_asiento_id);
        });
        if (reserva.contacto && iniciales[0]) {
          iniciales[0] = {
            ...iniciales[0],
            telefono: reserva.contacto.telefono,
            email: reserva.contacto.email,
          };
        }
        setFichas(iniciales);
        setAbiertas(iniciales.map(() => true));
        setErrores(iniciales.map(() => ({})));
        setCarga({ estado: "listo", reserva, beneficios });
      })
      .catch((e) =>
        setCarga({
          estado: "error",
          mensaje: mensajeDeError(e),
          status: e instanceof ErrorCompra ? e.status : 0,
        }),
      );
  }, [reservaId]);

  useEffect(cargar, [cargar]);

  const reserva = carga.estado === "listo" ? carga.reserva : null;
  const beneficios = carga.estado === "listo" ? carga.beneficios : [];
  const fechaSalida = reserva ? diaEnEcuador(reserva.viaje.salida) : hoy;

  const revalidar = (nuevas: FichaPasajero[]) => {
    if (!intentado || !reserva) return;
    const r = validarFichas(
      nuevas,
      reserva.asientos.map((a) => a.reserva_asiento_id),
      hoy,
      beneficios,
    );
    setErrores(r.porFicha);
    setErrorGeneral(r.general);
  };

  const cambiarFicha = (i: number, ficha: FichaPasajero) => {
    const nuevas = fichas.map((f, j) => (j === i ? ficha : f));
    setFichas(nuevas);
    revalidar(nuevas);
  };

  const alternarPerfil = async (marcado: boolean) => {
    if (!marcado) {
      setPerfil({ marcado: false, cargando: false });
      if (antesDelPerfil.current) cambiarFicha(0, antesDelPerfil.current);
      antesDelPerfil.current = null;
      return;
    }
    setPerfil({ marcado: true, cargando: true });
    try {
      const datos = await obtenerPerfil();
      antesDelPerfil.current = fichas[0];
      const ficha = { ...fichas[0] };
      for (const campo of CAMPOS_PERFIL)
        (ficha[campo] as string) = (datos[campo] as string | null) ?? "";
      cambiarFicha(0, ficha);
      setPerfil({ marcado: true, cargando: false });
    } catch {
      setPerfil({ marcado: false, cargando: false });
      setErrorGeneral(
        "No pudimos cargar tus datos de perfil. Escríbelos a mano o vuelve a intentarlo.",
      );
    }
  };

  const continuar = async () => {
    if (!reserva || !reservaId || enviandoRef.current) return;
    setIntentado(true);
    const r = validarFichas(
      fichas,
      reserva.asientos.map((a) => a.reserva_asiento_id),
      hoy,
      beneficios,
    );
    setErrores(r.porFicha);
    setErrorGeneral(r.general);
    const conError = r.porFicha.findIndex((e) => Object.keys(e).length > 0);
    if (conError >= 0 || r.general) {
      setAbiertas((a) =>
        a.map((v, i) => v || Object.keys(r.porFicha[i]).length > 0),
      );
      setEnvio({ estado: "inactivo" });
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    enviandoRef.current = true;
    try {
      setEnvio({ estado: "enviando", paso: "Guardando pasajeros…" });
      await guardarPasajeros(reservaId, {
        contacto: {
          email: fichas[0].email.trim(),
          telefono: fichas[0].telefono.trim(),
        },
        pasajeros: fichas.map(fichaAPasajero),
      });
      setEnvio({ estado: "enviando", paso: "Calculando el total…" });
      await cotizarReserva(reservaId);
      navigate(`/resumen?reserva_id=${encodeURIComponent(reservaId)}`);
    } catch (e) {
      const porFicha = fichas.map(() => ({}) as ErroresFicha);
      if (e instanceof ErrorCompra) {
        for (const ec of e.erroresCampo) {
          const m = /^pasajeros\[(\d+)\]\.(\w+)$/.exec(ec.campo);
          if (!m) continue;
          const campo =
            m[2] === "beneficio_codigo"
              ? "beneficio"
              : m[2] === "respaldo_archivo_id"
                ? "respaldo"
                : m[2];
          (porFicha[Number(m[1])] as Record<string, string>)[campo] =
            ec.mensaje;
        }
      }
      setErrores(porFicha);
      setEnvio({
        estado: "error",
        mensaje: mensajeDeError(e),
        conflicto: e instanceof ErrorCompra && e.status === 409,
      });
    } finally {
      enviandoRef.current = false;
    }
  };

  const busquedaDelViaje = reserva
    ? new URLSearchParams({
        origen: reserva.viaje.origen.ciudad_id,
        destino: reserva.viaje.destino.ciudad_id,
        fecha: fechaSalida,
        cantidad: String(reserva.cantidad),
      }).toString()
    : "";

  const editarViaje = async () => {
    if (!reservaId) return;
    try {
      await cancelarReserva(reservaId);
      navigate(`/viajes?${busquedaDelViaje}`);
    } catch (e) {
      setConfirmarEdicion(false);
      setEnvio({
        estado: "error",
        mensaje: mensajeDeError(e),
        conflicto: false,
      });
    }
  };

  const enlaceAsientos = reserva
    ? `/asientos?${new URLSearchParams({
        viaje_id: reserva.viaje.viaje_id,
        origen_orden: String(reserva.viaje.origen.orden),
        destino_orden: String(reserva.viaje.destino.orden),
        cantidad: String(reserva.cantidad),
        reserva_id: reserva.reserva_id,
      })}`
    : "/";

  if (!reservaId) {
    return (
      <Marco>
        <EstadoVacio
          titulo="No hay una reserva en curso"
          texto="Busca un viaje y elige tus asientos para registrar a los pasajeros."
        />
      </Marco>
    );
  }
  if (carga.estado === "cargando") {
    return (
      <Marco>
        <p role="status" className="p-6 text-center text-slate-600">
          Cargando tu reserva…
        </p>
      </Marco>
    );
  }
  if (carga.estado === "error") {
    return (
      <Marco>
        <EstadoVacio
          titulo={
            carga.status === 409
              ? "Tu reserva ya no está disponible"
              : "No pudimos cargar tu reserva"
          }
          texto={carga.mensaje}
          reintentar={
            carga.status === 0 || carga.status >= 500 ? cargar : undefined
          }
        />
      </Marco>
    );
  }

  const { reserva: r } = carga;
  const enviando = envio.estado === "enviando";

  return (
    <Marco>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Link
            to={enlaceAsientos}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-50 px-3 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Icono nombre="flechaIzquierda" className="h-4 w-4" /> Volver a
            selección de asientos
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Datos de los pasajeros
            </h1>
            <p className="text-slate-600">
              Completa la información de cada pasajero. Los datos deben
              coincidir con el documento de identidad.
            </p>
          </div>
          <p className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <Icono nombre="info" className="h-4 w-4" /> Cada pasajero debe
            llevar su documento original al momento del viaje.
          </p>
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <Icono nombre="reloj" className="h-4 w-4 text-amber-600" />
            <span>
              Tus asientos están retenidos hasta las{" "}
              <strong>{formatearHora(r.expires_at)}</strong>.
            </span>
          </p>

          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void continuar();
            }}
            aria-label="Datos de los pasajeros"
            className="space-y-4"
          >
            {r.asientos.map((asiento, i) => (
              <PassengerForm
                key={asiento.reserva_asiento_id}
                indice={i}
                asiento={asiento}
                pisosBus={r.bus.pisos}
                ficha={fichas[i]}
                errores={errores[i] ?? {}}
                onCambiar={(f) => cambiarFicha(i, f)}
                beneficios={beneficios}
                fechaSalida={fechaSalida}
                hoy={hoy}
                abierta={abiertas[i]}
                onAlternar={() =>
                  setAbiertas((a) => a.map((v, j) => (j === i ? !v : v)))
                }
                usarPerfil={
                  i === 0
                    ? { ...perfil, onCambiar: (m) => void alternarPerfil(m) }
                    : undefined
                }
              />
            ))}

            <div aria-live="polite">
              {errorGeneral && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <Icono nombre="alerta" className="mt-0.5 h-4 w-4" />{" "}
                  {errorGeneral}
                </p>
              )}
              {intentado &&
                !errorGeneral &&
                errores.some((e) => Object.keys(e).length > 0) &&
                envio.estado !== "error" && (
                  <p
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                  >
                    Revisa los campos marcados en las fichas.
                  </p>
                )}
              {envio.estado === "error" && (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  <p className="flex items-start gap-2">
                    <Icono nombre="alerta" className="mt-0.5 h-4 w-4" />{" "}
                    {envio.mensaje}
                  </p>
                  {envio.conflicto ? (
                    <Link
                      to={`/viajes?${busquedaDelViaje}`}
                      className="mt-2 inline-block font-semibold underline"
                    >
                      Buscar el viaje de nuevo
                    </Link>
                  ) : (
                    <button
                      type="submit"
                      className="mt-2 font-semibold underline focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              )}
              {enviando && (
                <p role="status" className="text-sm text-slate-600">
                  {envio.paso}
                </p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Link
                to={enlaceAsientos}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Icono nombre="flechaIzquierda" className="h-4 w-4" /> Volver a
                selección de asientos
              </Link>
              <button
                type="submit"
                disabled={enviando}
                aria-busy={enviando}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-red-600 px-6 text-lg font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:bg-red-400"
              >
                {enviando ? "Procesando…" : "Continuar al resumen"}{" "}
                <Icono nombre="flechaDerecha" />
              </button>
            </div>
          </form>
        </div>

        <aside
          aria-labelledby="resumen-viaje"
          className="space-y-4 lg:sticky lg:top-28 lg:self-start"
        >
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2
                id="resumen-viaje"
                className="text-lg font-bold text-slate-900"
              >
                Resumen de tu viaje
              </h2>
              <button
                type="button"
                onClick={() => setConfirmarEdicion(true)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <Icono nombre="editar" className="h-4 w-4" /> Editar
                <span className="sr-only"> el viaje</span>
              </button>
            </div>
            {confirmarEdicion && (
              <div
                role="alertdialog"
                aria-labelledby="confirmar-edicion"
                className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"
              >
                <p id="confirmar-edicion" className="text-amber-900">
                  Para cambiar el viaje se cancelará esta reserva y se liberarán
                  tus asientos. ¿Quieres continuar?
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void editarViaje()}
                    className="rounded-md bg-amber-600 px-3 py-1.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    Sí, cambiar viaje
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmarEdicion(false)}
                    autoFocus
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    No, seguir aquí
                  </button>
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-3">
              <BusImagen
                src={r.bus.foto_url}
                alt={`Bus unidad ${r.bus.unidad}`}
                className="h-20 w-24 shrink-0 rounded-md"
              />
              <div>
                <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                  {r.bus.grupo} ({r.bus.pisos >= 2 ? "Dos pisos" : "Un piso"})
                </span>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-lg font-bold text-slate-900">
                  {r.viaje.origen.ciudad}{" "}
                  <Icono nombre="flechaDerecha" className="h-4 w-4" />{" "}
                  {r.viaje.destino.ciudad}
                </p>
              </div>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <Dato icono="calendario">{formatearFechaLarga(fechaSalida)}</Dato>
              <Dato icono="reloj">
                {formatearHora(r.viaje.salida)} →{" "}
                {formatearHora(r.viaje.llegada)} (
                {formatearDuracion(
                  minutosEntre(r.viaje.salida, r.viaje.llegada),
                )}
                )
              </Dato>
              <Dato icono="bus">
                Unidad {r.bus.unidad} · Placa {r.bus.placa}
              </Dato>
              <Dato icono="asiento">
                Asientos: {r.asientos.map((a) => a.codigo).join(", ")}
              </Dato>
              <Dato icono="personas">
                {r.cantidad} {r.cantidad === 1 ? "pasajero" : "pasajeros"}
              </Dato>
            </ul>
            <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
              {r.asientos.map((a) => (
                <div
                  key={a.reserva_asiento_id}
                  className="flex justify-between"
                >
                  <dt className="text-slate-600">
                    Tarifa del asiento {a.codigo}
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {formatearCentavos(a.tarifa_centavos)}
                  </dd>
                </div>
              ))}
            </dl>
            {r.cotizacion ? (
              <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-900">
                  Último total cotizado
                </span>
                <span className="text-xl font-bold text-slate-900">
                  {formatearCentavos(r.cotizacion.total_centavos)}
                </span>
              </div>
            ) : (
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                Los descuentos y el total a pagar los calcula el sistema al
                continuar al resumen.
              </p>
            )}
          </section>
          <section className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
            <h2 className="flex items-center gap-2 font-semibold">
              <Icono nombre="info" className="h-4 w-4" /> Información importante
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Verifica que los datos coincidan con tu documento.</li>
              <li>Cada pasajero debe portar su documento original.</li>
              <li>Podrás revisar y confirmar la información antes del pago.</li>
            </ul>
          </section>
        </aside>
      </div>
    </Marco>
  );
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 sm:w-[calc(100%-36px)] sm:px-0">
      <div className="space-y-5 rounded-lg bg-white p-3 sm:p-5">
        <ProgresoCompra pasoActual={4} />
        {children}
      </div>
    </div>
  );
}

function Dato({
  icono,
  children,
}: {
  icono: NombreIcono;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <Icono nombre={icono} className="h-4 w-4 text-slate-500" /> {children}
    </li>
  );
}

function EstadoVacio({
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
