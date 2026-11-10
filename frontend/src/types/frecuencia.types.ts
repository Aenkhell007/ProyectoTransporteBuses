export type TipoViajeFrecuencia = 'DIRECTO' | 'CON_PARADAS';
export type EstadoFrecuencia = 'ACTIVA' | 'INACTIVA';

export interface ParadaAutorizada {
  id: string;
  orden: number;
  ciudad: string;
  permitirEmbarque: boolean;
  permitirDesembarque: boolean;
}

export interface FrecuenciaANT {
  id: string;
  cooperativaId: string;
  numeroResolucion: string;
  origen: string;
  destino: string;
  horaSalida: string;
  tipo: TipoViajeFrecuencia;
  estado: EstadoFrecuencia;
}
