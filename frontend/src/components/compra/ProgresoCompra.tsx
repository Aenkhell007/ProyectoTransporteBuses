import { Icono } from "./Icono";

// Copia mínima de components/pagos/BookingProgress (Ángel) con el paso configurable.
// Se reemplaza cuando BookingProgress acepte la prop pasoActual.
const PASOS = [
  "Búsqueda",
  "Viaje",
  "Asientos",
  "Pasajeros",
  "Resumen",
  "Pago",
  "Confirmación",
];

/** pasoActual va de 1 a 7. */
export function ProgresoCompra({ pasoActual }: { pasoActual: number }) {
  const actual = pasoActual - 1;
  return (
    <nav
      aria-label="Pasos de la compra"
      className="border-b border-slate-100 pb-4"
    >
      <ol className="hidden items-start sm:flex">
        {PASOS.map((paso, i) => (
          <li
            key={paso}
            aria-current={i === actual ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center text-xs text-slate-600"
          >
            {i < PASOS.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute top-3.5 left-1/2 h-0.5 w-full ${i < actual ? "bg-green-600" : "bg-slate-200"}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-sm ${
                i < actual
                  ? "border-green-600 bg-green-600 text-white"
                  : i === actual
                    ? "border-red-600 bg-red-600 font-semibold text-white"
                    : "border-slate-300 bg-white text-slate-600"
              }`}
            >
              {i < actual ? (
                <Icono nombre="check" className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </span>
            <span className={i === actual ? "font-bold text-slate-900" : ""}>
              {paso}
              {i < actual && <span className="sr-only"> (completado)</span>}
            </span>
          </li>
        ))}
      </ol>
      <div className="sm:hidden">
        <p className="text-sm font-semibold text-slate-900">
          Paso {pasoActual} de {PASOS.length} · {PASOS[actual]}
        </p>
        <ol
          aria-hidden="true"
          className="mt-2 flex items-center justify-between"
        >
          {PASOS.map((paso, i) => (
            <li
              key={paso}
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                i < actual
                  ? "border-green-600 bg-green-600 text-white"
                  : i === actual
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-slate-300 bg-white text-slate-600"
              }`}
            >
              {i < actual ? (
                <Icono nombre="check" className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
