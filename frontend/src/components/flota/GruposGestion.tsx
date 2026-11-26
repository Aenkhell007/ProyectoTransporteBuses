import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { IconoBiblioteca } from '../ui/IconoBiblioteca';
import type { GrupoCooperativa } from '../../features/flota/editorApi';
import { botonConfiguracion, entradaConfiguracion, guardarConfiguracion } from '../configuracion/EditorConfiguracionGlobal';

interface Props {
  cooperativaId: string;
  inicial: GrupoCooperativa[];
  onCrear: (datos: { nombre: string; descripcion: string; activo: boolean }) => Promise<{ grupo: GrupoCooperativa; mensaje: string }>;
  onActualizar: (id: string, datos: { nombre: string; descripcion: string; activo: boolean }) => Promise<{ grupo: GrupoCooperativa; mensaje: string }>;
}

export default function GruposGestion({ cooperativaId, inicial, onCrear, onActualizar }: Props) {
  const [grupos, setGrupos] = useState<GrupoCooperativa[]>(inicial);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  function limpiar() {
    setEditId(null);
    setNombre('');
    setDescripcion('');
    setActivo(true);
    setError('');
  }

  function cargarEdicion(g: GrupoCooperativa) {
    setEditId(g.id);
    setNombre(g.nombre);
    setDescripcion(g.descripcion ?? '');
    setActivo(g.activo);
    setError('');
    setMensaje('');
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMensaje('');
    if (!nombre.trim()) {
      setError('Ingresa el nombre del grupo de buses.');
      return;
    }
    setGuardando(true);
    try {
      const payload = { nombre: nombre.trim(), descripcion: descripcion.trim(), activo };
      if (editId) {
        const res = await onActualizar(editId, payload);
        setGrupos((prev) => prev.map((x) => (x.id === editId ? { ...x, ...res.grupo } : x)));
        setMensaje(res.mensaje);
      } else {
        const res = await onCrear(payload);
        setGrupos((prev) => [...prev, res.grupo].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        setMensaje(res.mensaje);
      }
      limpiar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el grupo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-5 py-4 text-[#08035b]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Grupos de buses</h1>
          <p className="mt-1 text-sm text-indigo-700">
            Administra los grupos de tu flota (por ejemplo Normal o Ejecutivo VIP). Cada frecuencia y cada bus pertenecen a un grupo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={botonConfiguracion + ' inline-flex items-center gap-2 no-underline'}
            to={`/cooperativa/buses?cooperativaId=${encodeURIComponent(cooperativaId)}`}
          >
            <IconoBiblioteca nombre="bus" className="size-4" />
            Ver buses
          </Link>
          <Link
            className={botonConfiguracion + ' inline-flex items-center gap-2 no-underline'}
            to={`/cooperativa/frecuencias?cooperativaId=${encodeURIComponent(cooperativaId)}`}
          >
            <IconoBiblioteca nombre="calendario" className="size-4" />
            Ir a frecuencias
          </Link>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-blue-50 pb-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#1002b4]">
              <IconoBiblioteca nombre="grupo" className="size-5" />
              Grupos registrados ({grupos.length})
            </h2>
            <button type="button" className={botonConfiguracion} onClick={limpiar}>
              + Nuevo grupo
            </button>
          </div>

          {grupos.length === 0 ? (
            <p className="py-4 text-sm text-slate-600">
              Todavía no tienes grupos registrados. Crea el primero desde el formulario.
            </p>
          ) : (
            <ul className="divide-y divide-blue-50">
              {grupos.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-base">{g.nombre}</strong>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          g.activo ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {g.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {g.descripcion && <p className="mt-0.5 text-xs text-slate-600">{g.descripcion}</p>}
                    {(g.buses !== undefined || g.frecuencias !== undefined) && (
                      <p className="mt-1 text-xs text-blue-700">
                        {g.buses ?? 0} buses · {g.frecuencias ?? 0} frecuencias
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={botonConfiguracion + ' inline-flex items-center gap-1.5'}
                    onClick={() => cargarEdicion(g)}
                  >
                    <IconoBiblioteca nombre="editar" className="size-4" />
                    Editar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={guardar} className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 border-b border-blue-50 pb-2 text-lg font-bold text-[#1002b4]">
            <IconoBiblioteca nombre={editId ? 'editar' : 'mas'} className="size-5" />
            {editId ? 'Editar grupo' : 'Nuevo grupo'}
          </h2>
          <fieldset disabled={guardando} className="space-y-3">
            <label className="grid gap-1.5 text-sm">
              Nombre del grupo *
              <input
                type="text"
                required
                maxLength={100}
                className={entradaConfiguracion}
                placeholder="Ej. Ejecutivo VIP"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Descripción (opcional)
              <textarea
                rows={3}
                maxLength={500}
                className={entradaConfiguracion}
                placeholder="Características de las unidades de este grupo"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2.5 pt-1 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-blue-700"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />
              Grupo activo para asignar buses y frecuencias
            </label>

            {error && (
              <p role="alert" className="rounded bg-red-50 p-2.5 text-xs text-red-700">
                {error}
              </p>
            )}
            {mensaje && (
              <p role="status" className="rounded bg-green-50 p-2.5 text-xs text-green-800">
                {mensaje}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {editId && (
                <button type="button" className={botonConfiguracion} onClick={limpiar}>
                  Cancelar
                </button>
              )}
              <button type="submit" className={guardarConfiguracion + ' inline-flex items-center gap-1.5'}>
                <IconoBiblioteca nombre="guardar" className="size-4" />
                {guardando ? 'Guardando…' : editId ? 'Actualizar grupo' : 'Crear grupo'}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
