import { useState } from 'react';
import BusForm from '../../components/flota/BusForm';
import { busesMock, gruposMock } from '../../mocks/buses';
import type { Bus, BusFormData } from '../../types/bus';
import './buses.css';

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>(busesMock);
  const [verInactivos, setVerInactivos] = useState(false);

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

  // Desactivar, no borrar: el DELETE del contrato pone activo en false.
  const desactivar = (id: string) =>
    setBuses((anteriores) => anteriores.map((b) => (b.id === id ? { ...b, activo: false } : b)));

  const visibles = buses.filter((b) => b.activo !== verInactivos);
  const nombreGrupo = (id: string) => gruposMock.find((g) => g.id === id)?.nombre ?? '—';

  return (
    <div className="buses-page">
      <h2>Buses de la cooperativa (datos simulados)</h2>
      <BusForm grupos={gruposMock} existentes={buses} onGuardar={agregar} />
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
                  <button type="button" onClick={() => desactivar(b.id)}>
                    Desactivar
                  </button>
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