import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import BookingProgress from "../../components/pagos/BookingProgress";
import PaymentMethodSelector from "../../components/pagos/PaymentMethodSelector";
import type { PaymentMethodOption } from "../../components/pagos/PaymentMethodSelector";
import BankAccountSelector from "../../components/pagos/BankAccountSelector";
import { cuentasDemo } from "../../mocks/cuentasBancarias";
import BankAccountDetails from "../../components/pagos/BankAccountDetails";

// Datos temporales. Después vendrán del backend.
const metodosDemo: PaymentMethodOption[] = [
  {
    id: "transferencia",
    nombre: "Transferencia/Depósito",
    habilitado: true,
  },
  {
    id: "oficina",
    nombre: "Pago en oficina",
    habilitado: true,
  },
  {
    id: "payphone",
    nombre: "PayPhone",
    habilitado: false,
    mensaje: "Pendiente de conexión",
  },
  {
    id: "tarjeta",
    nombre: "Tarjeta de crédito/débito",
    habilitado: false,
    mensaje: "Próximamente",
  },
  {
    id: "paypal",
    nombre: "PayPal",
    habilitado: false,
    mensaje: "Próximamente",
  },
];


export default function MetodoPago() {
  const location = useLocation();
  const navigate = useNavigate();
  const anterior = location.state;
  const [metodoSeleccionado, setMetodoSeleccionado] = useState(
    anterior?.metodo === "oficina" ? "oficina" : "transferencia",
  );

  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(
    cuentasDemo.some((cuenta) => cuenta.id === anterior?.cuenta)
      ? String(anterior.cuenta)
      : (cuentasDemo[0]?.id ?? ""),
  );

  const esTransferencia = metodoSeleccionado === "transferencia";

  const cuentaActual = cuentasDemo.find(
    (cuenta) => cuenta.id === cuentaSeleccionada,
  );

  function continuar() {
    if (!esTransferencia || !cuentaActual) return;
    navigate("/pago/comprobante", {
      state: { metodo: metodoSeleccionado, cuenta: cuentaSeleccionada },
    });
  }

  return (
    <section className="mx-auto my-4 w-[calc(100%-24px)] max-w-360 rounded-lg bg-white p-4 sm:my-6 sm:w-[calc(100%-36px)] sm:p-6">
      <BookingProgress />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-blue-950">Método de pago</h1>

        <p className="mt-2 text-slate-600">
          Selecciona la forma de pago que prefieras para completar tu compra.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section aria-labelledby="titulo-metodos">
            <h2 id="titulo-metodos" className="sr-only">
              Selecciona un método de pago
            </h2>

            <PaymentMethodSelector
              metodos={metodosDemo}
              seleccionado={metodoSeleccionado}
              onSeleccionar={setMetodoSeleccionado}
            />
          </section>

          <section
            className="min-w-0 rounded-lg border border-slate-200 p-4 sm:p-5"
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
                  <BankAccountSelector
                    cuentas={cuentasDemo}
                    seleccionado={cuentaSeleccionada}
                    onSeleccionar={setCuentaSeleccionada}
                  />

                  <div className="mt-4">
                    <BankAccountDetails
                      key={cuentaActual?.id ?? "sin-cuenta"}
                      cuenta={cuentaActual}
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Datos de demostración. No realices pagos a estas cuentas.
                  </p>
                </>
              ) : (
                <div className="rounded-md bg-blue-50 p-4">
                  <p className="text-sm text-blue-900">
                    Acércate a una oficina habilitada y solicita al personal las
                    instrucciones para pagar tu reserva. La ubicación, el horario
                    y el plazo de pago se mostrarán cuando estén configurados.
                    La compra se confirmará después de registrar y validar el pago.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="recomendaciones-pago" className="rounded-md bg-blue-50 p-4 text-sm text-blue-950">
            <h2 id="recomendaciones-pago" className="mb-2 flex items-center gap-2 font-semibold">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
                <path d="m8 12 3 3 5-6" />
              </svg>
              Recomendaciones
            </h2>
            {esTransferencia ? (
              <ul className="list-disc space-y-1 pl-5 leading-6">
                <li>Verifica el banco, el número de cuenta y el titular antes de pagar.</li>
                <li>Realiza la transferencia desde tu cuenta bancaria o el depósito en ventanilla.</li>
                <li>Guarda un comprobante legible en JPG, PNG o PDF.</li>
                <li>El pago permanecerá en revisión hasta que el oficinista lo apruebe.</li>
              </ul>
            ) : (
              <ul className="list-disc space-y-1 pl-5 leading-6">
                <li>Confirma la ubicación y el horario de atención antes de acudir.</li>
                <li>Ten a mano la referencia de tu reserva y tu documento de identidad.</li>
                <li>Solicita y conserva el comprobante que te entregue el personal.</li>
              </ul>
            )}
          </section>

          <nav aria-label="Navegación del pago" className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/resumen" state={{ metodo: metodoSeleccionado, cuenta: cuentaSeleccionada }} className="inline-flex min-h-11 items-center justify-center gap-3 rounded-md border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
              <span aria-hidden="true">←</span> Volver al resumen
            </Link>
            {esTransferencia ? (
              <button type="button" disabled={!cuentaActual} onClick={() => continuar()} className="inline-flex min-h-11 items-center justify-center gap-3 rounded-md bg-[#ff0018] px-5 py-3 text-center text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-red-600 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300" aria-describedby={!cuentaActual ? "cuenta-requerida" : undefined}>
                Continuar y subir comprobante <span aria-hidden="true">→</span>
              </button>
            ) : (
              <p className="max-w-sm text-sm text-slate-600" role="status">El pago en oficina estará disponible cuando se configuren las oficinas y sus plazos.</p>
            )}
          </nav>
          {esTransferencia && !cuentaActual && <p id="cuenta-requerida" role="status" className="text-sm text-red-700">Selecciona una cuenta bancaria para continuar.</p>}
        </div>

        <aside
          className="rounded-lg border border-slate-200 p-5"
          aria-labelledby="resumen-viaje"
        >
          <h2
            id="resumen-viaje"
            className="text-lg font-semibold text-blue-950"
          >
            Resumen de tu viaje
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Aquí irá el resumen de la compra.
          </p>
        </aside>
      </div>
    </section>
  );
}
