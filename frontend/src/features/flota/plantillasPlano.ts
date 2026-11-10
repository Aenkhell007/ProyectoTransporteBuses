import type { CeldaPlano } from '../../types/plano';

export function plantillaNormal(filas: number, claseId: string): CeldaPlano[] {
  if (!Number.isInteger(filas) || filas < 1 || filas > 20) throw new Error('Número de filas inválido.');
  return Array.from({ length: filas }, (_, i) => i + 1).flatMap(fila => [1, 2, 3, 4, 5].map(columna => ({
    piso: 1, fila, columna,
    tipo: columna === 3 ? 'PASILLO' as const : 'ASIENTO' as const,
    codigo: columna === 3 ? null : `${fila}${['A', 'B', '', 'C', 'D'][columna - 1]}`,
    clase_id: columna === 3 ? null : claseId,
  })));
}

/** Plantilla inicial editable; nunca sustituye el plano recibido para un bus existente. */
export function plantillaEjecutivo(filas: number, claseId: string): CeldaPlano[] {
  if (!Number.isInteger(filas) || filas < 1 || filas > 20) throw new Error('Número de filas inválido.');
  return [1, 2].flatMap(piso => Array.from({ length: filas }, (_, i) => i + 1).flatMap(fila =>
    [1, 2, 3, 4].map(columna => ({
      piso, fila, columna,
      tipo: columna === 2 ? 'PASILLO' as const : 'ASIENTO' as const,
      codigo: columna === 2 ? null : `${piso === 1 ? 'L' : 'U'}${(fila - 1) * 3 + (columna === 1 ? 1 : columna - 1)}`,
      clase_id: columna === 2 ? null : claseId,
    })),
  ));
}

export function numerarPlanoComercial(celdas: CeldaPlano[], pisos: number): CeldaPlano[] {
  const contadores = new Map<number, number>();
  return [...celdas].sort((a, b) => a.piso - b.piso || a.fila - b.fila || a.columna - b.columna).map(c => {
    if (c.tipo !== 'ASIENTO') return { ...c, codigo: null, clase_id: null };
    const numero = (contadores.get(c.piso) ?? 0) + 1;
    contadores.set(c.piso, numero);
    const letra = ['A', 'B', '', 'C', 'D'][c.columna - 1];
    return { ...c, codigo: pisos === 2 ? `${c.piso === 1 ? 'L' : 'U'}${numero}` : letra ? `${c.fila}${letra}` : `F${c.fila}C${c.columna}` };
  });
}
