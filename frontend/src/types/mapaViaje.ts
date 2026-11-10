// Forma de la respuesta de transporte.plano_disponible(viaje, origen, destino), que
// alimenta GET /viajes/:viajeId/mapa-asientos. El estado de cada celda ya viene
// calculado por el servidor para el tramo pedido.
export type EstadoCelda = 'DISPONIBLE' | 'SELECCIONADO' | 'RESERVADO' | 'OCUPADO';
export type TipoCeldaMapa = 'ASIENTO' | 'PASILLO' | 'BLOQUE';

export interface CeldaMapa {
  id: string;
  piso: number;
  fila: number;
  columna: number;
  tipo: TipoCeldaMapa;
  codigo: string | null;
  clase: string | null; // código de clases_asiento: NORMAL o EJECUTIVO
  estado: EstadoCelda;
}

export interface MapaViaje {
  planoId: string;
  celdas: CeldaMapa[];
}