import { useState } from 'react';
import BusForm from '../../components/flota/BusForm';
import { busesMock, gruposMock } from '../../mocks/buses';
import type { Bus, BusFormData } from '../../types/bus';
import './buses.css';

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>(busesMock);
  const [verInactivos, setVerInactivos] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const editando = buses.find((b) => b.id === editandoId);

  const agregar = (datos: BusFormData) => {
    const nuevo: Bus = {
      id: crypto.randomUUID(),
      unidad: datos.unidad.trim(),
      placa: datos.placa,
      chasis: datos.chasis.trim(),
      carroceria: datos.carroceria.trim(),
      grupo_id: datos.grupo_id,
      propietario: datos.propietario.trim() || null,
      correo_contacto: datos.correo_contacto.trim() || null,
      activo: true,
    };
    setBuses((anteriores) => [...anteriores, nuevo]);
  };

  // PUT /buses/:id: actualiza los datos del bus; el estado activo no cambia aquí.
  const guardarEdicion = (datos: BusFormData) => {
    setBuses((anteriores) =>
      anteriores.map((b) =>
        b.id === editandoId
          ? {
              ...b,
              unidad: datos.unidad.trim(),
              placa: datos.placa,
              chasis: datos.chasis.trim(),
              carroceria: datos.carroceria.trim(),
              grupo_id: datos.grupo_id,
              propietario: datos.propietario.trim() || null,
              correo_contacto: datos.correo_contacto.trim() || null,
            }
          : b,
      ),
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