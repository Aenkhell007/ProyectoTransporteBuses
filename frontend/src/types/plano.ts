export type TipoCelda = 'ASIENTO' | 'PASILLO' | 'BLOQUE';

export interface ClaseAsiento {
  id: string;
  codigo: string;
  nombre: string;
}

export interface CeldaPlano {
  piso: number;
  fila: number;
  columna: number;
  tipo: TipoCelda;
  codigo: string | null;
  clase_id: string | null;
}

export type Herramienta =
  | { tipo: 'ASIENTO'; clase_id: string }
  | { tipo: 'PASILLO' }
  | { tipo: 'BLOQUE' }
  | { tipo: 'BORRAR' };