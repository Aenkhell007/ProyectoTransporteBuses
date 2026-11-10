export interface OficinaKpis {
  ventasHoy: number;
  asientosVendidos: number;
  comprobantesPendientes: number;
  reservasConfirmadas: number;
}

export interface ComprobantePendiente {
  id: string | number;
  reserva: string;
  cliente: string;
  viaje: string;
  monto: number;
  estado: string;
}

export interface ProximaSalida {
  id: string | number;
  ruta: string;
  hora: string;
  unidad: string;
  asientosVendidos: number;
  capacidad: number;
}

export interface OficinaResumenResponse {
  kpis: OficinaKpis;
  comprobantesPendientes: ComprobantePendiente[];
  proximasSalidas: ProximaSalida[];
}