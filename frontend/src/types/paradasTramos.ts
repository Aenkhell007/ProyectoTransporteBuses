export type ClaseAsientoTramo = 'NORMAL' | 'VIP';

export interface ParadaOrdenada {
  id: string;
  frecuenciaId: string;
  orden: number;
  ciudad: string;
  tiempoEstimadoLlegada?: string;
  habilitadaEmbarque: boolean;
  habilitadaDesembarque: boolean;
}

export interface TarifaTramo {
  id: string;
  frecuenciaId: string;
  paradaOrigenId: string;
  ciudadOrigen: string;
  ordenOrigen: number;
  paradaDestinoId: string;
  ciudadDestino: string;
  ordenDestino: number;
  clase: ClaseAsientoTramo;
  precioBase: number;
  vigente: boolean;
}
