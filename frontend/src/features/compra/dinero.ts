// Los importes llegan del servidor en centavos enteros. Aquí solo se formatean para mostrar;
// el frontend no calcula totales ni descuentos.

/** 4760 -> "$ 47.60"; -840 -> "- $ 8.40"; 0 -> "$ 0.00". */
export function formatearCentavos(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) return "—";
  const signo = centavos < 0 ? "- " : "";
  const absoluto = Math.abs(centavos);
  const enteros = Math.trunc(absoluto / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimales = String(absoluto % 100).padStart(2, "0");
  return `${signo}$ ${enteros}.${decimales}`;
}

/** Puntos base a porcentaje legible: 3000 -> "30 %". */
export function formatearPuntosBase(puntosBase: number): string {
  const porcentaje = puntosBase / 100;
  return `${Number.isInteger(porcentaje) ? porcentaje : porcentaje.toFixed(2)} %`;
}
