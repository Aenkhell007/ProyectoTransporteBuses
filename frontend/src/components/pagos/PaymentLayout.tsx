import ResumenPago from "./ResumenPago";
import type { DatosPago } from "../../../../shared/pagos";
import type { ReactNode } from "react";
import BookingProgress from "./BookingProgress";

interface PaymentLayoutProps {
  datos?: DatosPago;
  title: string;
  description?: string;
  children: ReactNode;
}

// Las vistas 6, 7 y 7.1 comparten dimensiones y posición del resumen.
// El resumen consume la misma reserva autorizada en los tres pasos.
export default function PaymentLayout({
  title,
  description,
  children,
  datos,
}: PaymentLayoutProps) {
  return (
    <section className="payment-layout [html:has(&)]:[scrollbar-gutter:stable] mx-auto my-4 w-[calc(100%-24px)] max-w-360 rounded-lg bg-white p-4 sm:my-6 sm:w-[calc(100%-36px)] sm:p-6">
      <BookingProgress />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-blue-950">{title}</h1>
        <p
          className="mt-2 min-h-6 text-slate-600"
          aria-hidden={description ? undefined : true}
        >
          {description ?? "\u00a0"}
        </p>
      </header>
      <div className="payment-layout__columns grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="payment-layout__content min-w-0">{children}</div>
        <aside
          className="payment-layout__summary min-w-0 rounded-lg border border-slate-200 p-5"
          aria-labelledby="resumen-viaje"
        >
          <h2
            id="resumen-viaje"
            className="text-lg font-semibold text-blue-950"
          >
            Resumen de tu viaje
          </h2>
          {datos ? (
            <ResumenPago datos={datos} />
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              No hay una reserva cargada.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
