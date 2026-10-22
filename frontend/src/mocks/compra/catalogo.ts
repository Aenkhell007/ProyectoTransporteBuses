import type { Ciudad, DestinoDestacado } from '../../types/compra/catalogo';

// Datos simulados. Los IDs imitan UUID; en la base salen de la tabla ciudades.
export const CIUDAD = {
  quito: '00000000-0000-4000-8000-000000000401',
  guayaquil: '00000000-0000-4000-8000-000000000402',
  cuenca: '00000000-0000-4000-8000-000000000403',
  ambato: '00000000-0000-4000-8000-000000000404',
  loja: '00000000-0000-4000-8000-000000000405',
  latacunga: '00000000-0000-4000-8000-000000000406',
  riobamba: '00000000-0000-4000-8000-000000000407',
  manta: '00000000-0000-4000-8000-000000000408',
} as const;

export const ciudadesMock: Ciudad[] = [
  { id: CIUDAD.ambato, nombre: 'Ambato', provincia: 'Tungurahua' },
  { id: CIUDAD.cuenca, nombre: 'Cuenca', provincia: 'Azuay' },
  { id: CIUDAD.guayaquil, nombre: 'Guayaquil', provincia: 'Guayas' },
  { id: CIUDAD.latacunga, nombre: 'Latacunga', provincia: 'Cotopaxi' },
  { id: CIUDAD.loja, nombre: 'Loja', provincia: 'Loja' },
  { id: CIUDAD.manta, nombre: 'Manta', provincia: 'Manabí' },
  { id: CIUDAD.quito, nombre: 'Quito', provincia: 'Pichincha' },
  { id: CIUDAD.riobamba, nombre: 'Riobamba', provincia: 'Chimborazo' },
];

// Precios "desde" de la maqueta aprobada; son referenciales y no salen de la tabla tarifas.
export const destinosDestacadosMock: DestinoDestacado[] = [
  { ciudad_id: CIUDAD.quito, nombre: 'Quito', tarifa_desde_centavos: 2000 },
  { ciudad_id: CIUDAD.guayaquil, nombre: 'Guayaquil', tarifa_desde_centavos: 2500 },
  { ciudad_id: CIUDAD.cuenca, nombre: 'Cuenca', tarifa_desde_centavos: 1800 },
  { ciudad_id: CIUDAD.ambato, nombre: 'Ambato', tarifa_desde_centavos: 1200 },
  { ciudad_id: CIUDAD.loja, nombre: 'Loja', tarifa_desde_centavos: 2800 },
];
