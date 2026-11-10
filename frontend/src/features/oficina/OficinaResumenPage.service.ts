import { OficinaResumenResponse } from './OficinaResumenPage.types';

const MOCK_OFICINA_RESUMEN: OficinaResumenResponse = {
  kpis: {
    ventasHoy: 420.00,
    asientosVendidos: 18,
    comprobantesPendientes: 3,
    reservasConfirmadas: 9,
  },
  comprobantesPendientes: [
    { id: 1, reserva: 'GC-20261010-4587', cliente: 'Ángel Matías Galarza', viaje: 'Quito → Guayaquil', monto: 47.60, estado: 'En verificación' },
    { id: 2, reserva: 'GC-20261012-3291', cliente: 'María López', viaje: 'Quito → Cuenca', monto: 28.00, estado: 'Pendiente' },
    { id: 3, reserva: 'GC-20261014-7715', cliente: 'José Pérez', viaje: 'Guayaquil → Quito', monto: 56.00, estado: 'Pendiente' },
  ],
  proximasSalidas: [
    { id: 1, ruta: 'Quito → Guayaquil', hora: '16:00', unidad: 'Unidad 018', asientosVendidos: 28, capacidad: 36 },
    { id: 2, ruta: 'Quito → Cuenca', hora: '17:00', unidad: 'Unidad 025', asientosVendidos: 20, capacidad: 40 },
  ],
};

export const fetchOficinaResumenData = async (): Promise<OficinaResumenResponse> => {
  try {
    const response = await fetch('/api/oficina/resumen');
    if (!response.ok) {
      throw new Error(`Error en el servidor: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // Fallback de maqueta aprobado para desarrollo ante ausencia de endpoint en develop
    return MOCK_OFICINA_RESUMEN;
  }
};