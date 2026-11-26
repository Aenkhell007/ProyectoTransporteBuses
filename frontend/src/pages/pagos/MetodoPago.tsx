import {IconoBiblioteca} from '../../components/ui/IconoBiblioteca';
import { useState, useRef, useEffect } from "react";
import { useFlujoPago } from "../../features/pagos/useFlujoPago";
import { Link, useNavigate, useSearchParams } from "react-router";
import PaymentLayout from "../../components/pagos/PaymentLayout";
import PaymentMethodSelector from "../../components/pagos/PaymentMethodSelector";
import BankAccountSelector from "../../components/pagos/BankAccountSelector";
import BankAccountDetails from "../../components/pagos/BankAccountDetails";
import EstadoConsultaPago from "../../components/pagos/EstadoConsultaPago";
import { pagosApi, enlacePago } from "../../features/pagos/pagosApi";

const CLAVE_ULTIMO_PAYPHONE = "payphone_ultimo_intento";
const EXPIRACION_FALLBACK_MS = 30 * 60_000;

interface UltimoIntentoPayphone {
  reservaId: string;
  clientTransactionId: string;
  ts: number;
}

function leerUltimoPayphone(): UltimoIntentoPayphone | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE_ULTIMO_PAYPHONE);
    if (!crudo) return null;
    const parsed = JSON.parse(crudo) as Partial<UltimoIntentoPayphone>;
    if (
      typeof parsed?.reservaId !== "string" ||
      typeof parsed?.clientTransactionId !== "string" ||
      !Number.isFinite(parsed?.ts) ||
      Date.now() - Number(parsed.ts) > EXPIRACION_FALLBACK_MS
    ) {
      sessionStorage.removeItem(CLAVE_ULTIMO_PAYPHONE);
      return null;
    }
    return {
      reservaId: parsed.reservaId,
      clientTransactionId: parsed.clientTransactionId,
      ts: Number(parsed.ts),
    };
  } catch {
    return null;
  }
}

function guardarUltimoPayphone(reservaId: string, clientTransactionId: string) {
  try {
    sessionStorage.setItem(
      CLAVE_ULTIMO_PAYPHONE,
      JSON.stringify({ reservaId, clientTransactionId, ts: Date.now() }),
    );
  } catch {
    // Ignorar errores de almacenamiento privado.
  }
}

function limpiarUltimoPayphone() {
  try {
    sessionStorage.removeItem(CLAVE_ULTIMO_PAYPHONE);
  } catch {
    // Ignorar errores de almacenamiento privado.
  }
}

