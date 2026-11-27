const pasos = ["Búsqueda", "Viaje", "Asientos", "Pasajeros", "Resumen", "Pago", "Confirmación"];

export default function BookingProgress({ etiquetas = pasos, confirmacionCompleta = false, pasoActual }: { etiquetas?: readonly string[]; confirmacionCompleta?: boolean; pasoActual?: number } = {}) {
  const numeroPaso = pasoActual ?? (confirmacionCompleta ? 7 : 6);
  const actual = numeroPaso - 1;
  return (
    <nav aria-label="Pasos de la compra" className="mb-6 border-b border-slate-100 pb-4">
      <ol className="hidden items-start sm:flex">
        {etiquetas.map((paso, indice) => (
          <li key={paso} aria-current={indice === actual ? "step" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center text-xs text-blue-700">
            {indice < etiquetas.length - 1 && <span aria-hidden="true" className={`absolute top-3 left-1/2 h-px w-full ${(confirmacionCompleta || indice < actual) ? "bg-green-300" : "bg-slate-200"}`} />}
            <span aria-hidden="true" className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-sm ${(confirmacionCompleta || indice < actual) ? "border-green-600 bg-green-600 text-white" : indice === actual ? "border-red-600 bg-red-600 text-white" : "border-slate-200 bg-white text-blue-700"}`}>
              {(confirmacionCompleta || indice < actual) ? "✓" : indice + 1}
            </span>
            <span className={indice === actual ? "font-bold text-blue-950" : ""}>{paso}</span>
          </li>
        ))}
      </ol>
      <div className="sm:hidden">
        <p aria-current="step" className="text-center text-sm font-semibold text-blue-950">
          Paso {numeroPaso} de {etiquetas.length} · {etiquetas[actual]}
        </p>
        {pasoActual !== undefined && (
          <ol aria-hidden="true" className="mt-2 flex items-center justify-between">
            {etiquetas.map((paso, indice) => (
              <li key={paso} className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs ${indice < actual ? "border-green-600 bg-green-600 text-white" : indice === actual ? "border-red-600 bg-red-600 font-semibold text-white" : "border-slate-300 bg-white text-slate-600"}`}>
                {indice < actual ? "✓" : indice + 1}
              </li>
            ))}
          </ol>
        )}
      </div>
    </nav>
  );
}
