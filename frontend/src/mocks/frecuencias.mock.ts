import { FrecuenciaANT } from '../types/frecuencia.types';

// Mock temporal para el listado inicial de la vista V16 (Frecuencias ANT y paradas)
export const FRECUENCIAS_ANT_MOCK: FrecuenciaANT[] = [
  {
    id: 'freq-001',
    cooperativaId: 'coop-gran-continental',
    numeroResolucion: 'ANT-2026-00145',
    origen: 'Quito',
    destino: 'Loja',
    horaSalida: '08:00',
    tipo: 'CON_PARADAS',
    estado: 'ACTIVA',
  },
  {
    id: 'freq-002',
    cooperativaId: 'coop-gran-continental',
    numeroResolucion: 'ANT-2026-00198',
    origen: 'Ambato',
    destino: 'Guayaquil',
    horaSalida: '14:30',
    tipo: 'DIRECTO',
    estado: 'ACTIVA',
  },
  {
    id: 'freq-003',
    cooperativaId: 'coop-gran-continental',
    numeroResolucion: 'ANT-2026-00210',
    origen: 'Quito',
    destino: 'Cuenca',
    horaSalida: '21:00',
    tipo: 'CON_PARADAS',
    estado: 'INACTIVA',
  },
];
