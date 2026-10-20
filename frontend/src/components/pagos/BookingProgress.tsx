const pasos = ["Búsqueda", "Viaje", "Asientos", "Pasajeros", "Resumen", "Pago", "Confirmación"];

export default function BookingProgress() {
  return (
    <nav aria-label="Pasos de la compra" className="mb-6 border-b border-slate-100 pb-4">
      <ol className="hidden items-start sm:flex">
        {pasos.map((paso, indice) => (
          <li key={paso} aria-current={indice === 5 ? "step" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center text-xs text-blue-700">
            {indice < pasos.length - 1 && <span aria-hidden="true" className={`absolute top-3 left-1/2 h-px w-full ${indice < 5 ? "bg-green-300" : "bg-slate-200"}`} />}
            <span aria-hidden="true" className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-sm ${indice < 5 ? "border-green-600 bg-green-600 text-white" : indice === 5 ? "border-red-600 bg-red-600 text-white" : "border-slate-200 bg-white text-blue-700"}`}>
              {indice < 5 ? "✓" : indice + 1}
            </span>
            <span className={indice === 5 ? "font-bold text-blue-950" : ""}>{paso}</span>
          </li>
        ))}
      </ol>
      <p aria-current="step" className="text-center text-sm font-semibold text-blue-950 sm:hidden">Paso 6 de 7 · Pago</p>
    </nav>
  );
}
