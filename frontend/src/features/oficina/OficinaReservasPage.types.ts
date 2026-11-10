export interface ReservasKpis {
  pendientePago: number;
  enRevision: number;
  confirmada: number;
  vencida: number;
}

export interface ReservaOficinaItem {
  id: string | number;
  codigo: string;
  cliente: string;
  ruta: string;
  fechaViaje: string;
  asientos: string;
  monto: number;
  estadoReserva: 'Confirmada' | 'Pendiente' | 'Vencida';
  estadoPago: 'Pagado' | 'En revisión' | 'Pendiente' | 'Sin pago';
  accionTexto: string;
}

export interface OficinaReservasResponse {
  kpis: ReservasKpis;
  reservas: ReservaOficinaItem[];
}