export default function MetodoPago() {
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const {
    reservaId,
    datos,
    flujo,
    cuentas,
    cargando,
    error,
    status,
    recargar,
  } = useFlujoPago();
  const [metodoSeleccionado, setMetodoSeleccionado] = useState("BANCO");
  const [modoPayphone, setModoPayphone] = useState<"card" | "payphone">("card");
  const [seleccion, setSeleccion] = useState("");
  const [enviando, setEnviando] = useState(false),
    [errorEnvio, setErrorEnvio] = useState("");
  const [pagoCancelado, setPagoCancelado] = useState(false);
  const clave = useRef(crypto.randomUUID());
  const bloqueo = useRef(false);
  const seleccionManual = useRef(false);
  const prevReservaId = useRef(reservaId);
  const anulacionEjecutada = useRef<string | null>(null);
  const fallbackCancelacion = !reservaId ? leerUltimoPayphone() : null;

  useEffect(() => {
    setSeleccion("");
    setErrorEnvio("");
    clave.current = crypto.randomUUID();
    seleccionManual.current = false;
    if (prevReservaId.current !== reservaId) {
      prevReservaId.current = reservaId;
      setPagoCancelado(false);
      anulacionEjecutada.current = null;
    }
  }, [reservaId]);

  useEffect(() => {
    if (reservaId || !fallbackCancelacion) return;
    navigate(
      `/pago?reserva_id=${encodeURIComponent(fallbackCancelacion.reservaId)}&payphone=cancelado&clientTransactionId=${encodeURIComponent(fallbackCancelacion.clientTransactionId)}`,
      { replace: true },
    );
  }, [reservaId, fallbackCancelacion, navigate]);

  useEffect(() => {
    if (!reservaId || params.get("payphone") !== "cancelado") return;
    setPagoCancelado(true);
    limpiarUltimoPayphone();
    const txCancelada = (params.get("clientTransactionId") ?? "").trim();
    if (txCancelada && anulacionEjecutada.current !== txCancelada) {
      anulacionEjecutada.current = txCancelada;
      void pagosApi
        .confirmarPayphone(0, txCancelada)
        .catch(() => {})
        .finally(() => void recargar());
    }
    setSearchParams({ reserva_id: reservaId }, { replace: true });
  }, [reservaId, params, setSearchParams, recargar]);

  const intentoBancoPendiente =
    datos?.intento?.estado === "PENDIENTE" &&
    (datos.intento.metodoCodigo === "BANCO" ||
      (!datos.intento.metodoCodigo && datos.intento.cuentaId !== null));

  const bancoHabilitado = Boolean(
    intentoBancoPendiente ||
      datos?.metodos.some((m) => m.id === "BANCO" && m.habilitado),
  );
  const payphoneHabilitado = Boolean(
    datos?.metodos.some((m) => m.id === "PAYPHONE" && m.habilitado),
  );

  useEffect(() => {
    if (!datos || seleccionManual.current) return;
    if (
      datos.intento?.estado === "PENDIENTE" &&
      datos.intento.metodoCodigo === "PAYPHONE" &&
      payphoneHabilitado
    ) {
      setMetodoSeleccionado("PAYPHONE");
      return;
    }
    if (intentoBancoPendiente || bancoHabilitado) {
      setMetodoSeleccionado("BANCO");
      return;
    }
    if (payphoneHabilitado) {
      setMetodoSeleccionado("PAYPHONE");
    }
  }, [datos, bancoHabilitado, payphoneHabilitado, intentoBancoPendiente]);

  function seleccionarMetodo(id: string) {
    seleccionManual.current = true;
    setErrorEnvio("");
    setMetodoSeleccionado(id);
  }

  const puedeCambiarCuenta = !datos?.comprobante;
  const cuentaSeleccionada =
    !puedeCambiarCuenta && intentoBancoPendiente
      ? (datos?.intento?.cuentaId ?? "")
      : seleccion || datos?.intento?.cuentaId || cuentas[0]?.id || "";
  function setCuentaSeleccionada(id: string) {
    setSeleccion(id);
    clave.current = crypto.randomUUID();
  }
  const esTransferencia = metodoSeleccionado === "BANCO";
  const esPayphone = metodoSeleccionado === "PAYPHONE";
  const cuentaActual = cuentas.find((c) => c.id === cuentaSeleccionada);
  const puedeContinuar =
    (esPayphone && payphoneHabilitado) ||
    (esTransferencia && bancoHabilitado && Boolean(cuentaActual));

  async function continuar() {
    if (!reservaId || !puedeContinuar || bloqueo.current) return;
    bloqueo.current = true;
    setEnviando(true);
    setErrorEnvio("");
    setPagoCancelado(false);
    try {
      if (esPayphone) {
        const resp = await pagosApi.prepararPayphone(reservaId, modoPayphone);
        if (!resp.urlPago) {
          throw new Error("PayPhone no devolvió el enlace de pago.");
        }
        guardarUltimoPayphone(reservaId, resp.clientTransactionId);
        window.location.assign(resp.urlPago);
        return;
      }
      if (!cuentaActual) return;
      if (!intentoBancoPendiente || cuentaActual.id !== datos?.intento?.cuentaId) {
        await pagosApi.crearIntento(reservaId, cuentaActual.id, clave.current);
      }
      limpiarUltimoPayphone();
      navigate(enlacePago("/pago/comprobante", reservaId));
    } catch (e) {
      setErrorEnvio(
        e instanceof Error ? e.message : "No se pudo iniciar el pago.",
      );
      void recargar();
      bloqueo.current = false;
      setEnviando(false);
    } finally {
      if (!esPayphone) {
        bloqueo.current = false;
        setEnviando(false);
      }
    }
  }
  if (!reservaId && fallbackCancelacion)
    return (
      <p role="status" className="p-6 text-center text-blue-950">
        Regresando a tu método de pago…
      </p>
    );
  if (!datos || !reservaId || !flujo)
    return <EstadoConsultaPago {...{ cargando, error, status, recargar }} />;
  if (flujo.estado !== "seleccion" && flujo.estado !== "rechazado")
    return (
      <PaymentLayout datos={datos} title="Método de pago">
        <p>Consulta el estado actual de esta reserva.</p>
        <Link
          className="inline-flex min-h-11 text-blue-800 underline"
          to={enlacePago("/pago/seguimiento", reservaId)}
        >
          Continuar al seguimiento →
        </Link>
      </PaymentLayout>
    );
  if (
    !datos.cotizacion ||
    datos.reserva.aceptada_version !== datos.reserva.cotizacion_version ||
    datos.pasajeros.length !== datos.reserva.cantidad
  )
    return (
      <PaymentLayout datos={datos} title="Método de pago">
        <p>Primero completa los pasajeros y acepta la cotización vigente.</p>
        <Link
          to={enlacePago("/resumen", reservaId)}
          className="inline-flex min-h-11 text-blue-800 underline"
        >
          Volver al resumen
        </Link>
      </PaymentLayout>
    );
  return (
    <PaymentLayout
      datos={datos}
      title="Método de pago"
      description="Selecciona la forma de pago que prefieras para completar tu compra."
    >
      <div className="space-y-6">
        {pagoCancelado && (
          <div
            role="alert"
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <div className="flex items-start gap-2.5">
              <IconoBiblioteca
                nombre="alerta"
                className="mt-0.5 size-5 shrink-0 text-amber-700"
              />
              <div>
                <p className="font-bold">Pago cancelado en PayPhone</p>
                <p className="mt-0.5 text-amber-900">
                  Cancelaste el pago en PayPhone. Tu reserva sigue activa:
                  puedes intentarlo nuevamente o seleccionar otro método de
                  pago.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPagoCancelado(false)}
              className="rounded border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-100"
            >
              Entendido
            </button>
          </div>
        )}
        {(errorEnvio || error) && (
          <p role="alert" className="text-red-700">
            {errorEnvio || error}
          </p>
        )}
        {!bancoHabilitado && !payphoneHabilitado && (
          <p role="status">
            La cooperativa no tiene métodos de pago habilitados en este momento.
          </p>
        )}
        {esTransferencia && !bancoHabilitado && payphoneHabilitado && (
          <p role="status">
            La cooperativa no tiene transferencia bancaria habilitada. Selecciona PayPhone para pagar en línea.
          </p>
        )}
        {esTransferencia && bancoHabilitado && !cuentas.length && (
          <p>No hay cuentas receptoras habilitadas.</p>
        )}
        <section aria-labelledby="titulo-metodos">
          <h2 id="titulo-metodos" className="sr-only">
            Selecciona un método de pago
          </h2>

          <PaymentMethodSelector
            metodos={[
              { id: "PAYPAL", nombre: "PayPal", fallbackMensaje: "Próximamente" },
              { id: "PAYPHONE", nombre: "PayPhone", fallbackMensaje: "Pendiente de conexión" },
              { id: "TARJETA", nombre: "Tarjeta de crédito/débito", fallbackMensaje: "Próximamente" },
              { id: "BANCO", nombre: "Transferencia/Depósito", fallbackMensaje: "No habilitado" },
            ].map((baseMetodo) => {
              const servidor = datos.metodos.find((m) => m.id === baseMetodo.id);
              const metodoHabilitado =
                baseMetodo.id === "BANCO"
                  ? bancoHabilitado
                  : (servidor?.habilitado ?? false);
              return {
                id: baseMetodo.id,
                nombre: servidor?.nombre ?? baseMetodo.nombre,
                habilitado: metodoHabilitado,
                mensaje: metodoHabilitado ? undefined : baseMetodo.fallbackMensaje,
              };
            })}
            seleccionado={metodoSeleccionado}
            onSeleccionar={seleccionarMetodo}
          />
        </section>

        <section
          className="min-w-0 rounded-lg border border-indigo-100 p-4 sm:p-5"
          aria-labelledby="titulo-informacion-pago"
        >
          <h2
            id="titulo-informacion-pago"
            className="text-lg font-semibold text-blue-950"
          >
            {esTransferencia
              ? "Transferencia/Depósito"
              : esPayphone
                ? "Pago en línea con PayPhone"
                : "Pago en línea"}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            {esTransferencia
              ? "Realiza la transferencia o depósito a una de las cuentas de la cooperativa."
              : esPayphone
                ? "Paga de inmediato con tu tarjeta o tu app PayPhone con confirmación automática."
                : "Este método de pago en línea estará disponible próximamente."}
          </p>

          <div className="mt-4">
            {esTransferencia ? (
              <>
                <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                  Selecciona una cuenta de la cooperativa. El comprobante será
                  revisado por el oficinista; subirlo no confirma el pago.
                </p>
                {!puedeCambiarCuenta ? (
                  <p>
                    La cuenta está asociada al comprobante enviado. Continúa para
                    consultar su seguimiento.
                  </p>
                ) : (
                  <BankAccountSelector
                    cuentas={cuentas}
                    seleccionado={cuentaSeleccionada}
                    onSeleccionar={setCuentaSeleccionada}
                  />
                )}

                <div className="mt-4">
                  <BankAccountDetails
                    key={cuentaActual?.id ?? "sin-cuenta"}
                    cuenta={cuentaActual}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Verifica el titular y la cuenta receptora antes de realizar la
                  transferencia.
                </p>
              </>
            ) : esPayphone ? (
              <div className="space-y-4">
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Elige cómo deseas pagar en PayPhone
                  </legend>
                  {(
                    [
                      {
                        valor: "card" as const,
                        titulo: "Tarjeta de crédito o débito",
                        detalle:
                          "Paga con Visa, Mastercard u otras tarjetas en la pasarela segura de PayPhone.",
                      },
                      {
                        valor: "payphone" as const,
                        titulo: "App PayPhone",
                        detalle:
                          "Autoriza el cobro directo con tu usuario y saldo/tarjetas de PayPhone.",
                      },
                    ] as const
                  ).map((op) => {
                    const activo = modoPayphone === op.valor;
                    return (
                      <label
                        key={op.valor}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                          activo
                            ? "border-blue-700 bg-blue-50/70 text-blue-950"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="modo-payphone"
                          value={op.valor}
                          checked={activo}
                          onChange={() => setModoPayphone(op.valor)}
                          className="mt-1 size-4 accent-blue-700"
                        />
                        <span>
                          <strong className="block">{op.titulo}</strong>
                          <small className="mt-0.5 block text-xs text-slate-600">
                            {op.detalle}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                  Al pulsar <strong>Pagar con PayPhone</strong> serás redirigido de
                  forma segura a PayPhone. Cuando regreses, tu compra se confirmará
                  automáticamente y se enviará el boleto PDF a tu correo registrado.
                </div>
                {intentoBancoPendiente && (
                  <p className="text-xs text-amber-800">
                    Tienes un intento de transferencia pendiente sin comprobante; si
                    continúas con PayPhone se reemplazará automáticamente.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-md bg-blue-50 p-4">
                <p className="text-sm text-blue-900">
                  Selecciona PayPhone o Transferencia/Depósito para completar tu compra.
                </p>
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="recomendaciones-pago"
          className="rounded-md bg-blue-50 p-4 text-sm text-blue-950"
        >
          <h2
            id="recomendaciones-pago"
            className="mb-2 flex items-center gap-2 font-semibold"
          >
            <IconoBiblioteca nombre="escudo" className="h-[22px] w-[22px]"/>
            Recomendaciones
          </h2>
          {esPayphone ? (
            <ul className="list-disc space-y-1 pl-5 leading-6">
              <li>
                No cierres la ventana del navegador hasta regresar automáticamente a
                la confirmación de tu compra.
              </li>
              <li>
                La confirmación del pago y la emisión del boleto PDF con QR son
                inmediatas al validar el cobro con PayPhone.
              </li>
              <li>
                Tu boleto PDF se enviará automáticamente al correo electrónico de
                tu cuenta.
              </li>
            </ul>
          ) : (
            <ul className="list-disc space-y-1 pl-5 leading-6">
              <li>
                Verifica el banco, el número de cuenta y el titular antes de
                pagar.
              </li>
              <li>
                Realiza la transferencia desde tu cuenta bancaria o el depósito
                en ventanilla.
              </li>
              <li>Guarda un comprobante legible en JPG, PNG o PDF.</li>
              <li>
                El pago permanecerá en revisión hasta que el oficinista lo
                apruebe y se envíe tu boleto al correo registrado.
              </li>
            </ul>
          )}
        </section>

        <nav
          aria-label="Navegación del pago"
          className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <Link
            to={enlacePago("/resumen", reservaId)}
            className="inline-flex min-h-11 items-center justify-center gap-3 rounded-md border border-indigo-100 px-5 py-3 text-center text-sm font-semibold text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <span aria-hidden="true">←</span> Volver al resumen
          </Link>
          <button
            type="button"
            disabled={!puedeContinuar || enviando || !!error}
            onClick={() => void continuar()}
            className="inline-flex min-h-11 items-center justify-center gap-3 rounded-md bg-[#ff0018] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-red-600 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            aria-describedby={esTransferencia && !cuentaActual ? "cuenta-requerida" : undefined}
          >
            {enviando
              ? esPayphone
                ? "Conectando con PayPhone…"
                : "Guardando…"
              : esPayphone
                ? "Pagar con PayPhone"
                : "Continuar y subir comprobante"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </nav>
        {esTransferencia && !cuentaActual && (
          <p
            id="cuenta-requerida"
            role="status"
            className="text-sm text-red-700"
          >
            Selecciona una cuenta bancaria para continuar.
          </p>
        )}
      </div>
    </PaymentLayout>
  );
}
