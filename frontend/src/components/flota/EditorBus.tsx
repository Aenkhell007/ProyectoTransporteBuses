import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { IconoBiblioteca } from '../ui/IconoBiblioteca';
import type { CeldaPlano, ClaseAsiento } from '../../types/plano';
import { validarPlano } from '../../utils/plano';
import {
  aplicarPuertasEnPlano,
  columnasBanoParaClick,
  columnasPuertaParaClick,
  detectarBanos,
  detectarPuertas,
  numerarPlanoComercial,
  plantillaEjecutivo,
  plantillaNormal,
} from '../../features/flota/plantillasPlano';
import { ComboBusqueda } from '../ui/ComboBusqueda';
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
  ambitoOperacion?: 'INTERPROVINCIAL' | 'URBANA' | 'RURAL';
  clases: ClaseAsiento[];
  chasis: string[];
  carrocerias: string[];
  servicios: Catalogo[];
  existentes: { id: string; unidad: string; placa: string }[];
  volverHref?: string;
  onGuardar?: (datos: BusEditorDatos, fotos: File[], crearVersion: boolean) => Promise<BusEditorDatos>;
}

function FotosNuevas({ archivos, onQuitar }: { archivos: File[]; onQuitar: (indice: number) => void }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => { const nuevas = archivos.map(f => URL.createObjectURL(f)); setUrls(nuevas); return () => nuevas.forEach(url => URL.revokeObjectURL(url)); }, [archivos]);
  return <>{archivos.map((archivo, i) => <figure key={`${archivo.name}-${i}`} className="relative"><img src={urls[i]} alt={`Vista previa de ${archivo.name}`} className="h-24 w-full rounded-md object-cover" /><button type="button" aria-label={`Quitar foto ${archivo.name}`} onClick={() => onQuitar(i)} className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-white text-red-700">×</button><figcaption className="truncate text-xs">{archivo.name}</figcaption></figure>)}</>;
}

function formatearPlaca(valor: string): string {
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  let letras = '';
  let digitos = '';
  let guionExplicito = false;
  for (const ch of limpio) {
    if (!digitos && ch >= 'A' && ch <= 'Z' && letras.length < 3) {
      letras += ch;
    } else if (ch === '-' && letras.length === 3 && !digitos) {
      guionExplicito = true;
    } else if (ch >= '0' && ch <= '9' && letras.length === 3 && digitos.length < 4) {
      digitos += ch;
    }
  }
  if (digitos.length > 0 || guionExplicito) return `${letras}-${digitos}`;
  return letras;
}

export default function EditorBus({ inicial, grupos, ambitoOperacion = 'INTERPROVINCIAL', clases, chasis, carrocerias, servicios, existentes, volverHref, onGuardar }: Props) {
  const [base, setBase] = useState(inicial);
  const [datos, setDatos] = useState(inicial);
  const [fotos, setFotos] = useState<File[]>([]);
  const [editandoPlano, setEditandoPlano] = useState(false);
  const [herramienta, setHerramienta] = useState('ASIENTO');
  const [claseId, setClaseId] = useState(inicial.celdas.find(c => c.tipo === 'ASIENTO')?.clase_id ?? clases[0]?.id ?? '');
  const [nuevaVersion, setNuevaVersion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [validandoFotos, setValidandoFotos] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [fotoError, setFotoError] = useState('');
  const generacionFotos = useRef(0);
  const [distribucionPendiente, setDistribucionPendiente] = useState<{ pisos: number; filas: number } | null>(null);
  const [confirmarNuevo, setConfirmarNuevo] = useState(false);
  const cambiado = JSON.stringify(datos) !== JSON.stringify(base) || fotos.length > 0;
  const asientos = datos.celdas.filter(c => c.tipo === 'ASIENTO');
  const capacidad = asientos.length;
  const claseNormalIds = new Set(clases.filter(c => c.codigo === 'NORMAL').map(c => c.id));
  const normalCount = asientos.filter(c => c.clase_id && claseNormalIds.has(c.clase_id)).length;
  const vipCount = capacidad - normalCount;
  const grupoActualNombre = grupos.find(g => g.id === datos.grupoId)?.nombre ?? 'Sin grupo';
  const esUrbanoORural = ambitoOperacion === 'URBANA' || ambitoOperacion === 'RURAL';
  const puertasDetectadas = detectarPuertas(datos.celdas);
  const totalPuertasBus: 1 | 2 | 3 = puertasDetectadas.cantidad >= 2 ? 3 : puertasDetectadas.cantidad === 1 ? 2 : 1;
  useEffect(() => () => { generacionFotos.current += 1; }, []);
  function cambiar<K extends keyof BusEditorDatos>(campo: K, valor: BusEditorDatos[K]) { setDatos(d => ({ ...d, [campo]: valor })); setMensaje(''); setErrores([]); }
  function cancelar() { setDistribucionPendiente(null); setConfirmarNuevo(false); generacionFotos.current += 1; setDatos(base); setClaseId(base.celdas.find(c => c.tipo === 'ASIENTO')?.clase_id ?? clases[0]?.id ?? ''); setFotos([]); setErrores([]); setFotoError(''); setValidandoFotos(false); setEditandoPlano(false); setNuevaVersion(false); setMensaje('Se restauraron los datos, fotos y plano originales.'); }
  function aplicarDistribucion(pisos: number, filas: number) {
    const clase = clases.find(c => (pisos === 1 ? c.codigo === 'NORMAL' : ['VIP', 'EJECUTIVO'].includes(c.codigo)));
    if (!clase) { setErrores(['No hay una clase disponible para esta distribución.']); return; }
    setDatos(d => ({ ...d, pisos, filas, celdas: (pisos === 1 ? plantillaNormal : plantillaEjecutivo)(filas, clase.id) }));
    setClaseId(clase.id); setNuevaVersion(base.planoEnUso && datos.id === base.id); setDistribucionPendiente(null); setMensaje('Plantilla actualizada en el borrador. Revisa el plano antes de guardar.'); setErrores([]);
  }
  function cambiarPuertasTotal(total: 1 | 2 | 3) {
    if (!esUrbanoORural) return;
    const claseDefecto = clases.find(c => c.codigo === 'NORMAL')?.id ?? claseId;
    if (!claseDefecto) { setErrores(['No hay una clase disponible para actualizar el plano.']); return; }
    setDatos(d => ({ ...d, celdas: aplicarPuertasEnPlano(d.celdas, d.pisos, total, claseDefecto) }));
    if (base.planoEnUso && datos.id === base.id) setNuevaVersion(true);
    setErrores([]);
    setMensaje(`Puertas del bus actualizadas a ${total} (${total === 1 ? 'solo delantera' : total === 2 ? 'delantera + central' : 'delantera + central + trasera'}).`);
  }
  function nuevoBus() {
    generacionFotos.current += 1;
    setDatos({ ...inicial, id: undefined, version: 1, unidad: '', placa: '', correo: '', propietario: '', fotos: [], planoEnUso: false });
    setClaseId(inicial.celdas.find(c => c.tipo === 'ASIENTO')?.clase_id ?? clases[0]?.id ?? '');
    setFotos([]); setValidandoFotos(false); setFotoError(''); setEditandoPlano(false); setNuevaVersion(false); setDistribucionPendiente(null); setConfirmarNuevo(false); setErrores([]); setMensaje('Nuevo borrador de bus. Completa los datos de la unidad.');
  }
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
    const banos = detectarBanos(datos.celdas);
    const puertas = detectarPuertas(datos.celdas);
    const esBano = banos.inicios.has(`${piso}-${fila}-${columna}`);
    const esPuerta = puertas.inicios.has(`${piso}-${fila}-${columna}`);

    if (herramienta === 'BANO' || herramienta === 'PUERTA') {
      if (herramienta === 'PUERTA' && !esUrbanoORural) return;
      const [c1, c2] =
        herramienta === 'PUERTA'
          ? columnasPuertaParaClick(datos.pisos, columna)
          : columnasBanoParaClick(datos.pisos, columna);
      const yaEsPuertaAqui = herramienta === 'PUERTA' && puertas.inicios.has(`${piso}-${fila}-${c1}`);
      if (herramienta === 'PUERTA' && !yaEsPuertaAqui && puertas.cantidad >= 2) {
        setErrores([
          'Un bus urbano o rural admite como máximo 3 puertas en total (delantera + 2 puertas en el plano).',
        ]);
        return;
      }
      const tipoBloque = herramienta === 'PUERTA' ? ('PUERTA' as const) : ('BLOQUE' as const);
      const resto = datos.celdas.filter(
        c => !(c.piso === piso && c.fila === fila && (c.columna === c1 || c.columna === c2)),
      );
      const celdas = [
        ...resto,
        { piso, fila, columna: c1, tipo: tipoBloque, codigo: null, clase_id: null },
        { piso, fila, columna: c2, tipo: tipoBloque, codigo: null, clase_id: null },
      ];
      cambiar('celdas', numerarPlanoComercial(celdas, datos.pisos));
      return;
    }

    if (esBano || esPuerta) {
      const resto = datos.celdas.filter(
        c => !(c.piso === piso && c.fila === fila && (c.columna === columna || c.columna === columna + 1)),
      );
      if (herramienta === 'BORRAR') {
        cambiar('celdas', numerarPlanoComercial(resto, datos.pisos));
        return;
      }
      if (herramienta === 'ASIENTO' || herramienta === 'PASILLO') {
        const nuevas: CeldaPlano[] = [columna, columna + 1].map(col => ({
          piso,
          fila,
          columna: col,
          tipo: herramienta as CeldaPlano['tipo'],
          codigo: null,
          clase_id: herramienta === 'ASIENTO' ? claseId : null,
        }));
        cambiar('celdas', numerarPlanoComercial([...resto, ...nuevas], datos.pisos));
        return;
      }
    }

    const resto = datos.celdas.filter(c => c.piso !== piso || c.fila !== fila || c.columna !== columna);
    const celdas = herramienta === 'BORRAR' ? resto : [...resto, { piso, fila, columna, tipo: herramienta as CeldaPlano['tipo'], codigo: null, clase_id: herramienta === 'ASIENTO' ? claseId : null }];
    cambiar('celdas', numerarPlanoComercial(celdas, datos.pisos));
  }
  const placaNormalizada = datos.placa.trim().toUpperCase();
  const formatoPlacaValido = /^[A-Z]{3}-\d{4}$/.test(placaNormalizada);
  const placaDuplicada = existentes.some(bus =>
    bus.id !== datos.id && bus.placa.trim().toUpperCase() === placaNormalizada,
  );
  const errorPlaca = !formatoPlacaValido
    ? 'Usa tres letras, un guion y cuatro dígitos. Ejemplo: ABC-1234.'
    : placaDuplicada ? 'Esta placa ya está registrada en otro bus.' : '';

  async function guardar(evento: FormEvent) {
    evento.preventDefault(); if (guardando || validandoFotos) return;
    const fallos = validarPlano(datos.celdas, datos.pisos);
    if (!datos.unidad.trim() || !datos.chasis.trim() || !datos.carroceria.trim()) fallos.push('Unidad, chasis y carrocería son obligatorios.');
    if (errorPlaca) fallos.push(errorPlaca);
    if (!grupos.some(g => g.id === datos.grupoId)) fallos.push('Selecciona un grupo disponible.');
    if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) fallos.push('Ingresa un correo de contacto válido.');
    if (existentes.some(b => b.id !== datos.id && b.unidad.trim().toLowerCase() === datos.unidad.trim().toLowerCase())) fallos.push('El número de unidad ya está registrado.');
    if (datos.celdas.some(c => c.tipo === 'ASIENTO' && !clases.some(k => k.id === c.clase_id))) fallos.push('El plano tiene clases de asiento no disponibles.');
    if (datos.id === base.id && base.planoEnUso && JSON.stringify(base.celdas) !== JSON.stringify(datos.celdas) && !nuevaVersion) fallos.push('El plano está en uso: crea una nueva versión para modificarlo.');
    setErrores(fallos); if (fallos.length) return;
    setGuardando(true);
    try {
      const payload = { ...datos, unidad: datos.unidad.trim(), placa: placaNormalizada, version: datos.id ? base.version : 1 };
      if (onGuardar) { const respuesta = await onGuardar(payload, fotos, nuevaVersion); setBase(respuesta); setDatos(respuesta); setFotos([]); setNuevaVersion(false); setEditandoPlano(false); setMensaje('Bus guardado correctamente.'); }
      else setMensaje('Borrador validado. Los datos, las fotos y el plano no se enviaron al servidor.');
    } catch (error) { setErrores([error instanceof Error ? error.message : 'No se pudo guardar el bus. Conservamos los cambios para reintentar.']); }
    finally { setGuardando(false); }
  }
  const placaNorm = datos.placa.trim().toUpperCase();
  const placaValida = /^[A-Z]{3}-\d{4}$/.test(placaNorm);
  const unidadDuplicada = datos.unidad.trim().length > 0 && existentes.some(b => b.id !== datos.id && b.unidad.trim().toLowerCase() === datos.unidad.trim().toLowerCase());
  function campo(nombre: 'unidad' | 'placa' | 'correo' | 'propietario', texto: string, tipo = 'text') {
    if (nombre === 'placa') {
      return (
        <label className="grid content-start gap-1.5 text-sm">
          {texto}
          <input
            className={`${entradaConfiguracion} uppercase font-mono tracking-wider ${placaDuplicada || (placaNorm.length > 0 && !placaValida) ? 'border-amber-400' : ''}`}
            type="text"
            value={datos.placa}
            maxLength={8}
            placeholder="TBA-1234"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={placaDuplicada}
            onChange={e => cambiar('placa', formatearPlaca(e.target.value))}
          />
          {placaDuplicada ? (
            <span className="text-xs font-medium text-red-700">Ya existe otra unidad registrada con esta placa.</span>
          ) : (
            <span className="text-[11px] text-slate-500">Formato: 3 letras y 4 dígitos (ej. TBA-1234)</span>
          )}
        </label>
      );
    }
    return (
      <label className="grid content-start gap-1.5 text-sm">
        {texto}
        <input
          className={entradaConfiguracion}
          type={tipo}
          value={datos[nombre]}
          maxLength={nombre === 'unidad' ? 30 : 120}
          onChange={e => cambiar(nombre, e.target.value)}
        />
        {nombre === 'unidad' && unidadDuplicada && (
          <span className="text-xs font-medium text-red-700">Esta unidad ya existe en la cooperativa.</span>
        )}
      </label>
    );
  }
  function catalogo(nombre: 'chasis' | 'carroceria', texto: string, opciones: string[]) {
    return (
      <label className="grid content-start gap-1.5 text-sm">
        {texto}
        <ComboBusqueda
          value={datos[nombre]}
          onChange={(v) => cambiar(nombre, v)}
          opciones={opciones.map((o) => ({ valor: o, etiqueta: o }))}
          placeholder={`Buscar ${texto.replace('*', '').trim().toLowerCase()}…`}
          permitirLibre
          className={entradaConfiguracion}
        />
      </label>
    );
  }
  return <form onSubmit={guardar} noValidate className="space-y-4 text-[#08035b]">
    <header><h1 className="text-2xl font-bold sm:text-3xl">Gestión de buses</h1><p className="mt-1 text-sm text-indigo-700">Administra la flota y la configuración de sus asientos.</p></header>
    {!onGuardar && <p className="rounded bg-amber-50 p-3 text-xs text-amber-900">Vista previa del editor · cambios locales. No modifica buses del servidor.</p>}
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
      <img src={`/images/compra/bus-${datos.pisos === 1 ? 'un-piso' : 'dos-pisos'}.webp`} alt="Ilustración del tipo de bus" className="h-14 w-20 rounded object-cover" />
      <div>
        <h2 className="font-bold">{datos.unidad ? `Unidad ${datos.unidad}` : 'Nuevo bus'}</h2>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span>{datos.placa || 'Placa pendiente'}</span>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">{datos.id ? 'Editando' : 'Registro de unidad'}</span>
        </p>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${datos.activo ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700'}`}>{datos.activo ? 'Activo' : 'Inactivo'}</span>
        {volverHref && <Link to={volverHref} className={botonConfiguracion + ' inline-flex items-center gap-1.5 no-underline'}><IconoBiblioteca nombre="volver" className="size-4" />Volver a la flota</Link>}
        <button type="button" className={guardarConfiguracion} disabled={guardando} onClick={() => cambiado ? setConfirmarNuevo(true) : nuevoBus()}>＋ Nuevo bus</button>
      </div>
    </div>{confirmarNuevo && <div role="alert" className="flex flex-wrap items-center gap-3 rounded bg-amber-50 p-3 text-sm"><p>Se descartarán los cambios de este borrador. ¿Crear otro bus?</p><button type="button" className={botonConfiguracion} onClick={() => setConfirmarNuevo(false)}>Seguir editando</button><button type="button" className={guardarConfiguracion} onClick={nuevoBus}>Crear nuevo borrador</button></div>}
    <fieldset disabled={guardando} className="grid items-start gap-4 xl:grid-cols-2">
      <BloqueConfiguracion titulo="Datos del bus"><div className="grid grid-cols-2 items-start gap-3">{campo('unidad', 'Número de unidad *')}{campo('placa', 'Placa *')}{catalogo('chasis', 'Marca del chasis *', chasis)}{catalogo('carroceria', 'Carrocería *', carrocerias)}{campo('correo', 'Correo de contacto', 'email')}<label className="grid content-start gap-1.5 text-sm">Grupo *<select className={entradaConfiguracion} value={datos.grupoId} onChange={e => cambiar('grupoId', e.target.value)}><option value="">Selecciona un grupo</option>{grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></label><label className="grid content-start gap-1.5 text-sm">Estado<select className={entradaConfiguracion} value={String(datos.activo)} onChange={e => cambiar('activo', e.target.value === 'true')}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>{campo('propietario', 'Propietario (opcional)')}</div>
        <h3 className="mb-3 mt-5 font-bold">Fotografías del bus</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{datos.fotos.map(f => <figure key={f.id} className="relative"><img src={f.url} alt={f.nombre} className="h-24 w-full rounded object-cover" /><button type="button" className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-white text-red-700" aria-label={`Quitar foto ${f.nombre}`} onClick={() => cambiar('fotos', datos.fotos.filter(x => x.id !== f.id))}>×</button></figure>)}<FotosNuevas archivos={fotos} onQuitar={i => setFotos(actual => actual.filter((_, n) => n !== i))} /><label className="grid min-h-24 cursor-pointer place-items-center rounded-md border border-dashed border-blue-300 bg-blue-50 p-3 text-center text-sm">Subir fotos<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={validandoFotos} className="mt-2 block w-full text-xs" onChange={e => { void agregarFotos([...e.target.files ?? []]); e.target.value = ''; }} /></label></div><p className="mt-2 text-xs text-slate-500">JPG, PNG o WebP · máximo 5 MB por imagen · hasta 6 fotos.</p>{validandoFotos && <p role="status">Validando fotografías…</p>}{fotoError && <p role="alert" className="text-sm text-red-700">{fotoError}</p>}
        <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">Servicios y comodidades</h3>
          {servicios.length > 0 && (
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 text-xs font-semibold text-green-900 hover:bg-green-100">
              <input
                type="checkbox"
                checked={servicios.length > 0 && servicios.every(s => datos.servicios.includes(s.id))}
                onChange={e => cambiar('servicios', e.target.checked ? servicios.map(s => s.id) : [])}
              />
              Seleccionar todos
            </label>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{servicios.map(s => <label key={s.id} className="flex min-h-11 items-center gap-2 rounded-md bg-green-50 px-3 text-sm"><input type="checkbox" checked={datos.servicios.includes(s.id)} onChange={e => cambiar('servicios', e.target.checked ? [...datos.servicios, s.id] : datos.servicios.filter(id => id !== s.id))} />{s.nombre}</label>)}</div>
      </BloqueConfiguracion>
      <BloqueConfiguracion titulo="Distribución de asientos">
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <label className="grid gap-2">Pisos<select className={entradaConfiguracion} value={datos.pisos} onChange={e => setDistribucionPendiente({ pisos: Number(e.target.value), filas: Number(e.target.value) === 1 ? 10 : 6 })}><option value="1">1 piso</option><option value="2">2 pisos</option></select></label>
          <label className="grid gap-2">Distribución<select className={entradaConfiguracion} value={datos.pisos} disabled><option value="1">2 + 2</option><option value="2">1 + 2</option></select></label>
          <label className="grid gap-2">Filas por piso<select className={entradaConfiguracion} value={datos.filas} onChange={e => setDistribucionPendiente({ pisos: datos.pisos, filas: Number(e.target.value) })}>{Array.from({length:20},(_,i) => <option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
          <div className="rounded bg-blue-50 p-3 text-center"><span className="block text-xs">Capacidad total</span><strong className="text-2xl">{capacidad}</strong> asientos<span className="mt-1 block text-[11px] font-medium text-blue-800">{normalCount} Normal · {vipCount} VIP</span></div>
          {esUrbanoORural && (
            <label className="col-span-2 grid gap-2 rounded-md border border-emerald-200 bg-emerald-50/70 p-2.5">
              <span className="font-semibold text-emerald-950">
                Puertas del bus ({ambitoOperacion === 'URBANA' ? 'Urbano' : 'Rural'} · {totalPuertasBus} en total)
              </span>
              <select
                className={entradaConfiguracion}
                value={totalPuertasBus}
                onChange={e => cambiarPuertasTotal(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value="1">1 puerta (solo delantera)</option>
                <option value="2">2 puertas (delantera + central)</option>
                <option value="3">3 puertas (delantera + central + trasera)</option>
              </select>
            </label>
          )}
        </div>
        {distribucionPendiente && <div role="alert" className="mb-4 space-y-3 rounded bg-amber-50 p-3 text-sm"><p>Recrear la distribución ({distribucionPendiente.pisos} pisos, {distribucionPendiente.filas} filas por piso) reemplazará los cambios del plano en este borrador. Los viajes existentes no se modifican.</p><div className="flex flex-wrap gap-2"><button type="button" className={botonConfiguracion} onClick={() => setDistribucionPendiente(null)}>Conservar plano</button><button type="button" className={guardarConfiguracion} onClick={() => aplicarDistribucion(distribucionPendiente.pisos, distribucionPendiente.filas)}>Aplicar distribución</button></div></div>}
        {editandoPlano ? (() => { const banos = detectarBanos(datos.celdas); const herramientas = ['ASIENTO', 'PASILLO', 'BANO', ...(esUrbanoORural ? ['PUERTA'] : []), 'BLOQUE', 'BORRAR']; return <div className="space-y-4"><div className="flex flex-wrap gap-2">{herramientas.map(t => <button type="button" key={t} aria-pressed={herramienta === t} className={(herramienta === t ? guardarConfiguracion : botonConfiguracion) + ' inline-flex items-center gap-1.5'} onClick={() => setHerramienta(t)}>{t === 'BANO' && <IconoBiblioteca nombre="bano" className="size-4" />}{t === 'PUERTA' && <IconoBiblioteca nombre="puerta" className="size-4" />}{t === 'ASIENTO' ? 'Asiento' : t === 'PASILLO' ? 'Pasillo' : t === 'BANO' ? 'Baño (2)' : t === 'PUERTA' ? 'Puerta (2)' : t === 'BLOQUE' ? 'Bloque' : 'Borrar'}</button>)}</div><p className="text-xs text-slate-600">Numeración ecuatoriana automática (V = Ventana, P = Pasillo). Baño{esUrbanoORural ? ' y Puerta ocupan' : ' ocupa'} 2 espacios{esUrbanoORural ? ' (máximo 3 puertas en total: delantera + 2 en plano).' : '.'}</p><label className="grid gap-2 text-sm">Clase de asiento<select className={entradaConfiguracion} value={claseId} onChange={e => setClaseId(e.target.value)}>{clases.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: datos.pisos }, (_, i) => i + 1).map(piso => { const asientosPiso = asientos.filter(a => a.piso === piso).length; return <div key={piso} className="rounded-3xl bg-slate-800 p-3 text-white"><h3 className="mb-3 text-center text-sm">Piso {piso} ({asientosPiso})</h3><div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${datos.pisos === 1 ? 5 : 4}, minmax(0, 1fr))` }}>{Array.from({ length: datos.filas }, (_, i) => i + 1).flatMap(fila => (datos.pisos === 1 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]).map(columna => { const clave = `${piso}-${fila}-${columna}`; if (banos.cubiertas.has(clave) || puertasDetectadas.cubiertas.has(clave)) return null; if (banos.inicios.has(clave)) { return <button type="button" key={`${fila}-${columna}`} style={{ gridColumn: 'span 2 / span 2' }} aria-label={`Editar baño en piso ${piso}, fila ${fila}, columnas ${columna} y ${columna + 1}`} onClick={() => editarCelda(piso, fila, columna)} className="flex min-h-11 items-center justify-center gap-1.5 rounded border border-sky-300 bg-sky-900/90 px-2 text-xs font-semibold text-sky-100 hover:bg-sky-800"><IconoBiblioteca nombre="bano" className="size-4 text-sky-300" /><span>Baño</span></button>; } if (puertasDetectadas.inicios.has(clave)) { return <button type="button" key={`${fila}-${columna}`} style={{ gridColumn: 'span 2 / span 2' }} aria-label={`Editar puerta en piso ${piso}, fila ${fila}, columnas ${columna} y ${columna + 1}`} onClick={() => editarCelda(piso, fila, columna)} className="flex min-h-11 items-center justify-center gap-1.5 rounded border border-emerald-300 bg-emerald-900/90 px-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-800"><IconoBiblioteca nombre="puerta" className="size-4 text-emerald-300" /><span>Puerta</span></button>; } const c = datos.celdas.find(c => c.piso === piso && c.fila === fila && c.columna === columna); const esVip = c?.tipo === 'ASIENTO' && c.clase_id !== null && !claseNormalIds.has(c.clase_id); return <button type="button" key={`${fila}-${columna}`} aria-label={`Editar piso ${piso}, fila ${fila}, columna ${columna}: ${c?.codigo ?? c?.tipo ?? 'vacío'}`} onClick={() => editarCelda(piso, fila, columna)} className={`flex min-h-11 flex-col items-center justify-center rounded border text-xs ${c?.tipo === 'ASIENTO' ? (esVip ? 'border-amber-300 bg-amber-600' : 'border-green-400 bg-green-700') : c?.tipo === 'PUERTA' ? 'border-emerald-300 bg-emerald-900/90 text-emerald-100' : c?.tipo === 'BLOQUE' ? 'border-slate-400 bg-slate-600' : 'border-dashed border-slate-500'}`}>{esVip && <span className="text-[8px] font-extrabold leading-none text-amber-100">VIP</span>}<span>{c?.tipo === 'ASIENTO' ? c.codigo : c?.tipo === 'PASILLO' ? '·' : c?.tipo === 'PUERTA' ? 'Pta' : c?.tipo === 'BLOQUE' ? '■' : '+'}</span></button>; }))}</div></div>; })}</div>
          <button type="button" className={botonConfiguracion} onClick={() => setEditandoPlano(false)}>Ver vista previa del plano</button></div>; })() : <SelectorAsientos mapa={{ planoId: datos.id ?? 'borrador', celdas: datos.celdas.map(c => ({ ...c, id: `${c.piso}-${c.fila}-${c.columna}`, clase: clases.find(k => k.id === c.clase_id)?.codigo ?? null, estado: 'DISPONIBLE' })) }} cantidad={0} seleccion={[]} onChange={() => {}} />}
        <p className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-900"><IconoBiblioteca nombre="info" className="size-4 text-blue-700" />Plantilla según grupo: <strong>{grupoActualNombre}</strong> · {datos.pisos} {datos.pisos === 1 ? 'piso' : 'pisos'} · {datos.pisos === 1 ? '2 + 2' : '1 + 2'}{esUrbanoORural ? ` · ${totalPuertasBus} ${totalPuertasBus === 1 ? 'puerta' : 'puertas'}` : ''}</p>
        {!editandoPlano && <button type="button" className={`${botonConfiguracion} mt-3 inline-flex w-full items-center justify-center gap-2`} onClick={() => { setNuevaVersion(base.planoEnUso); setEditandoPlano(true); }}><IconoBiblioteca nombre="editar" className="size-4" />{base.planoEnUso ? 'Crear nueva versión del plano' : 'Editar mapa de asientos'}</button>}
        {nuevaVersion && <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">El plano actual está en uso. Se enviará una versión nueva; los viajes existentes conservarán su plano.</p>}
        <button type="button" className="mt-3 min-h-11 text-sm underline" disabled={base.planoEnUso && !nuevaVersion} onClick={() => setDistribucionPendiente({ pisos: datos.pisos, filas: datos.filas })}>Restaurar plantilla de distribución</button>
      </BloqueConfiguracion>
    </fieldset>
    {errores.length > 0 && <div role="alert" className="rounded bg-red-50 p-4 text-sm text-red-800"><ul className="list-inside list-disc">{errores.map(e => <li key={e}>{e}</li>)}</ul></div>}{mensaje && <p role="status" className="text-sm text-green-800">{mensaje}</p>}
    <footer className="flex flex-wrap justify-end gap-3 border-t border-indigo-100 pt-4"><button type="button" disabled={guardando || (!cambiado && !editandoPlano && !fotoError)} className={botonConfiguracion} onClick={cancelar}>Cancelar</button><button type="submit" className={guardarConfiguracion + ' inline-flex items-center gap-2'} disabled={guardando || validandoFotos || !cambiado}><IconoBiblioteca nombre="guardar" className="size-4" />{guardando ? 'Guardando…' : onGuardar ? 'Guardar cambios' : 'Validar borrador'}</button></footer>
  </form>;
}
