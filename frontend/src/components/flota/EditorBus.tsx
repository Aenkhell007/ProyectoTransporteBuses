import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { CeldaPlano, ClaseAsiento } from '../../types/plano';
import { validarPlano } from '../../utils/plano';
import { numerarPlanoComercial, plantillaEjecutivo } from '../../features/flota/plantillasPlano';
import SelectorAsientos from './SelectorAsientos';
import { BloqueConfiguracion, botonConfiguracion, entradaConfiguracion, guardarConfiguracion } from '../configuracion/EditorConfiguracionGlobal';

export interface BusEditorDatos {
  id?: string;
  version: number;
  unidad: string;
  placa: string;
  chasis: string;
  carroceria: string;
  correo: string;
  grupoId: string;
  propietario: string;
  activo: boolean;
  pisos: number;
  filas: number;
  celdas: CeldaPlano[];
  servicios: string[];
  fotos: { id: string; url: string; nombre: string }[];
  planoEnUso: boolean;
}
interface Catalogo { id: string; nombre: string }
interface Props {
  inicial: BusEditorDatos;
  grupos: Catalogo[];
  clases: ClaseAsiento[];
  chasis: string[];
  carrocerias: string[];
  servicios: Catalogo[];
  existentes: { id: string; unidad: string; placa: string }[];
  onGuardar?: (datos: BusEditorDatos, fotos: File[], crearVersion: boolean) => Promise<BusEditorDatos>;
}

