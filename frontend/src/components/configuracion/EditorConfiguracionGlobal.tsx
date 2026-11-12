import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { IconoConfiguracion } from './ConfiguracionCooperativaTabs';

export interface ConfiguracionGlobalDatos {
  version: number;
  idioma: string;
  moneda: 'USD';
  zonaHoraria: string;
  sesionHoras: number;
  mfaAdministradores: boolean;
  formatos: string[];
  maxArchivoMB: number;
  correo: boolean;
  whatsapp: boolean;
}

export const entradaConfiguracion = 'min-h-11 w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm text-[#08035b] focus:outline-2 focus:outline-blue-600 disabled:bg-slate-100';
export const botonConfiguracion = 'min-h-11 rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-[#08035b] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50';
export const guardarConfiguracion = 'min-h-11 rounded-md bg-[#ff0018] px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50';

export function BloqueConfiguracion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <section className="rounded-lg border border-indigo-100 bg-white p-4 sm:p-5"><h2 className="mb-4 flex items-center gap-3 rounded-md bg-blue-50 p-3 text-lg font-bold text-[#08035b]"><IconoConfiguracion nombre={titulo === 'Datos del bus' ? 'bus' : titulo === 'Archivos' ? 'guardar' : 'ajustes'}/>{titulo}</h2>{children}</section>;
}

interface Props {
  inicial: ConfiguracionGlobalDatos;
  canales: { correo: boolean; whatsapp: boolean };
  admiteMfa: boolean;
  onGuardar?: (datos: ConfiguracionGlobalDatos) => Promise<ConfiguracionGlobalDatos>;
}

