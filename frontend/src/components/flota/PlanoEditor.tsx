import { useState } from 'react';
import type { CeldaPlano, ClaseAsiento, Herramienta } from '../../types/plano';
import { aplicarHerramienta } from '../../utils/plano';
import './plano-editor.css';

interface PlanoEditorProps {
  clases: ClaseAsiento[];
  pisos: number;
  filas: number;
  columnas: number;
  celdas: CeldaPlano[];
  onChange: (celdas: CeldaPlano[]) => void;
}

export default function PlanoEditor({
  clases,
  pisos,
  filas,
  columnas,
  celdas,
  onChange,
}: PlanoEditorProps) {
  const [herramienta, setHerramienta] = useState<Herramienta>({
    tipo: 'ASIENTO',
    clase_id: clases[0]?.id ?? '',
  });

  const activa = (candidata: Herramienta) =>
    candidata.tipo === herramienta.tipo &&
    (candidata.tipo !== 'ASIENTO' ||
      (herramienta.tipo === 'ASIENTO' && candidata.clase_id === herramienta.clase_id));

  const boton = (etiqueta: string, candidata: Herramienta) => (
    <button
      key={etiqueta}
      type="button"
      className={`plano-editor__herramienta${activa(candidata) ? ' plano-editor__herramienta--activa' : ''}`}
      aria-pressed={activa(candidata)}
      onClick={() => setHerramienta(candidata)}
    >
      {etiqueta}
    </button>
  );

  const posiciones = (cantidad: number) => Array.from({ length: cantidad }, (_, i) => i + 1);

  return (
    <div className="plano-editor">
      <div className="plano-editor__barra">
        {clases.map((k) => boton(`Asiento ${k.nombre}`, { tipo: 'ASIENTO', clase_id: k.id }))}
        {boton('Pasillo', { tipo: 'PASILLO' })}
        {boton('Bloque', { tipo: 'BLOQUE' })}
        {boton('Borrar', { tipo: 'BORRAR' })}
      </div>

      <div className="plano-editor__pisos">
        {posiciones(pisos).map((piso) => (
          <section key={piso}>
            <h3>Piso {piso}</h3>
            <div
              className="plano-editor__grilla"
              style={{ gridTemplateColumns: `repeat(${columnas}, 2.75rem)` }}
            >
              {posiciones(filas).map((fila) =>
                posiciones(columnas).map((columna) => {
                  const celda = celdas.find(
                    (c) => c.piso === piso && c.fila === fila && c.columna === columna,
                  );
                  const tipo = celda ? celda.tipo.toLowerCase() : 'vacia';
                  const indiceClase = celda ? clases.findIndex((k) => k.id === celda.clase_id) : -1;
                  const clase = indiceClase >= 0 ? ` plano-editor__celda--clase-${indiceClase}` : '';
                  return (
                    <button
                      key={`${piso}-${fila}-${columna}`}
                      type="button"
                      className={`plano-editor__celda plano-editor__celda--${tipo}${clase}`}
                      aria-label={`Piso ${piso}, fila ${fila}, columna ${columna}: ${
                        celda ? celda.tipo.toLowerCase() : 'vacía'
                      }`}
                      onClick={() => onChange(aplicarHerramienta(celdas, piso, fila, columna, herramienta))}
                    >
                      {celda?.tipo === 'ASIENTO' ? celda.codigo : ''}
                    </button>
                  );
                }),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}