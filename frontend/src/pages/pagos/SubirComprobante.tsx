import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation } from "react-router";
import BookingProgress from "../../components/pagos/BookingProgress";
import BankAccountDetails from "../../components/pagos/BankAccountDetails";
import ProofUploader from "../../components/pagos/ProofUploader";
import { cuentasDemo } from "../../mocks/cuentasBancarias";
import type { ComprobanteLocal } from "../../features/pagos/validarComprobante";

export default function SubirComprobante() {
  const location = useLocation();
  const cuenta = cuentasDemo.find((item) => location.state?.metodo === "transferencia" && item.id === location.state?.cuenta);
  const [comprobante, setComprobante] = useState<ComprobanteLocal | null>(null);
  const [referencia, setReferencia] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [validando, setValidando] = useState(false);
  const [simulado, setSimulado] = useState(false);
  const [error, setError] = useState("");
  const estadoAnterior = cuenta ? { metodo: "transferencia", cuenta: cuenta.id } : undefined;

  function cambiarArchivo(archivo: ComprobanteLocal | null) {
    setComprobante(archivo);
    setConfirmado(false);
    setSimulado(false);
    setError("");
  }

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cuenta || !comprobante || validando || !confirmado) {
      setError("Selecciona un comprobante válido y confirma que sus datos son legibles.");
      return;
    }
    // Solo demostración: no se registra un pago ni se simula una respuesta de API.
    setError("");
    setSimulado(true);
  }

  return <section className="mx-auto my-4 w-[calc(100%-24px)] max-w-6xl rounded-lg bg-white p-4 sm:my-6 sm:w-[calc(100%-36px)] sm:p-6">
    <BookingProgress />
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-blue-950">Subir comprobante de pago</h1>
      <p className="mt-2 text-slate-600">Adjunta tu comprobante de transferencia o depósito para que el oficinista pueda revisar el pago.</p>
    </header>

    {!cuenta ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
      <h2 className="font-semibold text-blue-950">Primero selecciona una cuenta bancaria</h2>
      <p className="mt-2 text-sm text-blue-900">Vuelve al método de pago y elige Transferencia/Depósito y una cuenta para adjuntar tu comprobante.</p>
      <Link to="/pago" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#ff0018] px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-red-600">Ir al método de pago →</Link>
    </div> : <form onSubmit={enviar} className="space-y-6">
      <section aria-labelledby="cuenta-destino" className="rounded-lg border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="cuenta-destino" className="text-lg font-semibold text-blue-950">Cuenta bancaria seleccionada</h2>
            <p className="mt-2 text-sm text-blue-900">{cuenta.banco} · {cuenta.tipo} · ••••{cuenta.numero.slice(-4)}</p>
          </div>
          <Link to="/pago" state={estadoAnterior} className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 underline focus-visible:outline-2 focus-visible:outline-blue-600">Cambiar cuenta</Link>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer py-2 text-sm text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">Ver datos bancarios y QR</summary>
          <div className="mt-3"><BankAccountDetails key={cuenta.id} cuenta={cuenta} /></div>
        </details>
        <p className="mt-3 text-xs text-slate-500">Cuenta de demostración. No realices transferencias a estos datos.</p>
      </section>

      <section aria-labelledby="adjuntar-comprobante" className="rounded-lg border border-slate-200 p-4 sm:p-5">
        <h2 id="adjuntar-comprobante" className="text-lg font-semibold text-blue-950">Adjunta tu comprobante</h2>
        <p className="mt-2 mb-4 text-sm text-slate-600">La imagen o el PDF debe mostrar claramente el banco, la fecha, el valor y la referencia de la operación.</p>
        <ProofUploader value={comprobante} onChange={cambiarArchivo} onValidando={setValidando} />
        <div className="mt-5">
          <label htmlFor="referencia-comprobante" className="block text-sm font-semibold text-blue-950">Número de referencia u operación <span className="font-normal text-slate-500">(opcional)</span></label>
          <input id="referencia-comprobante" name="referencia" type="text" maxLength={120} autoComplete="off" value={referencia}
            onChange={(event) => { setReferencia(event.target.value); setSimulado(false); }}
            aria-describedby="referencia-ayuda" placeholder="Escribe la referencia que aparece en tu comprobante"
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 p-3 text-sm focus:border-blue-600 focus:outline-2 focus:outline-blue-600" />
          <p id="referencia-ayuda" className="mt-2 text-xs text-slate-500">Hasta 120 caracteres. Inclúyela si está disponible en tu comprobante.</p>
        </div>
      </section>

      <section aria-labelledby="antes-de-enviar" className="rounded-md bg-blue-50 p-4 text-sm text-blue-950">
        <h2 id="antes-de-enviar" className="font-semibold">Antes de enviar</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 leading-6">
          <li>Comprueba que el archivo esté completo y se pueda leer, sin cortes ni partes borrosas.</li>
          <li>Verifica que los datos correspondan a la cuenta y al pago de tu reserva.</li>
          <li>El envío del comprobante no aprueba el pago ni emite el boleto. Primero debe revisarlo el oficinista.</li>
        </ul>
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-4 text-sm text-slate-700">
        <input type="checkbox" checked={confirmado} onChange={(event) => { setConfirmado(event.target.checked); setSimulado(false); setError(""); }} className="mt-0.5 h-5 w-5 shrink-0 accent-blue-700" />
        Confirmo que el archivo corresponde a este pago y que sus datos son legibles.
      </label>

      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Modo de demostración: puedes validar el archivo y probar este paso. El envío real al backend está pendiente; al salir o recargar tendrás que seleccionarlo de nuevo.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {simulado && <div role="status" className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        <h2 className="font-semibold">Prueba local completada</h2>
        <p className="mt-2 break-words">El archivo {comprobante?.archivo.name} está preparado para la cuenta de {cuenta.banco}.{referencia.trim() ? ` Referencia: ${referencia.trim()}.` : ""} No se ha enviado ni registrado ningún pago. La pantalla de seguimiento se conectará cuando exista el endpoint.</p>
      </div>}

      <nav aria-label="Navegación del comprobante" className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link to="/pago" state={estadoAnterior} className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 px-5 py-3 text-sm font-semibold text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">← Volver al método de pago</Link>
        <button type="submit" disabled={!comprobante || !confirmado || validando || simulado} className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#ff0018] px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-red-600 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
          {validando ? "Validando archivo…" : simulado ? "Prueba completada" : "Simular envío a revisión →"}
        </button>
      </nav>
    </form>}
  </section>;
}
