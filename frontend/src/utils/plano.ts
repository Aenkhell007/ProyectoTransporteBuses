import type { CeldaPlano, Herramienta } from '../types/plano';

// Límites de la tabla plano_celdas: piso 1-3 y columna 1-12.
export const MAX_COLUMNAS = 12;
export const MAX_PISOS = 3;

function ordenar(celdas: CeldaPlano[]): CeldaPlano[] {
  return [...celdas].sort(
    (a, b) => a.piso - b.piso || a.fila - b.fila || a.columna - b.columna,
  );
}

/** Numera los asientos 1, 2, 3... por piso, fila y columna. Pasillos y bloques no llevan código. */
export function renumerar(celdas: CeldaPlano[]): CeldaPlano[] {
  let numero = 0;
  return ordenar(celdas).map((c) =>
    c.tipo === 'ASIENTO' ? { ...c, codigo: String(++numero) } : { ...c, codigo: null },
  );
}

/** Aplica la herramienta elegida a una posición de la grilla. */
export function aplicarHerramienta(
  celdas: CeldaPlano[],
  piso: number,
  fila: number,
  columna: number,
  herramienta: Herramienta,
): CeldaPlano[] {
  const resto = celdas.filter(
    (c) => !(c.piso === piso && c.fila === fila && c.columna === columna),
  );
  if (herramienta.tipo === 'BORRAR') return renumerar(resto);

  const nueva: CeldaPlano =
    herramienta.tipo === 'ASIENTO'
      ? { piso, fila, columna, tipo: 'ASIENTO', codigo: null, clase_id: herramienta.clase_id }
      : { piso, fila, columna, tipo: herramienta.tipo, codigo: null, clase_id: null };

  return renumerar([...resto, nueva]);
}

/** Quita las celdas que quedan fuera al reducir pisos, filas o columnas. */
export function recortarPlano(
  celdas: CeldaPlano[],
  pisos: number,
  filas: number,
  columnas: number,
): CeldaPlano[] {
  return renumerar(
    celdas.filter((c) => c.piso <= pisos && c.fila <= filas && c.columna <= columnas),
  );
}

/** Validaciones del contrato (PUT /planos/:id/celdas). Devuelve la lista de errores. */
export function validarPlano(celdas: CeldaPlano[], pisos: number): string[] {
  const errores: string[] = [];
  if (pisos < 1 || pisos > MAX_PISOS) errores.push(`Los pisos deben estar entre 1 y ${MAX_PISOS}.`);
  if (!celdas.some((c) => c.tipo === 'ASIENTO')) errores.push('El plano necesita al menos un asiento.');

  const posiciones = new Set<string>();
  const codigos = new Set<string>();
  for (const c of celdas) {
    if (c.piso < 1 || c.piso > pisos) errores.push(`Piso fuera de rango: ${c.piso}.`);
    if (c.fila < 1) errores.push(`Fila inválida: ${c.fila}.`);
    if (c.columna < 1 || c.columna > MAX_COLUMNAS) errores.push(`Columna fuera de rango: ${c.columna}.`);

    const posicion = `${c.piso}-${c.fila}-${c.columna}`;
    if (posiciones.has(posicion)) {
      errores.push(`Posición repetida: piso ${c.piso}, fila ${c.fila}, columna ${c.columna}.`);
    }
    posiciones.add(posicion);

    if (c.tipo === 'ASIENTO') {
      if (!c.codigo) errores.push('Hay un asiento sin código.');
      else if (codigos.has(c.codigo)) errores.push(`Código repetido: ${c.codigo}.`);
      else codigos.add(c.codigo);
      if (!c.clase_id) errores.push(`El asiento ${c.codigo ?? ''} necesita una clase.`);
    } else if (c.codigo || c.clase_id) {
      errores.push('Los pasillos y bloques no llevan código ni clase.');
    }
  }
  return errores;
}

/** Cuerpo de PUT /planos/:id/celdas según el contrato. */
export function celdasParaApi(celdas: CeldaPlano[]) {
  return {
    celdas: ordenar(celdas).map((c) =>
      c.tipo === 'ASIENTO'
        ? { piso: c.piso, fila: c.fila, columna: c.columna, tipo: c.tipo, codigo: c.codigo, clase_id: c.clase_id }
        : { piso: c.piso, fila: c.fila, columna: c.columna, tipo: c.tipo },
    ),
  };
}