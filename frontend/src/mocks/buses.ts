import type { Bus, GrupoBus } from '../types/bus';

export const gruposMock: GrupoBus[] = [
  { id: '00000000-0000-4000-8000-000000000301', nombre: 'Grupo Norte' },
  { id: '00000000-0000-4000-8000-000000000302', nombre: 'Grupo Sur' },
];

export const busesMock: Bus[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    unidad: '12',
    placa: 'TBA-1234',
    chasis: 'Chasis A',
    carroceria: 'Carrocería A',
    grupo_id: '00000000-0000-4000-8000-000000000301',
    propietario: null,
    correo_contacto: null,
    activo: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    unidad: '15',
    placa: 'TBB-5678',
    chasis: 'Chasis B',
    carroceria: 'Carrocería B',
    grupo_id: '00000000-0000-4000-8000-000000000302',
    propietario: 'Propietario de ejemplo',
    correo_contacto: 'contacto@ejemplo.com',
    activo: false,
  },
];