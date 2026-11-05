export interface CuentaPago {
  id: string;
  banco: string;
  tipo: string;
  numero: string;
  titular: string;
  ruc: string;
  qrArchivoId: string | null;
  qrSrc?: string;
}
export interface PasajeroPago {
  nombre: string;
  documento: string;
  categoria: string;
  asiento: string;
  piso: number;
  tarifaCentavos: number;
  descuentoCentavos: number;
  servicioCentavos: number;
  ivaCentavos: number;
  impuestoBp: number;
}
export interface ViajePago {
  salida: string;
  llegada: string;
  origen: string;
  destino: string;
  terminalOrigen: string;
  terminalDestino: string;
  cooperativa: string;
  unidad: string;
  placa: string;
  chasis: string;
  carroceria: string;
  servicio: string;
  pisos: number;
}
export interface DatosPago {
  reserva: {
    id: string;
    estado: "PENDIENTE" | "CONFIRMADA" | "VENCIDA" | "CANCELADA";
    expires_at: string;
    cantidad: number;
    total_centavos: number;
    cotizacion_version: number;
    aceptada_version: number | null;
  };
  viaje: ViajePago;
  cotizacion: {
    base_centavos: number;
    descuento_centavos: number;
    servicio_centavos: number;
    subtotal_neto_centavos: number;
    iva_centavos: number;
    total_centavos: number;
  } | null;
  pasajeros: PasajeroPago[];
  cuentas: CuentaPago[];
  metodos: {
    id: string;
    nombre: string;
    tipo: string;
    habilitado: boolean;
    instrucciones: string | null;
  }[];
  politica: {
    maxBytes: number;
    mimes: string[];
    referenciaObligatoria: boolean;
  } | null;
  intento: {
    id: string;
    estado: "PENDIENTE" | "EN_REVISION" | "APROBADO" | "RECHAZADO" | "ANULADO";
    cuentaId: string | null;
    cuentaSnapshot: {
      numero: string;
      tipo: string;
      titular: string;
      documento_titular: string;
      banco_id: string;
    } | null;
    metodo: string;
    totalCentavos: number;
  } | null;
  comprobante: {
    id: string;
    estado: string;
    motivo: string | null;
    referencia: string | null;
    archivoId: string;
    bytes: number;
    mime: string;
    nombre: string;
    version: number;
  } | null;
  compra: {
    id: string;
    codigo: string;
    estado: "CONFIRMADA" | "CANCELADA" | "REEMBOLSADA";
    totalPagadoCentavos: number;
    viajeSnapshot: Record<string, unknown>;
  } | null;
  documento: {
    id: string;
    qrId: string;
    estado: string;
    archivoId: string | null;
  } | null;
}
