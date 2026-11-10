import type { MiViaje } from "../../types/compra/misViajes";
import { formatearCentavos } from "../../features/compra/dinero";

type DatosImporte = Pick<
  MiViaje,
  "estado" | "tipo" | "total_pagado_centavos" | "monto_esperado_centavos"
>;

/**
 * Importe de una tarjeta de Mis viajes. En verificación muestra el monto esperado del
 * intento de pago; no usa monto_reportado_centavos (decisión de #94).
 */
export function ImporteMiViaje({ viaje }: { viaje: DatosImporte }) {
  if (viaje.estado === "PAGO_EN_VERIFICACION") {
    return (
      <div className="rounded-md bg-amber-50 p-3 text-center">
        <p className="text-sm text-slate-700">Importe por verificar</p>
        <p className="text-2xl font-bold text-slate-900">
          {viaje.monto_esperado_centavos != null
            ? formatearCentavos(viaje.monto_esperado_centavos)
            : "Por cotizar"}
        </p>
        <p className="mt-1 text-xs text-slate-700">
          Comprobante recibido. Consulta el seguimiento; todavía no es un pago confirmado.
        </p>
      </div>
    );
  }

  const sinViaje = viaje.estado === "CANCELADA" || viaje.estado === "REEMBOLSADA";
  return (
    <div className={`rounded-md p-3 text-center ${sinViaje ? "bg-slate-100" : "bg-green-50"}`}>
      <p className="text-sm text-slate-700">
        {sinViaje
          ? "Monto pagado"
          : viaje.tipo === "RESERVA"
            ? "Importe esperado"
            : "Total pagado"}
      </p>
      <p className="text-2xl font-bold text-slate-900">
        {viaje.total_pagado_centavos !== null
          ? formatearCentavos(viaje.total_pagado_centavos)
          : viaje.monto_esperado_centavos != null
            ? formatearCentavos(viaje.monto_esperado_centavos)
            : "Por cotizar"}
      </p>
    </div>
  );
}
