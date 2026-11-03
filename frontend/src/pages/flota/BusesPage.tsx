import { useState } from 'react';
import BusForm from '../../components/flota/BusForm';
import { busesMock, gruposMock } from '../../mocks/buses';
import type { Bus, BusFormData } from '../../types/bus';
import './buses.css';

// Función auxiliar para centralizar la limpieza de datos y no repetir código
const normalizarDatos = (datos: BusFormData) => ({
  unidad: datos.unidad.trim(),
  placa: datos.placa,
  chasis: datos.chasis.trim(),
  carroceria: datos.carroceria.trim(),
  grupo_id: datos.grupo_id,
  propietario: datos.propietario.trim() || null,
  correo_contacto: datos.correo_contacto.trim() || null,
});

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>(busesMock);
  const [verInactivos, setVerInactivos] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const editando = buses.find((b) => b.id === editandoId);

  const agregar = (datos: BusFormData) => {
    // Fallback de seguridad por si crypto.randomUUID falla en HTTP local
    const idGenerado = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `simulado-${Date.now()}`;

    const nuevo: Bus = {
      id: idGenerado,
      ...normalizarDatos(datos),
      activo: true,
    };
    setBuses((anteriores) => [...anteriores, nuevo]);
  };

  const guardarEdicion = (datos: BusFormData) => {
    setBuses((anteriores) =>
      anteriores.map((b) =>
        b.id === editandoId ? { ...b, ...normalizarDatos(datos) } : b
      )
    );
    setEditandoId(null);
  };

  // Desactivar, no borrar: el DELETE del contrato pone activo en false.
  const desactivar = (id: string) => {
    setBuses((anteriores) => anteriores.map((b) => (b.id === id ? { ...b, activo: false } : b)));
    if (editandoId === id) setEditandoId(null);
  };

  const visibles = buses.filter((b) => b.activo !== verInactivos);
  const nombreGrupo = (id: string) => gruposMock.find((g) => g.id === id)?.nombre ?? '—';

  return (
    <div className="buses-page">
      <h2>Buses de la cooperativa (datos simulados)</h2>
      {editando && <h3>Editando el bus de la unidad {editando.unidad}</h3>}
      <BusForm
        key={editando?.id ?? 'nuevo'}
        grupos={gruposMock}
        existentes={buses}
        onGuardar={editando ? guardarEdicion : agregar}
        bus={editando}
        onCancelar={() => setEditandoId(null)}
      />
      <label>
        <input
          type="checkbox"
          checked={verInactivos}
          onChange={(e) => setVerInactivos(e.target.checked)}
        />{' '}
        Ver desactivados
      </label>
      <table className="buses-page__tabla">
        <thead>
          <tr>
            <th>Unidad</th>
            <th>Placa</th>
            <th>Grupo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((b) => (
            <tr key={b.id}>
              <td>{b.unidad}</td>
              <td>{b.placa}</td>
              <td>{nombreGrupo(b.grupo_id)}</td>
              <td>{b.activo ? 'Activo' : 'Desactivado'}</td>
              <td>
                {b.activo && (
                  <>
                    <button type="button" onClick={() => setEditandoId(b.id)}>
                      Editar
                    </button>{' '}
                    <button type="button" onClick={() => desactivar(b.id)}>
                      Desactivar
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {visibles.length === 0 && (
            <tr>
              <td colSpan={5}>No hay buses para mostrar.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}