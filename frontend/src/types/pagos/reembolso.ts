// Contrato local del prototipo. No representa una respuesta de autorización del servidor.
export interface PasajeroReembolsoDemo {
  id: string;
  nombre: string;
  asiento: string;
  pagadoCentavos: number;
}
export interface FormularioReembolso {
  alcance: "compra" | "pasajeros";
  pasajeros: string[];
  motivo: string;
  observacion: string;
}
export interface EstimacionReembolso {
  pagadoCentavos: number;
  devolucionCentavos: number;
  retencionCentavos: number;
  cantidad: number;
}
export type ErroresReembolso = Partial<Record<"pasajeros" | "motivo" | "observacion", string>>;
