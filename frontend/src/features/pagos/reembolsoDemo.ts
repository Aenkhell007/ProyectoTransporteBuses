import type { EstimacionReembolso, ErroresReembolso, FormularioReembolso, PasajeroReembolsoDemo } from "../../types/pagos/reembolso";

// Cálculo exclusivo de la demostración: el backend fijará elegibilidad e importes reales.
export function estimarReembolsoDemo(pasajeros: readonly PasajeroReembolsoDemo[], formulario: FormularioReembolso, porcentaje: number): EstimacionReembolso {
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) throw new RangeError("Porcentaje fuera del rango de demostración.");
  const ids = new Set(formulario.pasajeros);
  const seleccionados = pasajeros.filter(p => formulario.alcance === "compra" || ids.has(p.id));
  const pagadoCentavos = seleccionados.reduce((total, p) => total + p.pagadoCentavos, 0);
  const devolucionCentavos = Math.floor(pagadoCentavos * porcentaje / 100);
  return { pagadoCentavos, devolucionCentavos, retencionCentavos: pagadoCentavos - devolucionCentavos, cantidad: seleccionados.length };
}
export function validarReembolsoDemo(formulario: FormularioReembolso, pasajeros: readonly PasajeroReembolsoDemo[], motivos: readonly string[]): ErroresReembolso {
  const errores: ErroresReembolso = {};
  if (formulario.alcance === "pasajeros" && (!formulario.pasajeros.length || formulario.pasajeros.some(id => !pasajeros.some(p => p.id === id)))) errores.pasajeros = "Selecciona al menos un pasajero de esta reserva.";
  if (!motivos.includes(formulario.motivo)) errores.motivo = "Selecciona un motivo de la solicitud.";
  if (formulario.observacion.length > 500) errores.observacion = "La observación admite hasta 500 caracteres.";
  return errores;
}