function FotosNuevas({ archivos, onQuitar }: { archivos: File[]; onQuitar: (indice: number) => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { const nuevas = archivos.map(f => URL.createObjectURL(f)); setUrls(nuevas); return () => nuevas.forEach(url => URL.revokeObjectURL(url)); }, [archivos]);
  return <>{archivos.map((archivo, i) => <figure key={`${archivo.name}-${i}`} className="relative"><img src={urls[i]} alt={`Vista previa de ${archivo.name}`} className="h-24 w-full rounded-md object-cover" /><button type="button" aria-label={`Quitar foto ${archivo.name}`} onClick={() => onQuitar(i)} className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-white text-red-700">×</button><figcaption className="truncate text-xs">{archivo.name}</figcaption></figure>)}</>;
}

export default function EditorBus({ inicial, grupos, clases, chasis, carrocerias, servicios, existentes, onGuardar }: Props) {
  const [base, setBase] = useState(inicial);
  const [datos, setDatos] = useState(inicial);
  const [fotos, setFotos] = useState<File[]>([]);
  const [editandoPlano, setEditandoPlano] = useState(false);
  const [herramienta, setHerramienta] = useState('ASIENTO');
  const [claseId, setClaseId] = useState(clases[0]?.id ?? '');
  const [nuevaVersion, setNuevaVersion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [validandoFotos, setValidandoFotos] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [fotoError, setFotoError] = useState('');
  const generacionFotos = useRef(0);
  const cambiado = JSON.stringify(datos) !== JSON.stringify(base) || fotos.length > 0;
  const capacidad = datos.celdas.filter(c => c.tipo === 'ASIENTO').length;
  useEffect(() => () => { generacionFotos.current += 1; }, []);
  function cambiar<K extends keyof BusEditorDatos>(campo: K, valor: BusEditorDatos[K]) { setDatos(d => ({ ...d, [campo]: valor })); setMensaje(''); setErrores([]); }
  function cancelar() { generacionFotos.current += 1; setDatos(base); setFotos([]); setErrores([]); setFotoError(''); setValidandoFotos(false); setEditandoPlano(false); setNuevaVersion(false); setMensaje('Se restauraron los datos, fotos y plano originales.'); }
  async function agregarFotos(archivos: File[]) {
    if (!archivos.length) return;
    const turno = ++generacionFotos.current; setFotoError(''); setValidandoFotos(true);
    try {
      if (datos.fotos.length + fotos.length + archivos.length > 6) throw new Error('Se permiten hasta seis fotografías por bus.');
      for (const archivo of archivos) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || !archivo.size || archivo.size > 5 * 1024 * 1024) throw new Error('Usa JPG, PNG o WebP de hasta 5 MB por fotografía.');
        const imagen = await createImageBitmap(archivo); const valido = imagen.width <= 8192 && imagen.height <= 8192; imagen.close();
        if (!valido) throw new Error('Las fotografías no deben superar 8192 × 8192 píxeles.');
      }
      if (turno === generacionFotos.current) setFotos(actual => [...actual, ...archivos]);
    } catch (e) { if (turno === generacionFotos.current) setFotoError(e instanceof Error ? e.message : 'No se pudieron leer las fotografías.'); }
    finally { if (turno === generacionFotos.current) setValidandoFotos(false); }
  }
  function editarCelda(piso: number, fila: number, columna: number) {
    const resto = datos.celdas.filter(c => c.piso !== piso || c.fila !== fila || c.columna !== columna);
    const celdas = herramienta === 'BORRAR' ? resto : [...resto, { piso, fila, columna, tipo: herramienta as CeldaPlano['tipo'], codigo: null, clase_id: herramienta === 'ASIENTO' ? claseId : null }];
    cambiar('celdas', numerarPlanoComercial(celdas, datos.pisos));
  }
  async function guardar(evento: FormEvent) {
    evento.preventDefault(); if (guardando || validandoFotos) return;
    const fallos = validarPlano(datos.celdas, datos.pisos);
    if (!datos.unidad.trim() || !datos.chasis.trim() || !datos.carroceria.trim()) fallos.push('Unidad, chasis y carrocería son obligatorios.');
    if (!/^[A-Z]{3}-\d{4}$/.test(datos.placa.trim().toUpperCase())) fallos.push('La placa debe tener formato ABC-1234.');
    if (!grupos.some(g => g.id === datos.grupoId)) fallos.push('Selecciona un grupo disponible.');
    if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) fallos.push('Ingresa un correo de contacto válido.');
    if (existentes.some(b => b.id !== datos.id && (b.unidad.trim().toLowerCase() === datos.unidad.trim().toLowerCase() || b.placa.trim().toUpperCase() === datos.placa.trim().toUpperCase()))) fallos.push('La unidad o la placa ya están registradas.');
    if (datos.celdas.some(c => c.tipo === 'ASIENTO' && !clases.some(k => k.id === c.clase_id))) fallos.push('El plano tiene clases de asiento no disponibles.');
    if (base.planoEnUso && JSON.stringify(base.celdas) !== JSON.stringify(datos.celdas) && !nuevaVersion) fallos.push('El plano está en uso: crea una nueva versión para modificarlo.');
    setErrores(fallos); if (fallos.length) return;
    setGuardando(true);
    try {
      const payload = { ...datos, unidad: datos.unidad.trim(), placa: datos.placa.trim().toUpperCase(), version: base.version };
      if (onGuardar) { const respuesta = await onGuardar(payload, fotos, nuevaVersion); setBase(respuesta); setDatos(respuesta); setFotos([]); setNuevaVersion(false); setEditandoPlano(false); setMensaje('Bus guardado correctamente.'); }
      else setMensaje('Borrador validado. Los datos, las fotos y el plano no se enviaron al servidor.');
    } catch { setErrores(['No se pudo guardar el bus. Conservamos los cambios para reintentar.']); }
    finally { setGuardando(false); }
  }
  function campo(nombre: 'unidad' | 'placa' | 'correo' | 'propietario', texto: string, tipo = 'text') { return <label className="grid gap-1.5 text-sm">{texto}<input className={entradaConfiguracion} type={tipo} value={datos[nombre]} maxLength={120} onChange={e => cambiar(nombre, e.target.value)} /></label>; }
  function catalogo(nombre: 'chasis' | 'carroceria', texto: string, opciones: string[]) { return <label className="grid gap-1.5 text-sm">{texto}<input className={entradaConfiguracion} list={`catalogo-${nombre}`} value={datos[nombre]} onChange={e => cambiar(nombre, e.target.value)} /><datalist id={`catalogo-${nombre}`}>{opciones.map(o => <option key={o} value={o} />)}</datalist></label>; }
  return <form onSubmit={guardar} noValidate className="space-y-4 text-[#08035b]">
    <header><h1 className="text-2xl font-bold sm:text-3xl">Gestión de buses</h1><p className="mt-1 text-sm text-indigo-700">Administra la flota y la configuración de sus asientos.</p></header>
    {!onGuardar && <p className="rounded bg-amber-50 p-3 text-xs text-amber-900">Vista previa del editor · cambios locales. No modifica buses del servidor.</p>}
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-blue-50 p-3"><img src={`/images/compra/bus-${datos.pisos === 1 ? 'un-piso' : 'dos-pisos'}.webp`} alt="Ilustración del tipo de bus" className="h-14 w-20 rounded object-cover" /><div><h2 className="font-bold">{datos.unidad ? `Unidad ${datos.unidad}` : 'Nuevo bus'}</h2><p className="text-sm">{datos.placa || 'Placa pendiente'} · {datos.id ? 'Editando' : 'Registro de unidad'}</p></div><span className="ml-auto rounded-full bg-white px-3 py-1 text-sm">{datos.activo ? 'Activo' : 'Inactivo'}</span></div>
    <fieldset disabled={guardando} className="grid items-start gap-4 xl:grid-cols-2">
      <BloqueConfiguracion titulo="Datos del bus"><div className="grid gap-4 sm:grid-cols-2">{campo('unidad', 'Número de unidad *')}{campo('placa', 'Placa *')}{catalogo('chasis', 'Marca del chasis *', chasis)}{catalogo('carroceria', 'Carrocería *', carrocerias)}{campo('correo', 'Correo de contacto', 'email')}<label className="grid gap-1.5 text-sm">Grupo *<select className={entradaConfiguracion} value={datos.grupoId} onChange={e => cambiar('grupoId', e.target.value)}><option value="">Selecciona un grupo</option>{grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></label><label className="grid gap-1.5 text-sm">Estado<select className={entradaConfiguracion} value={String(datos.activo)} onChange={e => cambiar('activo', e.target.value === 'true')}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>{campo('propietario', 'Propietario (opcional)')}</div>
        <h3 className="mb-3 mt-5 font-bold">Fotografías del bus</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{datos.fotos.map(f => <figure key={f.id} className="relative"><img src={f.url} alt={f.nombre} className="h-24 w-full rounded object-cover" /><button type="button" className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-white text-red-700" aria-label={`Quitar foto ${f.nombre}`} onClick={() => cambiar('fotos', datos.fotos.filter(x => x.id !== f.id))}>×</button></figure>)}<FotosNuevas archivos={fotos} onQuitar={i => setFotos(actual => actual.filter((_, n) => n !== i))} /><label className="grid min-h-24 cursor-pointer place-items-center rounded-md border border-dashed border-blue-300 bg-blue-50 p-3 text-center text-sm">Subir fotos<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={validandoFotos} className="mt-2 block w-full text-xs" onChange={e => { void agregarFotos([...e.target.files ?? []]); e.target.value = ''; }} /></label></div><p className="mt-2 text-xs text-slate-500">JPG, PNG o WebP · máximo 5 MB por imagen · hasta 6 fotos.</p>{validandoFotos && <p role="status">Validando fotografías…</p>}{fotoError && <p role="alert" className="text-sm text-red-700">{fotoError}</p>}
        <h3 className="mb-3 mt-5 font-bold">Servicios y comodidades</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{servicios.map(s => <label key={s.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={datos.servicios.includes(s.id)} onChange={e => cambiar('servicios', e.target.checked ? [...datos.servicios, s.id] : datos.servicios.filter(id => id !== s.id))} />{s.nombre}</label>)}</div>
      </BloqueConfiguracion>
      <BloqueConfiguracion titulo="Distribución de asientos">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm">{datos.pisos} pisos · distribución 1 + 2</p><p className="mt-1 text-xs text-slate-500">La capacidad se obtiene de los asientos del plano.</p></div><strong className="rounded bg-blue-50 p-3 text-xl">{capacidad} <span className="text-xs font-normal">asientos</span></strong></div>
        {editandoPlano ? <div className="space-y-4"><div className="flex flex-wrap gap-2">{['ASIENTO', 'PASILLO', 'BLOQUE', 'BORRAR'].map(t => <button type="button" key={t} aria-pressed={herramienta === t} className={herramienta === t ? guardarConfiguracion : botonConfiguracion} onClick={() => setHerramienta(t)}>{t === 'ASIENTO' ? 'Asiento' : t === 'PASILLO' ? 'Pasillo' : t === 'BLOQUE' ? 'Bloque' : 'Borrar'}</button>)}</div><label className="grid gap-2 text-sm">Clase de asiento<select className={entradaConfiguracion} value={claseId} onChange={e => setClaseId(e.target.value)}>{clases.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: datos.pisos }, (_, i) => i + 1).map(piso => <div key={piso} className="rounded-3xl bg-slate-800 p-3 text-white"><h3 className="mb-3 text-center text-sm">Piso {piso}</h3><div className="grid grid-cols-4 gap-1">{Array.from({ length: datos.filas }, (_, i) => i + 1).flatMap(fila => [1, 2, 3, 4].map(columna => { const c = datos.celdas.find(c => c.piso === piso && c.fila === fila && c.columna === columna); return <button type="button" key={`${fila}-${columna}`} aria-label={`Editar piso ${piso}, fila ${fila}, columna ${columna}: ${c?.codigo ?? c?.tipo ?? 'vacío'}`} onClick={() => editarCelda(piso, fila, columna)} className={`min-h-11 rounded border text-xs ${c?.tipo === 'ASIENTO' ? 'border-green-400 bg-green-700' : c?.tipo === 'BLOQUE' ? 'border-slate-400 bg-slate-600' : 'border-dashed border-slate-500'}`}>{c?.tipo === 'ASIENTO' ? c.codigo : c?.tipo === 'PASILLO' ? '·' : c?.tipo === 'BLOQUE' ? '■' : '+'}</button>; }))}</div></div>)}</div>
          <button type="button" className={botonConfiguracion} onClick={() => setEditandoPlano(false)}>Ver vista previa del plano</button></div> : <SelectorAsientos mapa={{ planoId: datos.id ?? 'borrador', celdas: datos.celdas.map(c => ({ ...c, id: `${c.piso}-${c.fila}-${c.columna}`, clase: clases.find(k => k.id === c.clase_id)?.codigo ?? null, estado: 'DISPONIBLE' })) }} cantidad={0} seleccion={[]} onChange={() => {}} />}
        {!editandoPlano && <button type="button" className={`${botonConfiguracion} mt-4 w-full`} onClick={() => { setNuevaVersion(base.planoEnUso); setEditandoPlano(true); }}>{base.planoEnUso ? 'Crear nueva versión del plano' : 'Editar mapa de asientos'}</button>}
        {nuevaVersion && <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">El plano actual está en uso. Se enviará una versión nueva; los viajes existentes conservarán su plano.</p>}
        <button type="button" className="mt-3 min-h-11 text-sm underline" disabled={base.planoEnUso && !nuevaVersion} onClick={() => cambiar('celdas', plantillaEjecutivo(datos.filas, claseId))}>Restaurar plantilla de distribución</button>
      </BloqueConfiguracion>
    </fieldset>
    {errores.length > 0 && <div role="alert" className="rounded bg-red-50 p-4 text-sm text-red-800"><ul className="list-inside list-disc">{errores.map(e => <li key={e}>{e}</li>)}</ul></div>}{mensaje && <p role="status" className="text-sm text-green-800">{mensaje}</p>}
    <footer className="flex flex-wrap justify-end gap-3 border-t border-indigo-100 pt-4"><button type="button" disabled={guardando || (!cambiado && !editandoPlano && !fotoError)} className={botonConfiguracion} onClick={cancelar}>Cancelar</button><button type="submit" className={guardarConfiguracion} disabled={guardando || validandoFotos || !cambiado}>{guardando ? 'Guardando…' : onGuardar ? 'Guardar cambios' : 'Validar borrador'}</button></footer>
  </form>;
}
