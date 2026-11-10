import { OficinaReservasResponse } from './OficinaReservasPage.types';

// Maqueta local tipada como any para evitar desajustes con nombres de propiedades en DEV
const MOCK_RESERVAS_LOCAL: any = {
  kpis: {
    totalHoy: 5,
    porAprobar: 2,
    confirmadas: 2,
    canceladas: 1,
  },
  reservas: [
    {
      id: 1,
      codigo: 'GC-20261010-4587',
      cliente: 'Ángel Matías Galarza',
      ruta: 'Ambato - Quito',
      asientos: '12, 13',
      monto: 9.50,
      estado: 'Confirmada',
      fechaViaje: '2026-10-15',
    },
    {
      id: 2,
      codigo: 'GC-20261009-4420',
      cliente: 'Luis Vera',
      ruta: 'Quito - Guayaquil',
      asientos: '04',
      monto: 12.00,
      estado: 'Pendiente',
      fechaViaje: '2026-10-16',
    },
  ],
};

export const fetchOficinaReservasData = async (
  estadoTab?: string,
  busqueda?: string,
  fecha?: string
): Promise<OficinaReservasResponse> => {
  try {
    const params = new URLSearchParams();
    if (estadoTab && estadoTab !== 'Todos') params.append('estado', estadoTab);
    if (busqueda) params.append('q', busqueda);
    if (fecha) params.append('fecha', fecha);

    const response = await fetch(`/api/oficina/reservas?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error del servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    // Catch inteligente: Si estamos en desarrollo, usamos la maqueta con advertencia
    if (import.meta.env.DEV) {
      console.warn(
        `[VistaPreviaPanel] Aviso: No se pudo conectar con el endpoint de reservas (/api/oficina/reservas). Usando datos de maqueta local en modo DEV. Detalle: ${error.message}`
      );

      const guardados = sessionStorage.getItem('gc_reservas_oficina');
      let lista = guardados ? JSON.parse(guardados) : [...MOCK_RESERVAS_LOCAL.reservas];

      let resultado = [...lista];

      if (estadoTab && estadoTab !== 'Todos') {
        resultado = resultado.filter(
          (r: any) => r.estado.toLowerCase() === estadoTab.toLowerCase()
        );
      }

      if (busqueda && busqueda.trim() !== '') {
        const q = busqueda.toLowerCase().trim();
        resultado = resultado.filter(
          (r: any) => r.codigo.toLowerCase().includes(q) || r.cliente.toLowerCase().includes(q)
        );
      }

      return {
        kpis: MOCK_RESERVAS_LOCAL.kpis,
        reservas: resultado,
      };
    }

    // En producción se relanza el error real (401, 403, red caída)
    throw error;
  }
};