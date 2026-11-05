import { useState } from 'react';
import BusForm from '../../components/flota/BusForm';
import {
  botonAlerta,
  botonSecundario,
  celdaTabla,
  encabezadoTabla,
  insigniaActiva,
  insigniaInactiva,
  subtitulo,
  tabla,
  tarjeta,
  titulo,
} from '../../components/flota/estilos';
import { busesMock, gruposMock } from '../../mocks/buses';
import type { Bus, BusFormData } from '../../types/bus';

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
    <div className={tarjeta}>
      <h2 className={titulo}>Buses de la cooperativa (datos simulados)</h2>
      {editando && <h3 className={subtitulo}>Editando el bus de la unidad {editando.unidad}</h3>}
      <div className="mt-4">
        <BusForm
          key={editando?.id ?? 'nuevo'}
          grupos={gruposMock}
          existentes={buses}
          onGuardar={editando ? guardarEdicion : agregar}
          bus={editando}
          onCancelar={() => setEditandoId(null)}
        />
      </div>
      <label className="mt-6 flex items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={verInactivos}
          onChange={(e) => setVerInactivos(e.target.checked)}
        />
        Ver desactivados
      </label>
      <div className="mt-3 overflow-x-auto">
        <table className={tabla}>
          <thead>
            <tr>
              <th className={encabezadoTabla}>Unidad</th>
              <th className={encabezadoTabla}>Placa</th>
              <th className={encabezadoTabla}>Grupo</th>
              <th className={encabezadoTabla}>Estado</th>
              <th className={encabezadoTabla}></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((b) => (
              <tr key={b.id}>
                <td className={celdaTabla}>{b.unidad}</td>
                <td className={celdaTabla}>{b.placa}</td>
                <td className={celdaTabla}>{nombreGrupo(b.grupo_id)}</td>
                <td className={celdaTabla}>
                  <span className={b.activo ? insigniaActiva : insigniaInactiva}>
                    {b.activo ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td className={celdaTabla}>
                  {b.activo && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={botonSecundario} onClick={() => setEditandoId(b.id)}>
                        Editar
                      </button>
                      <button type="button" className={botonAlerta} onClick={() => desactivar(b.id)}>
                        Desactivar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td className={celdaTabla} colSpan={5}>
                  No hay buses para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}