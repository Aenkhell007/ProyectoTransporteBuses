import { useState } from 'react';
import { BloqueConfiguracion, botonConfiguracion, guardarConfiguracion, entradaConfiguracion } from '../configuracion/EditorConfiguracionGlobal';

export interface GrupoCompatible {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  buses: { id: string; unidad: string; activo: boolean }[];
  frecuenciaIds: string[];
}
export interface FrecuenciaCompatible { id: string; codigo: string; origen: string; destino: string; hora: string; activa: boolean }
export interface CompatibilidadGrupos { version: number; frecuenciaId: string; grupoIds: string[] }

interface Props {
  grupos: GrupoCompatible[];
  frecuencias: FrecuenciaCompatible[];
  inicial: CompatibilidadGrupos;
  onGuardar?: (datos: CompatibilidadGrupos) => Promise<CompatibilidadGrupos>;
}

export default function GruposHabilitadosEditor({ grupos, frecuencias, inicial, onGuardar }: Props) {
  const [base, setBase] = useState(inicial);
  const [confirmados, setConfirmados] = useState<Record<string, CompatibilidadGrupos>>({ [inicial.frecuenciaId]: inicial });
  const [datos, setDatos] = useState(inicial);
  const [busqueda, setBusqueda] = useState('');
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [tab, setTab] = useState('grupos');
  const [revisado, setRevisado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const frecuencia = frecuencias.find(f => f.id === datos.frecuenciaId);
  const grupo = grupos.find(g => g.id === grupoId);
  const modificado = JSON.stringify([...datos.grupoIds].sort()) !== JSON.stringify([...base.grupoIds].sort());
  const visibles = grupos.filter(g => `${g.nombre} ${g.descripcion}`.toLocaleLowerCase().includes(busqueda.trim().toLocaleLowerCase()));
  function alternar(id: string) {
    setDatos(d => ({ ...d, grupoIds: d.grupoIds.includes(id) ? d.grupoIds.filter(g => g !== id) : [...d.grupoIds, id] }));
    setRevisado(false); setMensaje(''); setError('');
  }
  async function guardar() {
    if (!modificado || !revisado || !frecuencia?.activa || guardando) return;
    setGuardando(true); setError('');
    try {
      const respuesta = onGuardar ? await onGuardar({ ...datos, version: base.version }) : { ...datos };
      setBase(respuesta); setDatos(respuesta); setRevisado(false);
      setConfirmados(actual => ({ ...actual, [respuesta.frecuenciaId]: respuesta }));
      setMensaje(onGuardar ? 'Compatibilidades guardadas.' : 'Borrador de compatibilidades confirmado en esta vista. No se publicó en el servidor.');
    } catch { setError('No se pudo guardar. Conservamos tu selección para reintentar; puede ser necesario actualizar la versión.'); }
    finally { setGuardando(false); }
  }
  return <section className="space-y-4 text-[#08035b]">
    <header><h1 className="text-2xl font-bold sm:text-3xl">Gestión de frecuencias</h1><p className="mt-1 text-sm text-indigo-700">Registro de frecuencias autorizadas y sus paradas.</p></header>
    {!onGuardar && <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">Vista previa: datos de ejemplo y cambios en memoria. Integración con el servidor pendiente.</p>}
    <div role="tablist" aria-label="Frecuencias y compatibilidades" className="flex border-b border-indigo-100">{[['frecuencias', 'Frecuencias'], ['grupos', 'Grupos habilitados']].map(([id, nombre]) => <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-11 px-5 text-sm ${tab === id ? 'border-b-2 border-blue-600 font-bold' : ''}`}>{nombre}</button>)}</div>
    <div role="tabpanel" id="panel-frecuencias" aria-labelledby="tab-frecuencias" hidden={tab !== 'frecuencias'} className="space-y-3">
      {frecuencias.map(f => <article key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 p-4"><div><h2 className="font-bold">{f.codigo} · {f.origen} → {f.destino}</h2><p className="mt-1 text-sm">{f.hora} · {f.activa ? 'Activa' : 'Inactiva'}</p></div><button type="button" className={botonConfiguracion} disabled={modificado || guardando} onClick={() => { const ids = grupos.filter(g => g.frecuenciaIds.includes(f.id)).map(g => g.id); const siguiente = confirmados[f.id] ?? { version: inicial.version, frecuenciaId: f.id, grupoIds: ids }; setDatos(siguiente); setBase(siguiente); setTab('grupos'); setGrupoId(null); setMensaje(''); setError(''); setRevisado(false); }}>Ver grupos</button></article>)}
      {frecuencias.length === 0 && <p>No hay frecuencias disponibles.</p>}
      {modificado && <p role="status" className="text-sm text-amber-900">Confirma o cancela los cambios antes de abrir otra frecuencia.</p>}
    </div>
    <div role="tabpanel" id="panel-grupos" aria-labelledby="tab-grupos" hidden={tab !== 'grupos'} className="space-y-4">
      {frecuencia ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-blue-50 p-4"><strong>{frecuencia.codigo} · {frecuencia.origen} → {frecuencia.destino} · {frecuencia.hora}</strong><span className={`rounded-full px-3 py-1 text-sm ${frecuencia.activa ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>{frecuencia.activa ? 'Activa' : 'Inactiva'}</span></div> : <p role="alert">Selecciona una frecuencia válida.</p>}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <BloqueConfiguracion titulo="Grupos compatibles">
          <label className="grid gap-2 text-sm">Buscar grupo por nombre<input type="search" className={entradaConfiguracion} value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
          <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-blue-50"><tr><th className="p-2">Habilitar</th><th className="p-2">Grupo</th><th className="p-2">Buses miembros</th><th className="p-2">Detalle</th></tr></thead><tbody>{visibles.map(g => <tr key={g.id} className="border-b border-indigo-100"><td className="p-2"><input aria-label={`Habilitar ${g.nombre}`} type="checkbox" checked={datos.grupoIds.includes(g.id)} disabled={guardando || !frecuencia?.activa || (!g.activo && !datos.grupoIds.includes(g.id))} onChange={() => alternar(g.id)} /></td><th scope="row" className="p-2">{g.nombre}{!g.activo && <small className="block text-red-700">Grupo inactivo</small>}</th><td className="p-2">{g.buses.filter(b => b.activo).length} buses activos</td><td><button type="button" aria-label={`Ver detalle de ${g.nombre}`} className={`${botonConfiguracion} px-2`} onClick={() => setGrupoId(g.id)}>Ver →</button></td></tr>)}</tbody></table></div>
          {visibles.length === 0 && <p className="py-4 text-sm text-slate-500">No se encontraron grupos.</p>}
        </BloqueConfiguracion>
        <BloqueConfiguracion titulo="Detalle del grupo seleccionado">
          {grupo ? <div className="space-y-4 text-sm"><dl className="space-y-2"><div><dt className="text-slate-500">Nombre del grupo</dt><dd className="font-semibold">{grupo.nombre}</dd></div><div><dt className="text-slate-500">Descripción</dt><dd>{grupo.descripcion}</dd></div><div><dt className="text-slate-500">Estado del catálogo</dt><dd>{grupo.activo ? 'Activo' : 'Inactivo'}</dd></div></dl><h3 className="font-bold">Buses del grupo</h3><ul className="flex flex-wrap gap-2">{grupo.buses.map(b => <li key={b.id} className="rounded bg-blue-50 px-2 py-1">Unidad {b.unidad}{!b.activo && ' · Inactiva'}</li>)}</ul>{grupo.buses.length === 0 && <p>Este grupo aún no tiene buses.</p>}<h3 className="font-bold">Frecuencias compatibles</h3><ul className="space-y-2">{frecuencias.filter(f => f.id === datos.frecuenciaId ? datos.grupoIds.includes(grupo.id) : grupo.frecuenciaIds.includes(f.id)).map(f => <li key={f.id} className="rounded bg-blue-50 p-2">{f.codigo} · {f.origen} → {f.destino}</li>)}</ul></div> : <p className="text-sm text-slate-500">Selecciona un grupo para consultar sus buses y frecuencias.</p>}
        </BloqueConfiguracion>
      </div>
      <p className="rounded-md bg-blue-50 p-3 text-sm">Solo los grupos habilitados podrán utilizar esta frecuencia. El cambio no elimina viajes publicados ni aumenta la capacidad de los buses.</p>
      {modificado && <button type="button" className={botonConfiguracion} disabled={guardando} onClick={() => setRevisado(true)}>Revisar cambios</button>}
      {revisado && <p role="status" className="rounded bg-amber-50 p-3 text-sm">Grupos antes: {base.grupoIds.length}. Grupos habilitados tras confirmar: {datos.grupoIds.length}. Se conserva el historial de viajes.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{mensaje && <p role="status" className="text-sm text-green-800">{mensaje}</p>}
      <footer className="flex flex-wrap justify-end gap-3 border-t border-indigo-100 pt-4"><button type="button" className={botonConfiguracion} disabled={!modificado || guardando} onClick={() => { setDatos(base); setRevisado(false); setError(''); setMensaje('Se restauraron las compatibilidades.'); }}>Cancelar</button><button type="button" className={guardarConfiguracion} disabled={!modificado || !revisado || guardando || !frecuencia?.activa} onClick={() => void guardar()}>{guardando ? 'Guardando…' : onGuardar ? 'Guardar compatibilidades' : 'Confirmar borrador'}</button></footer>
    </div>
  </section>;
}
