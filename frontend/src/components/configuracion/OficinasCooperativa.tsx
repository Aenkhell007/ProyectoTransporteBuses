import { useState, type FormEvent } from 'react';
import { IconoBiblioteca } from '../ui/IconoBiblioteca';
import type { OficinaCooperativa } from '../../features/flota/editorApi';
import { botonConfiguracion, entradaConfiguracion, guardarConfiguracion } from './EditorConfiguracionGlobal';

interface Props {
  inicial: OficinaCooperativa[];
  onCrear: (datos: { nombre: string; direccion: string; telefono: string; activa: boolean }) => Promise<{ oficina: OficinaCooperativa; mensaje: string }>;
  onActualizar: (id: string, datos: { nombre: string; direccion: string; telefono: string; activa: boolean }) => Promise<{ oficina: OficinaCooperativa; mensaje: string }>;
}

export default function OficinasCooperativa({ inicial, onCrear, onActualizar }: Props) {
  const [oficinas, setOficinas] = useState<OficinaCooperativa[]>(inicial);
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [activa, setActiva] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  function limpiar() {
    setEditId(null);
    setNombre('');
    setDireccion('');
    setTelefono('');
    setActiva(true);
    setError('');
  }

  function editar(o: OficinaCooperativa) {
    setEditId(o.id);
    setNombre(o.nombre);
    setDireccion(o.direccion);
    setTelefono(o.telefono ?? '');
    setActiva(o.activa);
    setError('');
    setMensaje('');
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMensaje('');
    if (!nombre.trim() || !direccion.trim()) {
      setError('Ingresa el nombre y la dirección de la oficina.');
      return;
    }
    setGuardando(true);
    try {
      const payload = { nombre: nombre.trim(), direccion: direccion.trim(), telefono: telefono.trim(), activa };
      if (editId) {
        const res = await onActualizar(editId, payload);
        setOficinas((prev) => prev.map((x) => (x.id === editId ? res.oficina : x)));
        setMensaje(res.mensaje);
      } else {
        const res = await onCrear(payload);
        setOficinas((prev) => [...prev, res.oficina].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
        setMensaje(res.mensaje);
      }
      limpiar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la oficina.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-blue-100 bg-white p-4 text-[#08035b] shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-blue-50 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#1002b4]">
            <IconoBiblioteca nombre="ubicacion" className="size-5" />
            Oficinas y agencias de venta
          </h2>
          <p className="text-xs text-slate-600">
            Registra las boleterías físicas desde donde atienden los oficinistas de esta cooperativa.
          </p>
        </div>
        <button type="button" className={botonConfiguracion} onClick={limpiar}>
          + Nueva oficina
        </button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div>
          {oficinas.length === 0 ? (
            <p className="rounded bg-blue-50/50 p-4 text-sm text-slate-600">
              No hay oficinas registradas todavía. Crea la matriz o primera agencia desde el formulario.
            </p>
          ) : (
            <ul className="divide-y divide-blue-50">
              {oficinas.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-bold">{o.nombre}</strong>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                          o.activa ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {o.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">{o.direccion}</p>
                    {o.telefono && <p className="text-xs text-blue-700">Tel: {o.telefono}</p>}
                  </div>
                  <button
                    type="button"
                    className={botonConfiguracion + ' inline-flex items-center gap-1.5'}
                    onClick={() => editar(o)}
                  >
                    <IconoBiblioteca nombre="editar" className="size-4" />
                    Editar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={guardar} className="space-y-3 rounded-md border border-blue-100 bg-blue-50/25 p-3.5">
          <h3 className="text-sm font-bold text-[#1002b4]">{editId ? 'Editar oficina' : 'Registrar nueva oficina'}</h3>
          <fieldset disabled={guardando} className="space-y-2.5">
            <label className="grid gap-1 text-xs font-medium">
              Nombre de la oficina *
              <input
                type="text"
                required
                maxLength={100}
                className={entradaConfiguracion}
                placeholder="Ej. Boletería Quitumbe"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Dirección *
              <input
                type="text"
                required
                maxLength={300}
                className={entradaConfiguracion}
                placeholder="Ej. Av. Mariscal Sucre, andén 4"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Teléfono (opcional)
              <input
                type="text"
                maxLength={25}
                className={entradaConfiguracion}
                placeholder="022345678"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 pt-1 text-xs">
              <input
                type="checkbox"
                className="size-4 accent-blue-700"
                checked={activa}
                onChange={(e) => setActiva(e.target.checked)}
              />
              Oficina activa
            </label>
            {error && <p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</p>}
            {mensaje && <p role="status" className="rounded bg-green-50 p-2 text-xs text-green-800">{mensaje}</p>}
            <div className="flex justify-end gap-2 pt-1">
              {editId && (
                <button type="button" className={botonConfiguracion} onClick={limpiar}>
                  Cancelar
                </button>
              )}
              <button type="submit" className={guardarConfiguracion + ' inline-flex items-center gap-1.5'}>
                <IconoBiblioteca nombre="guardar" className="size-4" />
                {guardando ? 'Guardando…' : editId ? 'Actualizar' : 'Agregar oficina'}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
