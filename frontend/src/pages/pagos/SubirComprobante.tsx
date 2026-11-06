import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useFlujoPago } from "../../features/pagos/useFlujoPago";
import PaymentLayout from "../../components/pagos/PaymentLayout";
import BankAccountDetails from "../../components/pagos/BankAccountDetails";
import ProofUploader from "../../components/pagos/ProofUploader";
import type { ComprobanteLocal } from "../../features/pagos/validarComprobante";
import EstadoConsultaPago from "../../components/pagos/EstadoConsultaPago";
import { pagosApi, enlacePago } from "../../features/pagos/pagosApi";

export default function SubirComprobante() {
  const navigate = useNavigate();
  const {
    reservaId,
    datos,
    flujo,
    cuentas,
    cargando,
    error: errorConsulta,
    status,
    recargar,
  } = useFlujoPago();
  const cuenta = cuentas.find((c) => c.id === flujo?.cuentaId);
  const [comprobante, setComprobante] = useState<ComprobanteLocal | null>(null);
  const [referencia, setReferencia] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [validando, setValidando] = useState(false),
    [enviando, setEnviando] = useState(false),
    [error, setError] = useState("");
  const bloqueo = useRef(false);
  useEffect(() => {
    setComprobante(null);
    setReferencia("");
    setConfirmado(false);
    setError("");
  }, [reservaId]);
  function cambiarArchivo(archivo: ComprobanteLocal | null) {
    setComprobante(archivo);
    setConfirmado(false);
    setError("");
  }
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bloqueo.current) return;
    if (
      !reservaId ||
      !datos?.intento ||
      !cuenta ||
      !comprobante ||
      validando ||
      !confirmado
    ) {
      setError("Selecciona un comprobante válido y confirma sus datos.");
      return;
    }
    if (
      !datos.politica ||
      comprobante.archivo.size > datos.politica.maxBytes ||
      !datos.politica.mimes.includes(comprobante.mime)
    ) {
      setError("El archivo no cumple la política de la cooperativa.");
      return;
    }
    if (datos.politica.referenciaObligatoria && !referencia.trim()) {
      setError("La referencia es obligatoria para esta cooperativa.");
      return;
    }
    bloqueo.current = true;
    setEnviando(true);
    setError("");
    try {
      await pagosApi.enviar(
        reservaId,
        datos.intento.id,
        comprobante.archivo,
        comprobante.mime,
        referencia.trim(),
      );
      navigate(enlacePago("/pago/seguimiento", reservaId));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo enviar el archivo.",
      );
      void recargar();
    } finally {
      bloqueo.current = false;
      setEnviando(false);
    }
  }
  if (!datos || !reservaId || !flujo)
    return (
      <EstadoConsultaPago
        cargando={cargando}
        error={errorConsulta}
        status={status}
        recargar={recargar}
      />
    );
  if (
    flujo.estado !== "seleccion" ||
    !datos.intento ||
    datos.intento.estado !== "PENDIENTE"
  )
    return (
      <PaymentLayout datos={datos} title="Subir comprobante de pago">
        <p>
          {flujo.estado === "rechazado"
            ? "El comprobante fue rechazado. Inicia un nuevo intento desde el método de pago."
            : "Consulta el estado de tu intento antes de enviar otro comprobante."}
        </p>
        <Link
          to={enlacePago(
            flujo.estado === "rechazado" || !datos.intento
              ? "/pago"
              : "/pago/seguimiento",
            reservaId,
          )}
          className="inline-flex min-h-11 text-blue-800 underline"
        >
          Continuar →
        </Link>
      </PaymentLayout>
    );
  return (
    <PaymentLayout
      datos={datos}
      title="Subir comprobante de pago"
      description="Adjunta tu comprobante de transferencia o depósito para que el oficinista pueda revisar el pago."
    >
      {!cuenta ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="font-semibold text-blue-950">
            Primero selecciona una cuenta bancaria
          </h2>
          <p className="mt-2 text-sm text-blue-900">
            Vuelve al método de pago y elige Transferencia/Depósito y una cuenta
            para adjuntar tu comprobante.
          </p>
          <Link
            to={enlacePago("/pago", reservaId)}
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#ff0018] px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-red-600"
          >
            Ir al método de pago →
          </Link>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <section
            aria-labelledby="cuenta-destino"
            className="rounded-lg border border-indigo-100 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="cuenta-destino"
                  className="text-lg font-semibold text-blue-950"
                >
                  Cuenta receptora seleccionada
                </h2>

              </div>
              <Link
                to={enlacePago("/pago", reservaId)}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 underline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                Cambiar cuenta
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr]">
              <div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-12 items-center justify-center rounded bg-yellow-300 text-xl font-bold text-blue-950">▰</span><strong className="text-blue-950">{cuenta.banco}</strong></div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm"><dt className="text-indigo-400">Banco:</dt><dd>{cuenta.banco}</dd><dt className="text-indigo-400">Tipo de cuenta:</dt><dd>{cuenta.tipo==='CORRIENTE'?'Cuenta corriente':cuenta.tipo==='AHORROS'?'Cuenta de ahorros':cuenta.tipo}</dd><dt className="text-indigo-400">Número de cuenta:</dt><dd className="break-all">{cuenta.numero}</dd><dt className="text-indigo-400">Titular:</dt><dd>{cuenta.titular}</dd></dl>
            </div>
            {cuenta.qrSrc&&<details className="mt-3"><summary className="cursor-pointer text-sm text-blue-700">Ver QR de la cuenta</summary><BankAccountDetails key={cuenta.id} cuenta={cuenta}/></details>}

          </section>

          <section
            aria-labelledby="adjuntar-comprobante"
            className="rounded-lg border border-indigo-100 p-4 sm:p-5"
          >
            <h2
              id="adjuntar-comprobante"
              className="text-lg font-semibold text-blue-950"
            >
              Adjunta tu comprobante
            </h2>
            <p className="mt-2 mb-4 text-sm text-slate-600">
              La imagen o el PDF debe mostrar claramente el banco, la fecha, el
              valor y la referencia de la operación.
            </p>
            {flujo.comprobante && (
              <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Comprobante anterior: {flujo.comprobante.nombre}. Selecciona el
                archivo corregido para volver a enviarlo.
              </p>
            )}
            <ProofUploader
              politica={datos.politica ?? undefined}
              value={comprobante}
              onChange={cambiarArchivo}
              onValidando={setValidando}
            />
            <div className="mt-5">
              <p className="mt-3 font-semibold">
                Importe de la cotización aceptada: ${" "}
                {(datos.reserva.total_centavos / 100).toFixed(2)}
              </p>
            </div>
            <div className="mt-5">
              <label
                htmlFor="referencia-comprobante"
                className="block text-sm font-semibold text-blue-950"
              >
                Número de referencia u operación{" "}
                <span className="font-normal text-slate-500">
                  {datos.politica?.referenciaObligatoria
                    ? "(obligatoria)"
                    : "(opcional)"}
                </span>
              </label>
              <input
                id="referencia-comprobante"
                name="referencia"
                type="text"
                maxLength={120}
                required={datos.politica?.referenciaObligatoria}
                autoComplete="off"
                value={referencia}
                onChange={(event) => {
                  setReferencia(event.target.value);
                }}
                aria-describedby="referencia-ayuda"
                placeholder="Escribe la referencia que aparece en tu comprobante"
                className="mt-2 min-h-11 w-full rounded-md border border-slate-300 p-3 text-sm focus:border-blue-600 focus:outline-2 focus:outline-blue-600"
              />
              <p id="referencia-ayuda" className="mt-2 text-xs text-slate-500">
                Hasta 120 caracteres. Inclúyela si está disponible en tu
                comprobante.
              </p>
            </div>
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-indigo-100 p-4 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(event) => {
                setConfirmado(event.target.checked);
                setError("");
              }}
              className="mt-0.5 h-5 w-5 shrink-0 accent-blue-700"
            />
            Confirmo que el archivo corresponde a este pago y que sus datos son
            legibles.
          </label>

          <p className="rounded-md bg-blue-50 p-3 text-sm">
            El envío no confirma tu pago. El oficinista revisará el comprobante antes de emitir el boleto.
          </p>
          {errorConsulta && (
            <p role="alert" className="text-red-700">
              {errorConsulta}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <nav
            aria-label="Navegación del comprobante"
            className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"
          >
            <Link
              to={enlacePago("/pago", reservaId)}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-indigo-100 px-5 py-3 text-sm font-semibold text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              ← Volver al método de pago
            </Link>
            <button
              type="submit"
              disabled={
                !comprobante ||
                !confirmado ||
                validando ||
                enviando ||
                !!errorConsulta
              }
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#ff0018] px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-red-600 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {validando
                ? "Validando archivo…"
                : enviando
                  ? "Enviando comprobante…"
                  : "Enviar comprobante →"}
            </button>
          </nav>
        </form>
      )}
    </PaymentLayout>
  );
}
