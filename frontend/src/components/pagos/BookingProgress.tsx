import { Icono } from "../compra/Icono";

const pasos = ["Búsqueda", "Viaje", "Asientos", "Pasajeros", "Resumen", "Pago", "Confirmación"];

export default function BookingProgress({
  pasoActual,
  etiquetas = pasos,
  confirmacionCompleta = false,
}: {
  pasoActual?: number;
  etiquetas?: readonly string[];
  confirmacionCompleta?: boolean;
} = {}) {
  const paso = pasoActual ?? (confirmacionCompleta ? etiquetas.length : 6);
  const actual = paso - 1;
  const todoCompleto = confirmacionCompleta && pasoActual === undefined;

  return (
    <nav aria-label="Pasos de la compra" className="mb-4 border-b border-slate-100 pb-4">
      <ol className="hidden items-start sm:flex">
        {etiquetas.map((etiqueta, i) => {
          const completado = todoCompleto || i < actual;
          const activo = !todoCompleto && i === actual;
          return (
            <li
              key={etiqueta}
              aria-current={i === actual ? "step" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center text-xs text-slate-600"
            >
              {i < etiquetas.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-3.5 left-1/2 h-0.5 w-full ${completado ? "bg-green-600" : "bg-slate-200"}`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-sm ${
                  completado
                    ? "border-green-600 bg-green-600 text-white"
                    : activo
                      ? "border-[#ff0018] bg-[#ff0018] font-semibold text-white"
                      : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                {completado ? <Icono nombre="check" className="h-4 w-4" /> : i + 1}
              </span>
              <span className={i === actual ? "font-bold text-[#08035b]" : ""}>
                {etiqueta}
                {completado && <span className="sr-only"> (completado)</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="sm:hidden">
        <p aria-current="step" className="text-center text-sm font-semibold text-[#08035b]">
          Paso {paso} de {etiquetas.length} · {etiquetas[actual]}
        </p>
        <ol aria-hidden="true" className="mt-2 flex items-center">
          {etiquetas.map((etiqueta, i) => {
            const completado = todoCompleto || i < actual;
            const activo = !todoCompleto && i === actual;
            return (
              <li key={etiqueta} className="relative flex flex-1 items-center justify-center">
                {i < etiquetas.length - 1 && (
                  <span
                    className={`absolute top-1/2 left-1/2 h-0.5 w-full -translate-y-1/2 ${completado ? "bg-green-600" : "bg-slate-200"}`}
                  />
                )}
                <span
                  className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-xs ${
                    completado
                      ? "border-green-600 bg-green-600 text-white"
                      : activo
                        ? "border-[#ff0018] bg-[#ff0018] font-semibold text-white"
                        : "border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  {completado ? <Icono nombre="check" className="h-3.5 w-3.5" /> : i + 1}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
