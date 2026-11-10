import { OficinaComprobantesResponse } from './OficinaComprobantesPage.types';

const MOCK_COMPROBANTES_DATA: OficinaComprobantesResponse = {
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
  estadoTab?: string,
  busqueda?: string,
  banco?: string,
  desde?: string,
  hasta?: string
): Promise<OficinaComprobantesResponse> => {
  try {
    const params = new URLSearchParams();
    if (estadoTab && estadoTab !== 'Todos') params.append('estado', estadoTab);
    if (busqueda) params.append('q', busqueda);
    if (banco && banco !== 'Todos') params.append('banco', banco);
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);

    const response = await fetch(`/api/oficina/comprobantes?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Error en el servidor: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // Verificamos si hay datos guardados en sessionStorage para persistir cambios locales
    const guardados = sessionStorage.getItem('gc_comprobantes_oficina');
    let listaComprobantes = guardados ? JSON.parse(guardados) : [...MOCK_COMPROBANTES_DATA.comprobantes];

    let resultado = [...listaComprobantes];

    // 1. Filtrar por pestaña de estado
    if (estadoTab && estadoTab !== 'Todos') {
      resultado = resultado.filter(
        (c) => c.estado.toLowerCase() === estadoTab.toLowerCase()
      );
    }

    // 2. Filtrar por búsqueda de texto (reserva o cliente)
    if (busqueda && busqueda.trim() !== '') {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (c) => c.reserva.toLowerCase().includes(q) || c.cliente.toLowerCase().includes(q)
      );
    }

    // 3. Filtrar por banco
    if (banco && banco !== 'Todos') {
      resultado = resultado.filter(
        (c) => c.banco.toLowerCase() === banco.toLowerCase()
      );
    }

    // 4. Filtrar por rango de fechas (Desde - Hasta)
    if (desde || hasta) {
      const mesesMap: Record<string, number> = {
        'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4,
        'may': 5, 'jun': 6, 'jul': 7, 'ago': 8,
        'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
      };

      resultado = resultado.filter((c) => {
        // Ejemplo de recibido: "16 oct 2026 09:30"
        const partes = c.recibido.split(' ');
        if (partes.length < 3) return true;
        const dia = partes[0].padStart(2, '0');
        const mesStr = partes[1].toLowerCase();
        const anio = partes[2];
        const mes = (mesesMap[mesStr] || 1).toString().padStart(2, '0');
        
        const fechaComprobanteStr = `${anio}-${mes}-${dia}`; // Formato YYYY-MM-DD

        if (desde && fechaComprobanteStr < desde) return false;
        if (hasta && fechaComprobanteStr > hasta) return false;
        return true;
      });
    }

    const enRevisionCount = listaComprobantes.filter((c: any) => c.estado === 'En revisión').length;
    const aprobadosCount = listaComprobantes.filter((c: any) => c.estado === 'Aprobados').length;
    const rechazadosCount = listaComprobantes.filter((c: any) => c.estado === 'Rechazados').length;

    return {
      kpis: {
        total: listaComprobantes.length,
        enRevision: enRevisionCount,
        aprobados: aprobadosCount,
        rechazados: rechazadosCount,
      },
      comprobantes: resultado,
    };
  }
};