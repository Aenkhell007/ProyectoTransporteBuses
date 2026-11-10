import { VentaOficinaData } from './VentaOficinaPage.types';

const MOCK_VENTA_LOCAL: VentaOficinaData = {
  origen: 'Quito',
  destino: 'Guayaquil',
  fechaViaje: 'Sáb 10 oct 2026',
  salida: '06:00',
  llegada: '14:30',
  unidad: '018',
  placa: 'PAB-1234',
  tipoBus: 'Ejecutivo Dos pisos',
  piso: 'Piso superior (2° piso)',
  pasajeros: [
    {
      id: 1,
      nombre: 'Ángel Matías Galarza',
      cedula: '1723456789',
      asiento: 'U8',
      tipo: 'Adulto',
      tarifa: 28.00,
      descuento: 0.00,
      subtotal: 28.00,
    },
    {
      id: 2,
      nombre: 'María Fernanda Galarza',
      cedula: '1729876543',
      asiento: 'U9',
      tipo: 'Niño 8 años',
      tarifa: 28.00,
      descuento: 8.40,
      subtotal: 19.60,
    },
  ],
  subtotalBase: 56.00,
  descuentoTotal: 8.40,
  cargoServicio: 0.00,
  iva: 0.00,
  totalPagar: 47.60,
  compradorEmail: 'angel.galarza@example.com',
  compradorTelefono: '+593 991 234 567',
};

export const fetchVentaOficinaData = async (): Promise<VentaOficinaData> => {
  try {
    const response = await fetch('/api/oficina/venta-actual');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { message?: string }).message || `Error del servidor: ${response.status}`);
    }
    return (await response.json()) as VentaOficinaData;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      console.warn(`[VistaPreviaPanel DEV] Usando maqueta local para Venta en oficina. Detalle: ${mensaje}`);
      return MOCK_VENTA_LOCAL;
    }
    throw error;
  }
};

export const procesarCobroVenta = async (
  metodo: string,
  efectivoRecibido: number,
  total: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('/api/oficina/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metodo, efectivoRecibido, total }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { message?: string }).message || 'Error al procesar el cobro en el servidor.');
    }
    return await response.json();
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      if (metodo === 'Efectivo' && efectivoRecibido < total) {
        throw new Error('El efectivo recibido es menor al total a pagar.');
      }
      return { success: true, message: 'Venta cobrada y emitida con éxito (Modo DEV).' };
    }
    throw error;
  }
};