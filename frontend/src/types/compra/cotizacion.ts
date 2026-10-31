// Cotización devuelta por POST /reservas/:id/cotizacion (cotizar()). Importes en centavos.
// La pantalla solo la muestra: todos los totales vienen calculados por el servidor.
import type { ClaseAsientoCodigo } from "./viajes";
import type { BeneficioCodigo } from "./reserva";

export interface LineaCotizacion {
  reserva_asiento_id: string;
  asiento_codigo: string;
  pasajero: string;
  clase: ClaseAsientoCodigo;
  beneficio_codigo: BeneficioCodigo | null;
  beneficio_nombre: string | null;
  /** Descuento del beneficio en puntos base (3000 = 30 %). */
  descuento_bp: number | null;
  base_centavos: number;
  descuento_centavos: number;
  servicio_centavos: number;
  impuesto_bp: number;
  impuesto_servicio_bp: number;
  iva_centavos: number;
  /** base - descuento + servicio, calculado por la API. */
  subtotal_neto_centavos: number;
  /** subtotal_neto + iva, calculado por la API. */
  total_centavos: number;
}

export interface Cotizacion {
  version: number;
  moneda: "USD";
  base_centavos: number;
  descuento_centavos: number;
  servicio_centavos: number;
  subtotal_neto_centavos: number;
  iva_centavos: number;
  total_centavos: number;
  /** Puntos base del IVA aplicado al pasaje, para la etiqueta "IVA (0 %)". */
  impuesto_bp: number;
  expires_at: string;
  lineas: LineaCotizacion[];
}
