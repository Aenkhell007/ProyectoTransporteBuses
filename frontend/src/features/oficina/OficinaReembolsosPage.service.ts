import { ReembolsosResumenData, SolicitudReembolso } from './OficinaReembolsosPage.types';

const MOCK_REEMBOLSOS_LOCAL: ReembolsosResumenData = {
  solicitudesHoy: 3,
  solicitada: 1,
  completadas: 1,
  rechazadas: 1,
  lista: [
    {
      id: '1',
      reservaId: 'GC-20261010-4587',
      cliente: 'Ángel Matías Galarza',
      montoPagado: 47.60,
      porcentajeDevolucion: 50,
      montoDevolver: 23.80,
      estado: 'Solicitado',
      anticipacion: '16 h antes de la salida',
      versionPolitica: 'Borrador',
      fechaViaje: '17 oct 2026 06:00',
      notaInterna: 'Revisar política antes de procesar.',
      historial: [
        { id: 1, accion: 'Solicitud de reembolso creada', fechaHora: '16 oct 2026, 09:12', descripcion: 'El cliente solicitó la devolución del pasaje' }
      ]
    },
    {
      id: '2',
      reservaId: 'GC-20261008-4400',
      cliente: 'Luis Vera',
      montoPagado: 47.60,
      porcentajeDevolucion: 50,
      montoDevolver: 23.80,
      estado: 'Completado',
      anticipacion: '24 h antes de la salida',
      versionPolitica: 'V1.0',
      fechaViaje: '15 oct 2026 08:00',
      historial: []
    },
    {
      id: '3',
      reservaId: 'GC-20261007-4390',
      cliente: 'María Paz',
      montoPagado: 20.00,
      porcentajeDevolucion: 100,
      montoDevolver: 20.00,
      estado: 'Rechazado',
      anticipacion: '2 h antes de la salida',
      versionPolitica: 'V1.0',
      fechaViaje: '16 oct 2026 14:00',
      historial: []
    }
  ]
};

export const fetchReembolsosData = async (): Promise<ReembolsosResumenData> => {
  try {
    const res = await fetch('/api/oficina/reembolsos');
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      console.warn('[DevMode] Usando datos locales simulados para Reembolsos.');
      return MOCK_REEMBOLSOS_LOCAL;
    }
    throw err;
  }
};

export const procesarDecisionReembolso = async (
  id: string, 
  decision: 'aprobar' | 'rechazar', 
  motivo?: string
): Promise<{ success: boolean }> => {
  try {
    const res = await fetch(`/api/oficina/reembolsos/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, motivo })
    });
    if (!res.ok) throw new Error('Error al procesar la decisión');
    return await res.json();
  } catch (err: unknown) {
    if (import.meta.env.DEV) {
      return { success: true };
    }
    throw err;
  }
};