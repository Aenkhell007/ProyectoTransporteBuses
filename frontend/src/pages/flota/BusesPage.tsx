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
import { gruposMock } from '../../mocks/buses';
import type { Bus, BusFormData } from '../../types/bus';
import { listarBuses, crearBus, actualizarBus, desactivarBus as desactivarBusApi } from '../../services/busesApi';

// Función auxiliar para centralizar la limpieza de datos
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
  const [buses, setBuses] = useState<Bus[]>([]);
  const [verInactivos, setVerInactivos] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  // Estados para la carga asíncrona
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const editando = buses.find((b) => b.id === editandoId);

  // Hook para cargar datos al montar el componente
  useEffect(() => {
    cargarBuses();
  }, []);

  const cargarBuses = async () => {
    try {
      setCargando(true);
      // Hacemos dos peticiones para traer tanto activos como inactivos
      // y que el filtro local del checkbox funcione correctamente
      const activos = await listarBuses(true);
      const inactivos = await listarBuses(false);
      
      setBuses([...activos, ...inactivos]);
      setError(null);
    } catch (err) {
      setError('Error al cargar la lista de buses desde el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const agregar = async (datos: BusFormData) => {
    try {
      // El backend genera el ID, solo enviamos los datos limpios
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
  const nombreGrupo = (id: string) => gruposMock.find((g) => g.id === id)?.nombre ?? '—';

  return (
    <div className={tarjeta}>
      <h2 className={titulo}>Buses de la cooperativa</h2>
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

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {cargando ? (
        <p className="mt-4 text-sm text-slate-600" role="status">Cargando buses...</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className={tabla}>
            <thead>