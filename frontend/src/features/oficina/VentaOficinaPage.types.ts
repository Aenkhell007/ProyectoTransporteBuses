export interface PasajeroVenta {
  id: number;
  nombre: string;
  cedula: string;
  asiento: string;
  tipo: string;
  tarifa: number;
  descuento: number;
  subtotal: number;
}

export interface VentaOficinaData {
  origen: string;
  destino: string;
  fechaViaje: string;
  salida: string;
  llegada: string;
  unidad: string;
  placa: string;
  tipoBus: string;
  piso: string;
  pasajeros: PasajeroVenta[];
  subtotalBase: number;
  descuentoTotal: number;
  cargoServicio: number;
  iva: number;
  totalPagar: number;
  compradorEmail: string;
  compradorTelefono: string;
}