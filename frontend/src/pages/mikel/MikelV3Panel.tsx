import { useMemo, useState } from 'react';
import SelectorAsientos from '../../components/flota/SelectorAsientos';
import BusesPage from '../flota/BusesPage';
import PlanosBusPage from '../flota/PlanosBusPage';
import type { CeldaMapa, MapaViaje } from '../../types/mapaViaje';

type Seccion = 'inicio' | 'normal' | 'premium' | 'buses' | 'grupos' | 'global' | 'identidad';
const boton = 'min-h-10 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-950 hover:bg-blue-50';
const activo = 'min-h-10 rounded-md bg-[#08035b] px-3 py-2 text-sm font-semibold text-white';

function mapa(pisos: number, asientosPorPiso: number, prefijo: string, clase: string): MapaViaje {
  const celdas: CeldaMapa[] = [];
  for (let piso = 1; piso <= pisos; piso += 1) {
    const filas = Math.ceil(asientosPorPiso / 3);
    for (let fila = 1; fila <= filas; fila += 1) {
      for (let columna = 1; columna <= 4; columna += 1) {
        const indice = (fila - 1) * 3 + columna - (columna === 3 ? 0 : columna > 3 ? 1 : 0);
        if (columna === 2) {
          celdas.push({ id: `${prefijo}-pasillo-${piso}-${fila}`, piso, fila, columna, tipo: 'PASILLO', codigo: null, clase: null, estado: 'DISPONIBLE' });
        } else if (indice <= asientosPorPiso) {
          const codigo = `${prefijo}${indice}`;
          celdas.push({ id: `${prefijo}-${piso}-${indice}`, piso, fila, columna, tipo: 'ASIENTO', codigo, clase, estado: indice % 11 === 0 ? 'OCUPADO' : 'DISPONIBLE' });
        }
      }
    }
  }
  return { planoId: `demo-${prefijo}`, celdas };
}

function SelectorDemo({ premium = false }: { premium?: boolean }) {
  const datos = useMemo(() => premium ? mapa(2, 18, 'U', 'EJECUTIVO') : mapa(1, 40, 'N', 'NORMAL'), [premium]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  return <section className="rounded-lg border border-blue-100 bg-white p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-blue-950">{premium ? '3.2 · Asientos Ejecutivo Premium' : '3.1 · Asientos Normal'}</h2><p className="text-sm text-slate-600">{premium ? '2 pisos · 18 + 18 · distribución 1 + 2 · códigos L1–L18 / U1–U18' : '1 piso · 2 + 2 · 40 asientos · códigos 1A–10D'}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900">{seleccion.length} seleccionados</span></div><SelectorAsientos mapa={datos} cantidad={premium ? 4 : 4} seleccion={seleccion} onChange={setSeleccion}/><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm"><span>Resumen: {seleccion.length ? seleccion.map((id) => datos.celdas.find((c) => c.id === id)?.codigo).join(', ') : 'elige tus asientos'}</span><button type="button" className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white" onClick={() => setSeleccion([])}>Limpiar selección</button></div></section>;
}

function GruposHabilitados() {
  const [grupos, setGrupos] = useState([{ id: 'ejecutivo', nombre: 'Ejecutivo Premium', frecuencia: 'F-001', activo: true }, { id: 'normal', nombre: 'Servicio Normal', frecuencia: 'F-002', activo: true }]);
  return <section className="rounded-lg border border-blue-100 bg-white p-5"><h2 className="text-xl font-bold text-blue-950">17.1 · Grupos habilitados</h2><p className="mt-1 text-sm text-slate-600">Relaciona grupos comerciales con frecuencias. Retirar un grupo no elimina viajes existentes.</p><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Grupo</th><th className="p-3">Frecuencia</th><th className="p-3">Estado</th><th className="p-3">Acción</th></tr></thead><tbody>{grupos.map((g) => <tr key={g.id} className="border-b"><td className="p-3 font-semibold">{g.nombre}</td><td className="p-3">{g.frecuencia}</td><td className="p-3">{g.activo ? 'Habilitado' : 'Retirado'}</td><td className="p-3"><button type="button" className={boton} onClick={() => setGrupos((actual) => actual.map((x) => x.id === g.id ? { ...x, activo: !x.activo } : x))}>{g.activo ? 'Retirar' : 'Habilitar'}</button></td></tr>)}</tbody></table></div><button type="button" className="mt-5 rounded-md bg-red-600 px-4 py-2 font-semibold text-white">Guardar versión</button></section>;
}

function ConfigGlobal() {
  const [guardado, setGuardado] = useState(false);
  return <section className="rounded-lg border border-blue-100 bg-white p-5"><h2 className="text-xl font-bold text-blue-950">11.4 · Configuración global</h2><p className="mt-1 text-sm text-slate-600">Parámetros generales administrados por el administrador global. No reemplaza identidad ni cuentas.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{[['General','Límite de pasajeros','10'],['Seguridad','Retención de sesión','480'],['Archivos','Tamaño máximo (MB)','5'],['Notificaciones','Minutos de aviso','30']].map(([grupo, etiqueta, valor]) => <label key={grupo} className="grid gap-1 text-sm font-semibold text-blue-950"><span>{grupo}</span>{etiqueta}<input defaultValue={valor} type="number" min={1} className="rounded border border-blue-200 px-3 py-2" /></label>)}</div><div className="mt-5 flex flex-wrap gap-3"><button type="button" className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white" onClick={() => setGuardado(true)}>Guardar borrador auditado</button><button type="button" className={boton} onClick={() => setGuardado(false)}>Cancelar y restaurar</button>{guardado && <span role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">Versión 2 guardada · impacto registrado</span>}</div></section>;
}

