import { OficinaReservasResponse } from './OficinaReservasPage.types';

const MOCK_RESERVAS_DATA: OficinaReservasResponse = {
  kpis: {
    pendientePago: 1,
    enRevision: 1,
    confirmada: 1,
    vencida: 1,
  },
  reservas: [
    {
      id: 1,
      codigo: 'GC-20261010-4587',
      cliente: 'Ángel Matías Galarza',
      ruta: 'Quito → Guayaquil',
      fechaViaje: '17 oct 2026 06:00',
      asientos: '08 / 09',
      monto: 47.60,
      estadoReserva: 'Confirmada',
      estadoPago: 'Pagado',
      accionTexto: 'Ver reserva',
    },
    {
      id: 2,
      codigo: 'GC-20261010-4621',
      cliente: 'María López',
      ruta: 'Quito → Cuenca',
      fechaViaje: '17 oct 2026 07:00',
      asientos: '1 pasajero',
      monto: 20.00,
      estadoReserva: 'Pendiente',
      estadoPago: 'En revisión',
      accionTexto: 'Ver comprobante',
    },
    {
      id: 3,
      codigo: 'GC-20261010-4622',
      cliente: 'Juan Pérez',
      ruta: 'Ambato → Quito',
      fechaViaje: '18 oct 2026 09:00',
      asientos: '1 pasajero',
      monto: 12.00,
      estadoReserva: 'Pendiente',
      estadoPago: 'Pendiente',
      accionTexto: 'Ver reserva',
    },
    {
      id: 4,
      codigo: 'GC-20261008-4500',
      cliente: 'Luis Vera',
      ruta: 'Quito → Loja',
      fechaViaje: '15 oct 2026 08:00',
      asientos: '1 pasajero',
      monto: 28.00,
      estadoReserva: 'Vencida',
      estadoPago: 'Sin pago',
      accionTexto: 'Ver reserva',
    },
  ],
};

export const fetchOficinaReservasData = async (
  filtroEstado?: string,
  busqueda?: string,
  fecha?: string
): Promise<OficinaReservasResponse> => {
  try {
    const params = new URLSearchParams();
    if (filtroEstado && filtroEstado !== 'Todos') params.append('estado', filtroEstado);
    if (busqueda) params.append('q', busqueda);
    if (fecha) params.append('fecha', fecha);

    const response = await fetch(`/api/oficina/reservas?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Error en el servidor: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    let resultado = [...MOCK_RESERVAS_DATA.reservas];
    
    // 1. Filtrar por búsqueda de texto (código o cliente)
    if (busqueda && busqueda.trim() !== '') {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter(
        (r) => r.codigo.toLowerCase().includes(q) || r.cliente.toLowerCase().includes(q)
      );
    }

    // 2. Filtrar por estado de reserva
    if (filtroEstado && filtroEstado !== 'Todos') {
      resultado = resultado.filter(
        (r) => r.estadoReserva.toLowerCase() === filtroEstado.toLowerCase()
      );
    }

    // 3. Filtrar por fecha seleccionada en el calendario (ej. "2026-10-17" format)
    if (fecha && fecha.trim() !== '') {
      // Convertimos la fecha de "YYYY-MM-DD" a formato legible de comparación o parcial
      // En la maqueta las fechas están como "17 oct 2026..."
      // Hacemos una comprobación flexible por partes o año/mes/día
      const [anio, mes, dia] = fecha.split('-');
      const mesesMap: Record<string, string> = {
        '01': 'ene', '02': 'feb', '03': 'mar', '04': 'abr',
        '05': 'may', '06': 'jun', '07': 'jul', '08': 'ago',
        '09': 'sep', '10': 'oct', '11': 'nov', '12': 'dic'
      };
      const mesLetras = mesesMap[mes] || '';
      const diaStr = parseInt(dia, 10).toString(); // Quita ceros a la izquierda si aplica, ej "17"

      resultado = resultado.filter((r) => {
        const fechaTexto = r.fechaViaje.toLowerCase();
        const coincideDia = fechaTexto.includes(diaStr);
        const coincideMes = fechaTexto.includes(mesLetras);
        const coincideAnio = fechaTexto.includes(anio);
        return coincideDia && coincideMes && coincideAnio;
      });
    }

    return {
      kpis: MOCK_RESERVAS_DATA.kpis,
      reservas: resultado,
    };
  }
};