export default function EditorConfiguracionGlobal({ inicial, canales, admiteMfa, onGuardar }: Props) {
  const [base, setBase] = useState(inicial);
  const [datos, setDatos] = useState(inicial);
  const [pestana, setPestana] = useState('General');
  const secciones = useRef<Record<string, HTMLDivElement | null>>({});
  const [ayudaCanal, setAyudaCanal] = useState('');
  const [impacto, setImpacto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const modificado = JSON.stringify(base) !== JSON.stringify(datos);
  const valido = Number.isInteger(datos.sesionHoras) && datos.sesionHoras >= 1 && datos.sesionHoras <= 24 &&
    Number.isInteger(datos.maxArchivoMB) && datos.maxArchivoMB >= 1 && datos.maxArchivoMB <= 5 && datos.formatos.length > 0;
  function cambiar<K extends keyof ConfiguracionGlobalDatos>(campo: K, valor: ConfiguracionGlobalDatos[K]) {
    setDatos(actual => ({ ...actual, [campo]: valor }));
    setImpacto(false); setMensaje(''); setError('');
  }
  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (!valido || !impacto || !modificado || ocupado) return;
    setOcupado(true); setError('');
    try {
      const guardado = onGuardar ? await onGuardar({ ...datos, version: base.version }) : { ...datos };
      setDatos(guardado); setBase(guardado); setImpacto(false);
      setMensaje(onGuardar ? 'Configuración guardada.' : 'Borrador confirmado en esta vista. No se ha publicado en el servidor.');
    } catch {
      setError('No se pudo guardar. Conservamos los cambios; revisa tu conexión y vuelve a intentarlo.');
    } finally { setOcupado(false); }
  }
  function cancelar() { setDatos(base); setImpacto(false); setError(''); setMensaje('Se restauraron los últimos valores confirmados.'); }
  return <form onSubmit={guardar} className="space-y-4 text-[#08035b]">
    <header><h1 className="text-2xl font-bold sm:text-3xl">Configuración del sistema</h1><p className="mt-1 text-sm text-indigo-700">Parámetros globales y límites de la plataforma.</p><p className="mt-2 text-xs text-slate-500">Versión {base.version}{!onGuardar && ' · Vista previa: cambios locales, integración pendiente'}</p></header>
    <nav aria-label="Secciones de configuración" className="grid grid-cols-3 gap-1 rounded-lg bg-blue-50 p-1">
      {['General', 'Seguridad', 'Archivos y notificaciones'].map(p => <button key={p} type="button" aria-current={pestana === p ? 'location' : undefined} className={`min-h-12 rounded-md px-2 text-sm font-semibold ${pestana === p ? 'bg-blue-700 text-white' : 'hover:bg-white'}`} onClick={() => { setPestana(p); secciones.current[p]?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{p}</button>)}
    </nav>
    <fieldset disabled={ocupado} className="space-y-4">
      <div ref={n => { secciones.current.General = n; }} className="scroll-mt-36"><BloqueConfiguracion titulo="Configuración general"><div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm">Idioma<select className={entradaConfiguracion} value={datos.idioma} onChange={e => cambiar('idioma', e.target.value)}><option value="es-EC">Español (Ecuador)</option></select></label>
        <label className="grid gap-2 text-sm">Moneda<select className={entradaConfiguracion} value={datos.moneda} disabled><option value="USD">USD · Dólar estadounidense</option></select></label>
        <label className="grid gap-2 text-sm">Zona horaria<select className={entradaConfiguracion} value={datos.zonaHoraria} onChange={e => cambiar('zonaHoraria', e.target.value)}><option>America/Guayaquil</option><option>Pacific/Galapagos</option></select></label>
      </div></BloqueConfiguracion></div>
      <div ref={n => { secciones.current.Seguridad = n; }} className="scroll-mt-36"><BloqueConfiguracion titulo="Seguridad"><div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Tiempo de expiración de sesión (horas)<input className={entradaConfiguracion} type="number" min="1" max="24" step="1" required value={datos.sesionHoras} onChange={e => cambiar('sesionHoras', Number(e.target.value))}/><span className="text-xs text-slate-500">Entre 1 y 24 horas. El servidor aplicará este límite al integrarse.</span></label>
        <label className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-sm"><input type="checkbox" className="mt-1 size-5" checked={datos.mfaAdministradores} disabled={!admiteMfa} onChange={e => cambiar('mfaAdministradores', e.target.checked)}/><span><strong className="block">Autenticación de dos factores (MFA)</strong><span className="mt-2 block text-xs">{admiteMfa ? 'Verificación adicional para administradores.' : 'Pendiente de integración. No se puede activar todavía.'}</span></span></label>
      </div></BloqueConfiguracion></div>
      <div ref={n => { secciones.current['Archivos y notificaciones'] = n; }} className="scroll-mt-36"><BloqueConfiguracion titulo="Archivos"><div className="grid gap-4 sm:grid-cols-2">
        <fieldset><legend className="mb-2 text-sm">Tipos de archivo permitidos</legend><div className="flex flex-wrap gap-3">{['JPG','PNG','PDF'].map(tipo => <label key={tipo} className="flex min-h-11 items-center gap-2 rounded-md bg-blue-50 px-3 text-sm"><input type="checkbox" checked={datos.formatos.includes(tipo)} onChange={e => cambiar('formatos', e.target.checked ? [...datos.formatos,tipo] : datos.formatos.filter(t => t !== tipo))}/>{tipo}</label>)}</div></fieldset>
        <label className="grid gap-2 text-sm">Tamaño máximo de archivo (MB)<input type="number" required min="1" max="5" step="1" className={entradaConfiguracion} value={datos.maxArchivoMB} onChange={e => cambiar('maxArchivoMB', Number(e.target.value))}/><span className="text-xs text-slate-500">Límite actual de comprobantes: 5 MB.</span></label>
      </div></BloqueConfiguracion></div>
      <BloqueConfiguracion titulo="Notificaciones"><div className="grid gap-4 sm:grid-cols-2">{(['correo','whatsapp'] as const).map(c => <div key={c} className="rounded-lg border border-indigo-100 p-4 text-sm"><label className="flex items-center justify-between gap-3"><span><strong>{c === 'correo' ? 'Notificaciones por correo electrónico' : 'Notificaciones por WhatsApp'}</strong><small className="mt-2 block text-slate-500">{canales[c] ? 'Canal disponible' : 'Pendiente de conexión'}</small></span><input aria-label={'Activar ' + c} type="checkbox" checked={datos[c]} disabled={!canales[c]} onChange={e => cambiar(c,e.target.checked)}/></label><button type="button" className={botonConfiguracion + ' mt-3'} aria-expanded={ayudaCanal === c} onClick={() => setAyudaCanal(ayudaCanal === c ? '' : c)}>Configurar conexión</button>{ayudaCanal === c && <p role="status" className="mt-3 rounded bg-amber-50 p-3 text-xs leading-5">La conexión de {c === 'correo' ? 'correo' : 'WhatsApp'} debe configurarse y verificarse en el backend. Esta vista no solicita claves ni activa un proveedor. Al integrar el servicio se mostrará su estado real.</p>}</div>)}</div></BloqueConfiguracion>
    </fieldset>
    {!valido && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">Selecciona al menos un formato, sesión de 1 a 24 horas y archivo de 1 a 5 MB.</p>}
    <div className="rounded-lg bg-blue-50 p-4 text-sm"><p>Los límites de cada cooperativa no podrán superar los globales. Ningún canal se activa sin integración verificada.</p>
      <button type="button" className={`${botonConfiguracion} mt-3`} disabled={!valido || !modificado || ocupado} onClick={() => setImpacto(true)}>Revisar impacto de los cambios</button>
      {impacto && <div role="status" className="mt-3 space-y-1"><p>Sesión: {base.sesionHoras} → {datos.sesionHoras} horas.</p><p>Archivos: {datos.formatos.join(', ')} · máximo {datos.maxArchivoMB} MB.</p><p>No modifica documentos ni reservas existentes. La validación de versiones y permisos se realizará al integrar el servidor.</p></div>}
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{mensaje && <p role="status" className="text-sm text-green-800">{mensaje}</p>}
    <footer className="flex flex-wrap justify-end gap-3 border-t border-indigo-100 pt-4"><button type="button" className={botonConfiguracion} onClick={cancelar} disabled={ocupado || !modificado}>Cancelar</button><button type="submit" className={guardarConfiguracion} disabled={!modificado || !valido || !impacto || ocupado}>{ocupado ? 'Guardando…' : onGuardar ? 'Guardar configuración' : 'Confirmar borrador'}</button></footer>
  </form>;
}
