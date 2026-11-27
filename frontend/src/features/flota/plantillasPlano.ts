import type { CeldaPlano } from '../../types/plano';

export function plantillaNormal(filas: number, claseId: string): CeldaPlano[] {
  if (!Number.isInteger(filas) || filas < 1 || filas > 20) throw new Error('Número de filas inválido.');
  const base = Array.from({ length: filas }, (_, i) => i + 1).flatMap(fila => [1, 2, 3, 4, 5].map(columna => ({
    piso: 1,
    fila,
    columna,
    tipo: columna === 3 ? 'PASILLO' as const : 'ASIENTO' as const,
    codigo: null,
    clase_id: columna === 3 ? null : claseId,
  })));
  return numerarPlanoComercial(base, 1);
}

/** Plantilla inicial editable; nunca sustituye el plano recibido para un bus existente. */
export function plantillaEjecutivo(filas: number, claseId: string): CeldaPlano[] {
  if (!Number.isInteger(filas) || filas < 1 || filas > 20) throw new Error('Número de filas inválido.');
  const base = [1, 2].flatMap(piso => Array.from({ length: filas }, (_, i) => i + 1).flatMap(fila =>
    [1, 2, 3, 4].map(columna => ({
      piso,
      fila,
      columna,
      tipo: columna === 2 ? 'PASILLO' as const : 'ASIENTO' as const,
      codigo: null,
      clase_id: columna === 2 ? null : claseId,
    })),
  ));
  return numerarPlanoComercial(base, 2);
}

export function numerarPlanoComercial(celdas: CeldaPlano[], pisos: number): CeldaPlano[] {
  const maxCol = Math.max(pisos === 1 ? 5 : 4, ...celdas.map(c => c.columna));
  let numero = 0;
  return [...celdas].sort((a, b) => a.piso - b.piso || a.fila - b.fila || a.columna - b.columna).map(c => {
    if (c.tipo !== 'ASIENTO') return { ...c, codigo: null, clase_id: null };
    numero += 1;
    const sufijo = c.columna === 1 || c.columna === maxCol ? 'V' : 'P';
    return { ...c, codigo: `${numero}${sufijo}` };
  });
}

export function columnasBanoParaClick(pisos: number, columna: number): [number, number] {
  if (pisos === 1) return columna <= 2 ? [1, 2] : [4, 5];
  return columna <= 2 ? [1, 2] : [3, 4];
}

export function columnasPuertaParaClick(pisos: number, columna: number): [number, number] {
  return columnasBanoParaClick(pisos, columna);
}

function detectarParesPorTipo(
  celdas: ReadonlyArray<{ piso: number; fila: number; columna: number; tipo: string }>,
  tipo: 'BLOQUE' | 'PUERTA',
): { inicios: Set<string>; cubiertas: Set<string> } {
  const inicios = new Set<string>();
  const cubiertas = new Set<string>();
  const porFila = new Map<string, number[]>();
  for (const c of celdas) {
    if (c.tipo !== tipo) continue;
    const k = `${c.piso}-${c.fila}`;
    const cols = porFila.get(k) ?? [];
    cols.push(c.columna);
    porFila.set(k, cols);
  }
  for (const [k, cols] of porFila.entries()) {
    const ordenadas = [...cols].sort((a, b) => a - b);
    for (let i = 0; i < ordenadas.length - 1; i++) {
      if (ordenadas[i + 1] === ordenadas[i] + 1) {
        inicios.add(`${k}-${ordenadas[i]}`);
        cubiertas.add(`${k}-${ordenadas[i + 1]}`);
        i++;
      }
    }
  }
  return { inicios, cubiertas };
}

export function detectarBanos(
  celdas: ReadonlyArray<{ piso: number; fila: number; columna: number; tipo: string }>,
): { inicios: Set<string>; cubiertas: Set<string> } {
  return detectarParesPorTipo(celdas, 'BLOQUE');
}

export function detectarPuertas(
  celdas: ReadonlyArray<{ piso: number; fila: number; columna: number; tipo: string }>,
): { inicios: Set<string>; cubiertas: Set<string>; cantidad: number } {
  const pares = detectarParesPorTipo(celdas, 'PUERTA');
  return { ...pares, cantidad: pares.inicios.size };
}

export function aplicarPuertasEnPlano(
  celdas: CeldaPlano[],
  pisos: number,
  totalPuertas: 1 | 2 | 3,
  clasePorDefectoId: string,
): CeldaPlano[] {
  if (!celdas.length) return celdas;
  const sinPuertas: CeldaPlano[] = celdas.map(c =>
    c.tipo === 'PUERTA'
      ? { ...c, tipo: 'ASIENTO' as const, codigo: null, clase_id: clasePorDefectoId }
      : c,
  );
  if (totalPuertas <= 1) return numerarPlanoComercial(sinPuertas, pisos);

  const piso1 = sinPuertas.filter(c => c.piso === 1);
  if (!piso1.length) return numerarPlanoComercial(sinPuertas, pisos);

  const filasPiso1 = [...new Set(piso1.map(c => c.fila))].sort((a, b) => a - b);
  const maxColPiso1 = Math.max(...piso1.map(c => c.columna));
  const [c1, c2]: [number, number] = maxColPiso1 >= 5 ? [4, 5] : [Math.max(1, maxColPiso1 - 1), maxColPiso1];

  const bloquesDerecha = new Set(
    piso1
      .filter(c => c.tipo === 'BLOQUE' && (c.columna === c1 || c.columna === c2))
      .map(c => c.fila),
  );
  const filasDisponibles = filasPiso1.filter(f => !bloquesDerecha.has(f));
  const candidatas = filasDisponibles.length ? filasDisponibles : filasPiso1;

  const filasObjetivo = new Set<number>();
  if (totalPuertas >= 2 && candidatas.length >= 1) {
    const idxCentro = candidatas.length >= 3 ? Math.min(candidatas.length - 2, Math.floor((candidatas.length - 1) / 2)) : 0;
    filasObjetivo.add(candidatas[idxCentro]);
  }
  if (totalPuertas === 3 && candidatas.length >= 2) {
    filasObjetivo.add(candidatas[candidatas.length - 1]);
  }

  const resultado: CeldaPlano[] = sinPuertas.filter(
    c => !(c.piso === 1 && filasObjetivo.has(c.fila) && (c.columna === c1 || c.columna === c2)),
  );
  for (const fila of filasObjetivo) {
    resultado.push(
      { piso: 1, fila, columna: c1, tipo: 'PUERTA', codigo: null, clase_id: null },
      { piso: 1, fila, columna: c2, tipo: 'PUERTA', codigo: null, clase_id: null },
    );
  }
  return numerarPlanoComercial(resultado, pisos);
}
