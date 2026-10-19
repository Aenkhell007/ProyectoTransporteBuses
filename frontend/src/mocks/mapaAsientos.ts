import type { MapaAsientos } from '../types/flota';

const NORMAL = '00000000-0000-4000-8000-000000000021';
const VIP = '00000000-0000-4000-8000-000000000022';

export const mapaAsientosMock: MapaAsientos = {
  viaje_id: '00000000-0000-4000-8000-000000000101',
  bus_id: '00000000-0000-4000-8000-000000000001',
  plano_id: '00000000-0000-4000-8000-000000000011',
  pisos: 2,
  clases: [
    { id: NORMAL, codigo: 'NORMAL', nombre: 'Normal' },
    { id: VIP, codigo: 'VIP', nombre: 'VIP' },
  ],
  paradas: [
    { orden: 1, terminal_id: '00000000-0000-4000-8000-000000000031', nombre: 'Ambato' },
    { orden: 2, terminal_id: '00000000-0000-4000-8000-000000000032', nombre: 'Latacunga' },
    { orden: 3, terminal_id: '00000000-0000-4000-8000-000000000033', nombre: 'Quito' },
  ],
  celdas: [
    { id: 'c1', piso: 1, fila: 1, columna: 1, tipo: 'ASIENTO', codigo: '1', clase_id: NORMAL, activa: true, ocupaciones: [] },
    { id: 'c2', piso: 1, fila: 1, columna: 2, tipo: 'ASIENTO', codigo: '2', clase_id: NORMAL, activa: true, ocupaciones: [{ origen_orden: 1, destino_orden: 2, estado: 'RETENIDO' }] },
    { id: 'c3', piso: 1, fila: 1, columna: 3, tipo: 'PASILLO', codigo: null, clase_id: null, activa: true, ocupaciones: [] },
    { id: 'c4', piso: 1, fila: 1, columna: 4, tipo: 'ASIENTO', codigo: '3', clase_id: NORMAL, activa: true, ocupaciones: [] },
    { id: 'c5', piso: 1, fila: 1, columna: 5, tipo: 'ASIENTO', codigo: '4', clase_id: NORMAL, activa: true, ocupaciones: [{ origen_orden: 1, destino_orden: 3, estado: 'RETENIDO' }] },
    { id: 'c6', piso: 2, fila: 1, columna: 1, tipo: 'ASIENTO', codigo: '5', clase_id: VIP, activa: true, ocupaciones: [] },
    { id: 'c7', piso: 2, fila: 1, columna: 2, tipo: 'ASIENTO', codigo: '6', clase_id: VIP, activa: true, ocupaciones: [{ origen_orden: 2, destino_orden: 3, estado: 'RETENIDO' }] },
  ],
};