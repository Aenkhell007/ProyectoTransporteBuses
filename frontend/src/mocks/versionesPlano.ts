import type { CeldaPlano } from '../types/plano';
import type { VersionPlano } from '../types/versionesPlano';

// Los códigos reales de clases_asiento se confirman con el equipo.
const NORMAL = '00000000-0000-4000-8000-000000000021';

function asiento(piso: number, fila: number, columna: number, codigo: string): CeldaPlano {
  return { piso, fila, columna, tipo: 'ASIENTO', codigo, clase_id: NORMAL };
}

function pasillo(piso: number, fila: number, columna: number): CeldaPlano {
  return { piso, fila, columna, tipo: 'PASILLO', codigo: null, clase_id: null };
}

export const versionesPlanoMock: VersionPlano[] = [
  {
    id: '00000000-0000-4000-8000-000000000501',
    numero_version: 1,
    nombre: 'Plano estándar',
    pisos: 1,
    publicado: true,
    viajes_en_uso: 3,
    celdas: [
      asiento(1, 1, 1, '1'),
      asiento(1, 1, 2, '2'),
      pasillo(1, 1, 3),
      asiento(1, 1, 4, '3'),
      asiento(1, 1, 5, '4'),
      asiento(1, 2, 1, '5'),
      asiento(1, 2, 2, '6'),
      pasillo(1, 2, 3),
      asiento(1, 2, 4, '7'),
      asiento(1, 2, 5, '8'),
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000502',
    numero_version: 2,
    nombre: 'Plano estándar (borrador)',
    pisos: 1,
    publicado: false,
    viajes_en_uso: 0,
    celdas: [
      asiento(1, 1, 1, '1'),
      asiento(1, 1, 2, '2'),
      pasillo(1, 1, 3),
      asiento(1, 1, 4, '3'),
      asiento(1, 1, 5, '4'),
    ],
  },
];