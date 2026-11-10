import { RevisionComprobanteData } from './RevisionComprobantePage.types';

const MOCK_REVISION_LOCAL: RevisionComprobanteData = {
  reservaId: 'GC-20261010-4587',
  cliente: 'Ángel Matías Galarza',
  estado: 'En verificación',
  comprobanteArchivo: 'comprobante.jpg',
  comprobanteTamano: '1.2 MB',
  bancoEmisor: 'Banco Pichincha',
  montoReportado: 47.60,
  fechaHora: '10/10/2026 09:14:27',
  referencia: 'TRX4587',
  codigoTransaccion: '4567891234',
  origen: 'Quito',
  destino: 'Guayaquil',
  fechaViaje: 'Sáb, 10 oct 2026',
  salida: '06:00',
  llegada: '14:30',
  unidad: '018',
  placa: 'PAB-1234',
  piso: 'Piso superior',
  asientosInfo: '2 asientos: U8, U9',
  pasajeros: [
    { id: 1, nombre: 'Ángel Matías Galarza', asiento: 'U8', tipo: 'Adulto', tarifa: 28.00 },
    { id: 2, nombre: 'María Fernanda Galarza', asiento: 'U9', tipo: 'Niño', tarifa: 19.60 },
  ],
  subtotalBase: 56.00,
  descuento: 8.40,
  cargoServicio: 0.00,
  totalEsperado: 47.60,
};

export const fetchRevisionComprobante = async (id?: string): Promise<RevisionComprobanteData> => {
  try {
    const response = await fetch(`/api/oficina/comprobantes/${id || 'GC-20261010-4587'}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { message?: string }).message || `Error del servidor: ${response.status}`);
    }

    return (await response.json()) as RevisionComprobanteData;
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      console.warn(
        `[VistaPreviaPanel] Aviso: No se pudo conectar con el endpoint de revisión. Usando datos locales en modo DEV. Detalle: ${mensaje}`
      );
      return MOCK_REVISION_LOCAL;
    }
    throw error;
  }
};

export const enviarDecisionComprobante = async (
  reservaId: string,
  decision: 'aprobar' | 'rechazar',
  motivo?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`/api/oficina/comprobantes/${reservaId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, motivo }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { message?: string }).message || 'Error al procesar la decisión en el servidor.');
    }

    return await response.json();
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.warn(`[VistaPreviaPanel DEV] Simulación de decisión (${decision}) registrada exitosamente.`);
      return { success: true, message: `Comprobante ${decision === 'aprobar' ? 'aprobado' : 'rechazado'} con éxito (Modo DEV).` };
    }
    throw error;
  }
};