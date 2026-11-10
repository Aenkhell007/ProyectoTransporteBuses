import { useState, useEffect } from 'react';
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
import type { Bus, BusFormData } from '../../types/bus';
import { listarBuses, crearBus, actualizarBus, desactivarBus as desactivarBusApi } from '../../services/busesApi';
import { listarGruposBus } from '../../services/flotaApi';
import type { GrupoBus } from '../../types/bus';

const normalizarDatos = (datos: BusFormData) => ({
  unidad: datos.unidad.trim(),
  placa: datos.placa,
  chasis: datos.chasis.trim(),
  carroceria: datos.carroceria.trim(),
  grupo_id: datos.grupo_id,
  propietario: datos.propietario.trim(),
  correo_contacto: datos.correo_contacto.trim(),
});

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [verInactivos, setVerInactivos] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<GrupoBus[]>([]);

  const editando = buses.find((b) => b.id === editandoId);

  useEffect(() => {
    cargarBuses();
  }, []);

  const cargarBuses = async () => {
    try {
      setCargando(true);
      const [activos, inactivos, gruposReales] = await Promise.all([
        listarBuses(true),
        listarBuses(false),
        listarGruposBus(),
      ]);
      
      setBuses([...activos, ...inactivos]);
      setGrupos(gruposReales);
      setError(null);
    } catch (err) {
      setError('Error al cargar la lista de buses desde el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const agregar = async (datos: BusFormData) => {
    try {
      const nuevo = await crearBus(normalizarDatos(datos));
      setBuses((anteriores) => [...anteriores, nuevo]);
    } catch (err) {
      alert('Error al registrar el bus. Verifica que la placa o unidad no estén duplicadas.');
    }
  };

  const guardarEdicion = async (datos: BusFormData) => {
    if (!editandoId) return;
    try {
      const actualizado = await actualizarBus(editandoId, normalizarDatos(datos));
      setBuses((anteriores) =>
        anteriores.map((b) => (b.id === editandoId ? actualizado : b))
      );
      setEditandoId(null);
    } catch (err) {
      alert('Error al actualizar los datos del bus en el servidor.');
    }
  };

  const desactivar = async (id: string) => {
    try {
      await desactivarBusApi(id);
      setBuses((anteriores) =>
        anteriores.map((b) => (b.id === id ? { ...b, activo: false } : b))
      );
      if (editandoId === id) setEditandoId(null);
    } catch (err) {
      alert('Error al desactivar el bus. Podría tener viajes asociados.');
    }
  };

  const visibles = buses.filter((b) => b.activo !== verInactivos);
  const nombreGrupo = (id: string) => grupos.find((g) => g.id === id)?.nombre ?? '—';

  return (
    <div className={tarjeta}>
      <h2 className={titulo}>Buses de la cooperativa</h2>
      {editando && <h3 className={subtitulo}>Editando el bus de la unidad {editando.unidad}</h3>}
      
      <div className="mt-4">
        <BusForm
          key={editando?.id ?? 'nuevo'}
          grupos={grupos}
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

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {cargando ? (
        <p className="mt-4 text-sm text-slate-600" role="status">Cargando buses...</p>
      ) : (
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
      )}
    </div>
  );
}
