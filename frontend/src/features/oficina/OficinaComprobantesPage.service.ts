import { OficinaComprobantesResponse, ComprobanteItem } from './OficinaComprobantesPage.types';

const MOCK_COMPROBANTES_LOCAL: OficinaComprobantesResponse = {
  kpis: {
    total: 4,
    enRevision: 1,
    aprobados: 2,
    rechazados: 1,
  },
  comprobantes: [
    {
      id: 1,
      reserva: 'GC-20261010-4587',
      cliente: 'Ángel Matías Galarza',
      banco: 'Pichincha',
      recibido: '16 oct 2026 09:30',
      monto: 47.60,
      estado: 'Aprobados',
      reembolso: 'Sin solicitud',
      accionTexto: 'Ver detalle',
    },
    {
      id: 2,
      reserva: 'GC-20261012-4621',
      cliente: 'María López',
      banco: 'Guayaquil',
      recibido: '16 oct 2026 10:00',
      monto: 20.00,
      estado: 'En revisión',
      reembolso: 'No aplica',
      accionTexto: 'Revisar',
    },
    {
      id: 3,
      reserva: 'GC-20261012-4622',
      cliente: 'Juan Pérez',
      banco: 'Produbanco',
      recibido: '16 oct 2026 10:15',
      monto: 12.00,
      estado: 'Rechazados',
      reembolso: 'No aplica',
      accionTexto: 'Ver motivo',
    },
    {
      id: 4,
      reserva: 'GC-20261009-4400',
      cliente: 'Luis Vera',
      banco: 'Pichincha',
      recibido: '15 oct 2026 12:00',
      monto: 47.60,
      estado: 'Aprobados',
      reembolso: 'Completado $23.80',
      accionTexto: 'Ver detalle',
    },
  ],
};

export const fetchOficinaComprobantesData = async (
  estado?: string,
  q?: string,
  banco?: string,
  desde?: string,
  hasta?: string
): Promise<OficinaComprobantesResponse> => {
  try {
    const params = new URLSearchParams();
    if (estado && estado !== 'Todos') params.append('estado', estado);
    if (q) params.append('q', q);
    if (banco && banco !== 'Todos') params.append('banco', banco);
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);

    const response = await fetch(`/api/oficina/comprobantes?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { message?: string }).message || `Error del servidor: ${response.status}`);
    }

    return (await response.json()) as OficinaComprobantesResponse;
  } catch (error: unknown) {
    // Manejo de errores con catch inteligente para entorno DEV
    if (import.meta.env.DEV) {
      const mensajeError = error instanceof Error ? error.message : 'Error desconocido';
      console.warn(
        `[VistaPreviaPanel] Aviso: No se pudo conectar con el endpoint de comprobantes (/api/oficina/comprobantes). Usando datos de maqueta local en modo DEV. Detalle: ${mensajeError}`
      );

      const guardados = sessionStorage.getItem('gc_comprobantes_oficina');
      let lista: ComprobanteItem[] = guardados ? JSON.parse(guardados) : [...MOCK_COMPROBANTES_LOCAL.comprobantes];

      let resultado = [...lista];

      if (estado && estado !== 'Todos') {
        resultado = resultado.filter(
          (c) => c.estado.toLowerCase() === estado.toLowerCase()
        );
      }

      if (banco && banco !== 'Todos') {
        resultado = resultado.filter(
          (c) => c.banco.toLowerCase() === banco.toLowerCase()
        );
      }

      if (q && q.trim() !== '') {
        const query = q.toLowerCase().trim();
        resultado = resultado.filter(
          (c) => c.reserva.toLowerCase().includes(query) || c.cliente.toLowerCase().includes(query)
        );
      }

      return {
        kpis: MOCK_COMPROBANTES_LOCAL.kpis,
        comprobantes: resultado,
      };
    }

    // En producción relanzamos el error real
    throw error;
  }
};