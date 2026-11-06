import { useState, useRef, useEffect } from "react";
import { useFlujoPago } from "../../features/pagos/useFlujoPago";
import { Link, useNavigate } from "react-router";
import PaymentLayout from "../../components/pagos/PaymentLayout";
import PaymentMethodSelector from "../../components/pagos/PaymentMethodSelector";
import BankAccountSelector from "../../components/pagos/BankAccountSelector";
import BankAccountDetails from "../../components/pagos/BankAccountDetails";
import EstadoConsultaPago from "../../components/pagos/EstadoConsultaPago";
import { pagosApi, enlacePago } from "../../features/pagos/pagosApi";

export default function MetodoPago() {
  const navigate = useNavigate();
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
  const [seleccion, setSeleccion] = useState("");
  const [enviando, setEnviando] = useState(false),
    [errorEnvio, setErrorEnvio] = useState("");
  const clave = useRef(crypto.randomUUID());
  const bloqueo = useRef(false);
  useEffect(() => {
    setSeleccion("");
    setErrorEnvio("");
    clave.current = crypto.randomUUID();
  }, [reservaId]);
  const cuentaSeleccionada =
    datos?.intento?.estado === "PENDIENTE"
      ? (datos.intento.cuentaId ?? "")
      : seleccion || cuentas[0]?.id || "";
  function setCuentaSeleccionada(id: string) {
    setSeleccion(id);
    clave.current = crypto.randomUUID();
  }
  const esTransferencia = metodoSeleccionado === "BANCO";
  const cuentaActual = cuentas.find((c) => c.id === cuentaSeleccionada);
  const habilitado =
    datos?.intento?.estado === "PENDIENTE" ||
    datos?.metodos.some((m) => m.id === "BANCO" && m.habilitado);
  async function continuar() {
    if (!reservaId || !cuentaActual || !habilitado || bloqueo.current) return;
    bloqueo.current = true;
    setEnviando(true);
    setErrorEnvio("");
    try {
      if (datos?.intento?.estado !== "PENDIENTE")
        await pagosApi.crearIntento(reservaId, cuentaActual.id, clave.current);
      navigate(enlacePago("/pago/comprobante", reservaId));
    } catch (e) {
      setErrorEnvio(
        e instanceof Error ? e.message : "No se pudo crear el intento.",
      );
      void recargar();
    } finally {
      bloqueo.current = false;
      setEnviando(false);
    }
  }
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
        {(errorEnvio || error) && (
          <p role="alert" className="text-red-700">
            {errorEnvio || error}
          </p>
        )}
        {!habilitado && (
          <p role="status">
            La cooperativa no tiene transferencia bancaria habilitada.
          </p>
        )}
        {!cuentas.length && <p>No hay cuentas receptoras habilitadas.</p>}
        <section aria-labelledby="titulo-metodos">
          <h2 id="titulo-metodos" className="sr-only">
            Selecciona un método de pago
          </h2>

          <PaymentMethodSelector
            metodos={[...datos.metodos, ...[{id:"OFICINA",nombre:"Pago en oficina",habilitado:false,mensaje:"No habilitado"},{id:"PAYPHONE",nombre:"PayPhone",habilitado:false,mensaje:"Pendiente de conexión"},{id:"TARJETA",nombre:"Tarjeta de crédito/débito",habilitado:false,mensaje:"Próximamente"},{id:"PAYPAL",nombre:"PayPal",habilitado:false,mensaje:"Próximamente"}].filter(m=>!datos.metodos.some(actual=>actual.id===m.id))]}
            seleccionado={metodoSeleccionado}
            onSeleccionar={setMetodoSeleccionado}
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
            {esTransferencia ? "Transferencia/Depósito" : "Pago en oficina"}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            {esTransferencia
              ? "Realiza la transferencia o depósito a una de las cuentas de la cooperativa."
              : "Realiza el pago en una oficina habilitada de la cooperativa."}
          </p>

          <div className="mt-4">
            {esTransferencia ? (
              <>
                <p className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                  Selecciona una cuenta de la cooperativa. El comprobante será
                  revisado por el oficinista; subirlo no confirma el pago.
                </p>
                {datos.intento?.estado === "PENDIENTE" ? (
                  <p>
                    La cuenta está asociada al intento pendiente. Continúa para
                    adjuntar el comprobante.
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
            ) : (
              <div className="rounded-md bg-blue-50 p-4">
                <p className="text-sm text-blue-900">
                  Acércate a una oficina habilitada y solicita al personal las
                  instrucciones para pagar tu reserva. La ubicación, el horario
                  y el plazo de pago se mostrarán cuando estén configurados. La
                  compra se confirmará después de registrar y validar el pago.
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
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
              <path d="m8 12 3 3 5-6" />
            </svg>
            Recomendaciones
          </h2>
          {esTransferencia ? (
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
                apruebe.
              </li>
            </ul>
          ) : (
            <ul className="list-disc space-y-1 pl-5 leading-6">
              <li>
                Confirma la ubicación y el horario de atención antes de acudir.
              </li>
              <li>
                Ten a mano la referencia de tu reserva y tu documento de
                identidad.
              </li>
              <li>
                Solicita y conserva el comprobante que te entregue el personal.
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
          {esTransferencia ? (
            <button
              type="button"
              disabled={!cuentaActual || !habilitado || enviando || !!error}
              onClick={() => continuar()}
              className="inline-flex min-h-11 items-center justify-center gap-3 rounded-md bg-[#ff0018] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-red-600 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
              aria-describedby={!cuentaActual ? "cuenta-requerida" : undefined}
            >
              {enviando ? "Guardando…" : "Continuar y subir comprobante"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <p className="max-w-sm text-sm text-slate-600" role="status">
              El pago en oficina estará disponible cuando se configuren las
              oficinas y sus plazos.
            </p>
          )}
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