function Identidad() {
  const [color, setColor] = useState('#CB102E');
  return <section className="rounded-lg border border-blue-100 bg-white p-5"><h2 className="text-xl font-bold text-blue-950">19 · Configuración de identidad y contacto</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm font-semibold">Nombre<input defaultValue="Gran Continental" className="rounded border border-blue-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-semibold">RUC<input defaultValue="1799999999001" className="rounded border border-blue-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-semibold">Lema<input defaultValue="Viajamos contigo" className="rounded border border-blue-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-semibold">Correo de soporte<input defaultValue="soporte@cooperativa.ec" type="email" className="rounded border border-blue-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-semibold">Color primario<input value={color} onChange={(e) => setColor(e.target.value)} pattern="^#[0-9A-Fa-f]{6}$" className="rounded border border-blue-200 px-3 py-2" /></label><label className="grid gap-1 text-sm font-semibold">Logo PNG/SVG<input type="file" accept="image/png,image/svg+xml" className="rounded border border-blue-200 px-3 py-2" /></label></div><div className="mt-5 rounded-lg p-5 text-white" style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#64748b' }}><strong>Vista previa de la identidad</strong><p className="mt-2">Gran Continental · Viajamos contigo</p></div><button type="button" className="mt-5 rounded-md bg-red-600 px-4 py-2 font-semibold text-white">Guardar identidad y contacto</button></section>;
}

export default function MikelV3Panel({ inicial = 'inicio' }: { inicial?: Seccion }) {
  const [seccion, setSeccion] = useState<Seccion>(inicial);
  const menu: Array<[Seccion, string]> = [['inicio','Resumen'],['normal','3.1 Normal'],['premium','3.2 Premium'],['buses','16 / 16.1 Buses'],['grupos','17.1 Grupos'],['global','11.4 Global'],['identidad','19 Identidad']];
  return <section className="mx-auto my-5 w-[calc(100%-24px)] max-w-[1440px] rounded-lg bg-slate-50 p-4 text-blue-950 sm:p-6"><header className="mb-5"><p className="text-sm font-semibold uppercase tracking-wide text-red-600">MIKEL V3 · Flota y configuración</p><h1 className="mt-1 text-3xl font-bold">Flujo de demostración de las 7 vistas</h1><p className="mt-2 text-slate-600">Selecciona una vista para recorrer el módulo completo. Los mapas reutilizan el selector común y conservan la regla de pasillo separado de asiento.</p></header><nav className="mb-5 flex flex-wrap gap-2" aria-label="Vistas de Mikel">{menu.map(([id, label]) => <button key={id} type="button" className={seccion === id ? activo : boton} onClick={() => setSeccion(id)}>{label}</button>)}</nav>{seccion === 'inicio' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{menu.slice(1).map(([id,label]) => <button key={id} type="button" onClick={() => setSeccion(id)} className="rounded-lg border border-blue-100 bg-white p-5 text-left shadow-sm hover:border-red-300"><span className="text-lg font-bold">{label}</span><span className="mt-2 block text-sm text-slate-600">Abrir pantalla y continuar el flujo.</span></button>)}</div>}{seccion === 'normal' && <SelectorDemo/>}{seccion === 'premium' && <SelectorDemo premium/>}{seccion === 'buses' && <div className="space-y-5"><BusesPage/><PlanosBusPage/></div>}{seccion === 'grupos' && <GruposHabilitados/>}{seccion === 'global' && <ConfigGlobal/>}{seccion === 'identidad' && <Identidad/>}</section>;
}
