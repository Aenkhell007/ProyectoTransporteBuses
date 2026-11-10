export interface DetallePasajero {
  id: number;
  nombre: string;
  asiento: string;
  tipo: string;
  tarifa: number;
}

export interface RevisionComprobanteData {
  reservaId: string;
  cliente: string;
  estado: string;
  comprobanteArchivo: string;
  comprobanteTamano: string;
  bancoEmisor: string;
  montoReportado: number;
  fechaHora: string;
  referencia: string;
  codigoTransaccion: string;
  origen: string;
  destino: string;
  fechaViaje: string;
  salida: string;
  llegada: string;
  unidad: string;
  placa: string;
  piso: string;
  asientosInfo: string;
  pasajeros: DetallePasajero[];
  subtotalBase: number;
  descuento: number;
  cargoServicio: number;
  totalEsperado: number;
}