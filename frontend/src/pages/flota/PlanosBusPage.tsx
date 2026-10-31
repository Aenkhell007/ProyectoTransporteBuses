import { useState } from 'react';
import PlanoEditor from '../../components/flota/PlanoEditor';
import { clasesAsientoMock } from '../../mocks/clasesAsiento';
import { versionesPlanoMock } from '../../mocks/versionesPlano';
import type { CeldaPlano } from '../../types/plano';
import type { VersionPlano } from '../../types/versionesPlano';
import { validarPlano } from '../../utils/plano';
import { crearNuevaVersion, planoEditable } from '../../utils/versionesPlano';
import './versiones-plano.css';

export default function PlanosBusPage() {
  const [versiones, setVersiones] = useState<VersionPlano[]>(versionesPlanoMock);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const editando = versiones.find((v) => v.id === editandoId) ?? null;
  const errores = editando ? validarPlano(editando.celdas, editando.pisos) : [];

  const nuevaVersion = (origen: VersionPlano) => {
    const nueva = crearNuevaVersion(versiones, origen, crypto.randomUUID());
    setVersiones((anteriores) => [...anteriores, nueva]);
    setEditandoId(nueva.id);
  };

  const cambiarCeldas = (celdas: CeldaPlano[]) => {
    setVersiones((anteriores) =>
      anteriores.map((v) => (v.id === editandoId ? { ...v, celdas } : v)),
    );
  };

  const contarAsientos = (v: VersionPlano) => v.celdas.filter((c) => c.tipo === 'ASIENTO').length;

  return (
    <div className="plano-editor-pagina">
      <h2>Planos del bus (datos simulados)</h2>
      <p>
        Un plano que usa algún viaje no cancelado no se puede editar: se crea una versión nueva
        a partir de él.
      </p>

      <table className="versiones-plano__tabla">
        <thead>
          <tr>
            <th>Versión</th>
            <th>Nombre</th>
            <th>Asientos</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {versiones.map((v) => (
            <tr key={v.id}>
              <td>{v.numero_version}</td>
              <td>{v.nombre}</td>
              <td>{contarAsientos(v)}</td>
              <td>
                {planoEditable(v)
                  ? 'Editable'
                  : `En uso por ${v.viajes_en_uso} ${v.viajes_en_uso === 1 ? 'viaje' : 'viajes'}: solo lectura`}
              </td>
              <td>
                {planoEditable(v) ? (
                  <button type="button" onClick={() => setEditandoId(v.id)}>
                    Editar
                  </button>
                ) : (
                  <button type="button" onClick={() => nuevaVersion(v)}>
                    Crear nueva versión desde esta
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editando && (
        <section className="versiones-plano__editor">
          <h3>
            Editando la versión {editando.numero_version}: {editando.nombre}
          </h3>
          <PlanoEditor
            clases={clasesAsientoMock}
            pisos={editando.pisos}
            filas={Math.max(6, ...editando.celdas.map((c) => c.fila))}
            columnas={Math.max(5, ...editando.celdas.map((c) => c.columna))}
            celdas={editando.celdas}
            onChange={cambiarCeldas}
          />
          {errores.length > 0 && (
            <ul>
              {errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => setEditandoId(null)}>
            Cerrar editor
          </button>
        </section>
      )}
    </div>
  );
}