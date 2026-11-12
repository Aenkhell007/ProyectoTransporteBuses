import { Link } from 'react-router';
import { IconoConfiguracion } from '../configuracion/ConfiguracionCooperativaTabs';
import { useState } from 'react';
import { botonConfiguracion, guardarConfiguracion, entradaConfiguracion } from '../configuracion/EditorConfiguracionGlobal';

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
  const [grupoId, setGrupoId] = useState<string | null>(inicial.grupoIds[0] ?? grupos[0]?.id ?? null);
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
    <header><h1 className="text-2xl font-bold sm:text-3xl">Gestión de frecuencias</h1><p className="mt-1 text-sm text-indigo-700">Registra frecuencias autorizadas y sus paradas.</p></header>
    {!onGuardar && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Vista previa con datos de ejemplo. Los cambios se conservan en esta pantalla; integración con el servidor pendiente.</p>}
    <div role="tablist" aria-label="Frecuencias y compatibilidades" className="flex border-b border-indigo-100">{[['frecuencias', 'Frecuencias'], ['grupos', 'Grupos habilitados']].map(([id, nombre]) => <button key={id} type="button" role="tab" id={'tab-' + id} aria-controls={'panel-' + id} aria-selected={tab === id} onClick={() => setTab(id)} className={'min-h-12 px-5 text-sm ' + (tab === id ? 'border-b-2 border-blue-600 font-bold' : '')}>{nombre}</button>)}</div>
    <div role="tabpanel" id="panel-frecuencias" aria-labelledby="tab-frecuencias" hidden={tab !== 'frecuencias'} className="space-y-3">
      {frecuencias.map(f => <article key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 p-4"><div><h2 className="font-bold">{f.codigo} · {f.origen} → {f.destino}</h2><p className="mt-1 text-sm">{f.hora} · {f.activa ? 'Activa' : 'Inactiva'}</p></div><button type="button" className={botonConfiguracion} disabled={modificado || guardando} onClick={() => { const ids = grupos.filter(g => g.frecuenciaIds.includes(f.id)).map(g => g.id); const siguiente = confirmados[f.id] ?? { version: inicial.version, frecuenciaId: f.id, grupoIds: ids }; setDatos(siguiente); setBase(siguiente); setTab('grupos'); setGrupoId(null); setMensaje(''); setError(''); setRevisado(false); }}>Ver grupos</button></article>)}
      {frecuencias.length === 0 && <p>No hay frecuencias disponibles.</p>}
      {modificado && <p role="status" className="text-sm text-amber-900">Confirma o cancela los cambios antes de abrir otra frecuencia.</p>}

    </div>
    <div role="tabpanel" id="panel-grupos" aria-labelledby="tab-grupos" hidden={tab !== 'grupos'} className="space-y-4">
      {frecuencia ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-gradient-to-r from-sky-100 to-blue-50 p-4"><strong className="flex flex-wrap items-center gap-3 text-lg sm:text-xl"><IconoConfiguracion nombre="bus" className="h-8 w-8"/>{frecuencia.codigo}<span aria-hidden="true">·</span>{frecuencia.origen} → {frecuencia.destino}<span aria-hidden="true">·</span>{frecuencia.hora}</strong><span className={'rounded-full px-4 py-1.5 text-sm ' + (frecuencia.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>● {frecuencia.activa ? 'Activa' : 'Inactiva'}</span></div> : <p role="alert">Selecciona una frecuencia válida.</p>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-lg border border-blue-100 p-4 sm:p-5"><h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><IconoConfiguracion nombre="personas"/>Grupos compatibles</h2>
          <div className="mb-4 flex flex-wrap gap-3"><label className="relative min-w-40 flex-1"><span className="sr-only">Buscar grupo por nombre</span><IconoConfiguracion nombre="lupa" className="absolute left-3 top-3 h-5 w-5 text-indigo-400"/><input type="search" placeholder="Buscar grupo por nombre" className={entradaConfiguracion + ' pl-10'} value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label><Link to="/vista-previa/cooperativa/grupos" className={botonConfiguracion + ' inline-flex items-center gap-2'}><IconoConfiguracion nombre="ajustes" className="h-5 w-5"/>Gestionar grupos</Link></div>
          <div className="overflow-x-auto rounded-lg border border-blue-100"><table className="w-full text-left text-sm"><thead className="bg-sky-100/80"><tr><th className="p-3"><span className="sr-only">Habilitar</span></th><th className="py-4 pr-3">Grupo</th><th className="hidden py-4 pr-3 sm:table-cell">Buses miembros</th><th className="py-4 pr-3">Habilitación</th><th className="p-3"><span className="sr-only">Detalle</span></th></tr></thead><tbody>{visibles.map(g => <tr key={g.id} className={'border-t border-blue-100 ' + (grupoId === g.id ? 'bg-sky-100/80' : '')}><td className="p-3"><input aria-label={'Habilitar ' + g.nombre} type="checkbox" className="h-5 w-5 accent-blue-600" checked={datos.grupoIds.includes(g.id)} disabled={guardando || !frecuencia?.activa || (!g.activo && !datos.grupoIds.includes(g.id))} onChange={() => { alternar(g.id); setGrupoId(g.id); }} /></td><th scope="row" className="py-5 pr-3">{g.nombre}<small className="block font-normal sm:hidden">{g.buses.filter(b => b.activo).length} buses</small>{!g.activo && <small className="block font-normal text-red-700">Grupo inactivo</small>}</th><td className="hidden pr-3 sm:table-cell">{g.buses.filter(b => b.activo).length} buses</td><td className="pr-2 text-xs sm:whitespace-nowrap sm:pr-3 sm:text-sm"><span className={datos.grupoIds.includes(g.id) ? 'text-green-700' : 'text-slate-500'}>●</span> {datos.grupoIds.includes(g.id) ? 'Habilitado' : 'No habilitado'}</td><td className="pr-2"><button type="button" aria-label={'Ver detalle de ' + g.nombre} className="min-h-11 min-w-9 rounded text-xl text-blue-700 hover:bg-blue-100" onClick={() => setGrupoId(g.id)}>›</button></td></tr>)}</tbody></table></div>
          {visibles.length === 0 && <p className="py-4 text-sm text-slate-500">No se encontraron grupos.</p>}
        </section>
        <section className="min-w-0 rounded-lg border border-blue-100 p-4 sm:p-5"><h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><IconoConfiguracion nombre="personas"/>Detalle del grupo seleccionado</h2>
          {grupo ? <div className="space-y-5 text-sm"><dl className="space-y-4"><div><dt className="mb-2">Nombre del grupo</dt><dd className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2.5">{grupo.nombre}</dd></div><div><dt className="mb-2">Descripción</dt><dd className="min-h-20 rounded-md border border-blue-100 bg-blue-50 px-3 py-2.5">{grupo.descripcion}</dd></div><div><dt className="mb-2">Estado del catálogo</dt><dd className="flex items-center gap-2"><span aria-hidden="true" className={'flex h-7 w-12 items-center rounded-full px-1 ' + (grupo.activo ? 'justify-end bg-green-700' : 'bg-slate-400')}><span className="h-5 w-5 rounded-full bg-white"/></span>{grupo.activo ? 'Activo' : 'Inactivo'}<span className="text-xs text-slate-500">Solo consulta</span></dd></div></dl><div><h3 className="mb-3 font-bold">Buses del grupo · {grupo.buses.length}</h3><ul className="flex flex-wrap gap-2">{grupo.buses.map(b => <li key={b.id} className="rounded-lg bg-sky-100 px-3 py-2">Unidad {b.unidad}{!b.activo && ' · Inactiva'}</li>)}</ul>{grupo.buses.length === 0 && <p className="text-slate-500">Este grupo aún no tiene buses.</p>}</div><div><h3 className="mb-3 font-bold">Frecuencias compatibles</h3><ul className="flex flex-wrap gap-2">{frecuencias.filter(f => f.id === datos.frecuenciaId ? datos.grupoIds.includes(grupo.id) : (confirmados[f.id]?.grupoIds.includes(grupo.id) ?? grupo.frecuenciaIds.includes(f.id))).map(f => <li key={f.id} className="rounded-lg bg-sky-100 px-3 py-2">{f.origen} → {f.destino}</li>)}</ul></div></div> : <p className="text-sm text-slate-500">Selecciona un grupo para consultar sus buses y frecuencias.</p>}
        </section>
      </div>
      <p className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 text-sm leading-6"><IconoConfiguracion nombre="info" className="h-7 w-7 shrink-0 text-blue-600"/>Solo los grupos habilitados podrán asignarse a esta frecuencia en la hoja de ruta.<br/>Los cambios no modifican viajes ya publicados.</p>
      {modificado && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={revisado} disabled={guardando} onChange={e => setRevisado(e.target.checked)} className="h-4 w-4 accent-blue-600"/>He revisado los cambios: {base.grupoIds.length} grupos antes, {datos.grupoIds.length} habilitados al guardar.</label>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{mensaje && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-800">{mensaje}</p>}
      <footer className="flex flex-wrap justify-end gap-3"><button type="button" className={botonConfiguracion} disabled={!modificado || guardando} onClick={() => { setDatos(base); setRevisado(false); setError(''); setMensaje('Se restauraron las compatibilidades.'); }}>Cancelar</button><button type="button" className={guardarConfiguracion + ' inline-flex items-center gap-2'} disabled={!modificado || !revisado || guardando || !frecuencia?.activa} onClick={() => void guardar()}><IconoConfiguracion nombre="guardar" className="h-5 w-5"/>{guardando ? 'Guardando…' : 'Guardar compatibilidades'}</button></footer>
    </div>
  </section>;
}
