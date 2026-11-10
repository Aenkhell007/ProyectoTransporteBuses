import { useState } from 'react';
import PlanoEditor from '../../components/flota/PlanoEditor';
import { clasesAsientoMock } from '../../mocks/clasesAsiento';
import type { CeldaPlano } from '../../types/plano';
import {
  MAX_COLUMNAS,
  MAX_PISOS,
  celdasParaApi,
  recortarPlano,
  validarPlano,
} from '../../utils/plano';

export default function PlanoEditorPage() {
  const [pisos, setPisos] = useState(1);
  const [filas, setFilas] = useState(6);
  const [columnas, setColumnas] = useState(5);
  const [celdas, setCeldas] = useState<CeldaPlano[]>([]);

  const cambiarDimensiones = (p: number, f: number, c: number) => {
    setPisos(p);
    setFilas(f);
    setColumnas(c);
    setCeldas((anteriores) => recortarPlano(anteriores, p, f, c));
  };

  const opciones = (maximo: number) =>
    Array.from({ length: maximo }, (_, i) => (
      <option key={i + 1} value={i + 1}>
        {i + 1}
      </option>
    ));

  const errores = validarPlano(celdas, pisos);
  const totalAsientos = celdas.filter((c) => c.tipo === 'ASIENTO').length;

  return (
    <div className="plano-editor-pagina">
      <h2>Editor de plano de asientos (datos simulados)</h2>
      <p>
        <label>
          Pisos:{' '}
          <select value={pisos} onChange={(e) => cambiarDimensiones(Number(e.target.value), filas, columnas)}>
            {opciones(MAX_PISOS)}
          </select>
        </label>{' '}
        <label>
          Filas:{' '}
          <select value={filas} onChange={(e) => cambiarDimensiones(pisos, Number(e.target.value), columnas)}>
            {opciones(15)}
          </select>
        </label>{' '}
        <label>
          Columnas:{' '}
          <select value={columnas} onChange={(e) => cambiarDimensiones(pisos, filas, Number(e.target.value))}>
            {opciones(MAX_COLUMNAS)}
          </select>
        </label>
      </p>

      <PlanoEditor
        clases={clasesAsientoMock}
        pisos={pisos}
        filas={filas}
        columnas={columnas}
        celdas={celdas}
        onChange={setCeldas}
      />

      <p>Asientos: {totalAsientos}</p>
      {errores.length > 0 && (
        <ul>
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <h3>Cuerpo de PUT /planos/:id/celdas</h3>
      <pre>{JSON.stringify(celdasParaApi(celdas), null, 2)}</pre>
    </div>
  );
}