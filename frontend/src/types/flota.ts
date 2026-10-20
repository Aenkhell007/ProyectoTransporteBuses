export interface ClaseAsiento {
  id: string;
  codigo: string;
  nombre: string;
}

export interface Parada {
  orden: number;
  terminal_id: string;
  nombre: string;
}

export interface Ocupacion {
  origen_orden: number;
  destino_orden: number;
  estado: string;
}

export type TipoCelda = 'ASIENTO' | 'PASILLO' | 'BLOQUE';

export interface Celda {
  id: string;
  piso: number;
  fila: number;
  columna: number;
  tipo: TipoCelda;
  codigo: string | null;
  clase_id: string | null;
  activa: boolean;
  ocupaciones: Ocupacion[];
}

export interface MapaAsientos {
  viaje_id: string;
  bus_id: string;
  plano_id: string;
  pisos: number;
  clases: ClaseAsiento[];
  paradas: Parada[];
  celdas: Celda[];
}