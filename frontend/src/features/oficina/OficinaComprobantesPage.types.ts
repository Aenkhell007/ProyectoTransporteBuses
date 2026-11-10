export interface ComprobantesKpis {
  total: number;
  enRevision: number;
  aprobados: number;
  rechazados: number;
}

export interface ComprobanteItem {
  id: string | number;
  reserva: string;
  cliente: string;
  banco: string;
  recibido: string;
  monto: number;
  estado: 'Aprobado' | 'Aprobados' | 'En revisión' | 'Rechazado' | 'Rechazados';
  reembolso: string;
  accionTexto: 'Ver detalle' | 'Revisar' | 'Ver motivo';
}

export interface OficinaComprobantesResponse {
  kpis: ComprobantesKpis;
  comprobantes: ComprobanteItem[];
}