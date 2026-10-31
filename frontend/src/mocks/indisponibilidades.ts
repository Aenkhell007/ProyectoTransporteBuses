import type { Indisponibilidad } from '../types/indisponibilidad';

// El bus con id ...001 es el de la unidad 12 de mocks/buses.ts.
export const indisponibilidadesMock: Indisponibilidad[] = [
  {
    id: '00000000-0000-4000-8000-000000000601',
    bus_id: '00000000-0000-4000-8000-000000000001',
    desde: '2026-11-05T08:00:00-05:00',
    hasta: '2026-11-06T08:00:00-05:00',
    motivo: 'Mantenimiento',
  },
];