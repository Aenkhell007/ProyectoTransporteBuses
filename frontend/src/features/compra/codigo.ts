// Código visible de una compra o reserva en Mis viajes (decisión de #95).
// La base guarda compras.codigo y reservas.id como UUID; la tarjeta muestra los 8 primeros
// caracteres hexadecimales en mayúsculas. La búsqueda de Mis viajes compara con ILIKE
// (backend/src/compra/misViajes.ts), así que encuentra la reserva con ese texto.

/** "3f2a9c1b-7d4e-4a10-9b2c-0e1f2a3b4c5d" -> "3F2A9C1B". */
export function codigoCorto(uuid: string): string {
  return uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
}
