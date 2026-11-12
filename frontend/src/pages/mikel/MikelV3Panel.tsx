import { Link, NavLink } from 'react-router';
import { ProgresoCompra } from '../../components/compra/ProgresoCompra';
import EditorIdentidad from '../../components/configuracion/EditorIdentidad';
import GruposHabilitadosEditor from '../../components/flota/GruposHabilitadosEditor';
import EditorConfiguracionGlobal from '../../components/configuracion/EditorConfiguracionGlobal';
import { useMemo, useState } from 'react';
import SelectorAsientos from '../../components/flota/SelectorAsientos';
import EditorBus from '../../components/flota/EditorBus';
import { plantillaEjecutivo, plantillaNormal } from '../../features/flota/plantillasPlano';

import type { CeldaMapa, MapaViaje } from '../../types/mapaViaje';

type Seccion = 'inicio' | 'normal' | 'premium' | 'buses' | 'bus-normal' | 'bus-normal' | 'grupos' | 'global' | 'identidad';
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
  const datos = useMemo(() => {
    const celdas = (premium ? plantillaEjecutivo(6, 'preview-ejecutivo') : plantillaNormal(10, 'preview-normal')).map(c => ({ ...c, id: [c.piso,c.fila,c.columna].join('-'), clase: c.tipo === 'ASIENTO' ? (premium ? 'EJECUTIVO' : 'NORMAL') : null, estado: (c.codigo === (premium ? 'U3' : '3B') ? 'OCUPADO' : c.codigo === (premium ? 'L1' : '1A') ? 'RESERVADO' : 'DISPONIBLE') as 'OCUPADO' | 'RESERVADO' | 'DISPONIBLE' }));
    return { planoId: premium ? 'preview-premium' : 'preview-normal', celdas };
  }, [premium]);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [continuado, setContinuado] = useState(false);
  const precio = premium ? 28 : 20;
  const elegidos = datos.celdas.filter(c => seleccion.includes(c.id));
  const cambiar = (ids: string[]) => { setSeleccion(ids); setContinuado(false); };
  const imagen = '/images/compra/bus-' + (premium ? 'dos-pisos' : 'un-piso') + '.webp';
  return <section className="space-y-4 rounded-lg bg-white p-4 text-[#08035b] sm:p-5">
    <ProgresoCompra pasoActual={3}/>
    <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">Vista previa con viaje y disponibilidad de ejemplo. No crea reservas ni retiene asientos reales.</p>
    <div className="grid items-start gap-4 xl:grid-cols-[230px_minmax(0,1fr)_260px]">
      <aside className="overflow-hidden rounded-lg border border-blue-100"><Link className="block bg-blue-50 px-4 py-3 text-sm" to="/vista-previa/mikel-v3">← Volver a las vistas</Link><div className="space-y-4 p-4"><h2 className="text-xl font-bold">Quito → Guayaquil</h2><p className="text-sm leading-6">Viaje de ejemplo<br/>{premium ? '06:00 → 14:30' : '13:00 → 21:30'}</p><span className="inline-block rounded bg-green-100 px-3 py-1 text-sm text-green-900">{premium ? 'Ejecutivo (Dos pisos)' : 'Confort (Un piso)'}</span><dl className="hidden space-y-3 text-sm xl:block"><div><dt className="inline font-semibold">Duración: </dt><dd className="inline">8h 30min</dd></div><div><dt className="inline font-semibold">Paradas: </dt><dd className="inline">0</dd></div><div><dt className="inline font-semibold">Unidad: </dt><dd className="inline">{premium ? '018' : '025'} · datos de ejemplo</dd></div><div><dt className="inline font-semibold">Carrocería: </dt><dd className="inline">Marcopolo Paradiso {premium ? '1800 DD' : '1200'}</dd></div><div><dt className="inline font-semibold">Chasis: </dt><dd className="inline">Scania</dd></div></dl><h3 className="hidden border-t border-blue-100 pt-3 font-bold xl:block">Servicios a bordo</h3><ul className="hidden space-y-2 text-sm xl:block">{['Asientos reclinables','WiFi','Climatización','Baño','Enchufes USB', premium ? 'Pantallas individuales' : 'Amplio maletero'].map(n => <li key={n}>✓ {n}</li>)}</ul></div><img src={imagen} alt={premium ? 'Bus de dos pisos' : 'Bus de un piso'} className="hidden h-40 w-full object-cover xl:block"/></aside>
      <div className="min-w-0 rounded-lg border border-blue-100 p-3 sm:p-4"><h1 className="text-2xl font-bold">Selecciona tus asientos</h1><p className="mb-5 mt-2 text-sm text-indigo-700">Selecciona un asiento por pasajero. Completa los 2 para continuar.</p><SelectorAsientos mapa={datos} cantidad={2} seleccion={seleccion} onChange={cambiar}/></div>
      <aside className="rounded-lg border border-blue-100 p-4"><h2 className="border-b border-blue-100 pb-3 text-lg font-bold">{premium ? 'Resumen de tu selección' : 'Resumen de tarifas'}</h2><div className="my-3 flex gap-3"><img src={imagen} alt="Bus del viaje de ejemplo" className="h-16 w-20 rounded object-cover"/><p className="text-sm leading-6"><strong>Quito → Guayaquil</strong><br/>{premium ? '06:00 → 14:30' : '13:00 → 21:30'}<br/>Directo</p></div><p className="rounded bg-blue-50 p-3 text-sm font-bold">{seleccion.length} de 2 asientos seleccionados</p><ul className="my-4 space-y-3">{elegidos.map(c => <li key={c.id} className="flex items-center justify-between gap-2 text-sm"><strong>{c.codigo}</strong><span>$ {precio.toFixed(2)}</span><button type="button" aria-label={'Quitar asiento ' + c.codigo} className="min-h-10 min-w-8 text-xl text-red-600" onClick={() => cambiar(seleccion.filter(id => id !== c.id))}>×</button></li>)}</ul>{!seleccion.length && <p className="my-4 text-sm text-slate-500">Elige tus asientos en el plano.</p>}<dl className="space-y-3 border-t border-blue-100 py-4 text-sm"><div className="flex justify-between"><dt>Tarifa base ({seleccion.length} asientos)</dt><dd>$ {(precio * seleccion.length).toFixed(2)}</dd></div><div className="flex justify-between"><dt>Tarifa de servicio</dt><dd>$ 0.00</dd></div><div className="flex justify-between rounded bg-blue-50 p-3 text-base font-bold"><dt>Total estimado</dt><dd>$ {(precio * seleccion.length).toFixed(2)}</dd></div></dl><p className="mb-4 rounded bg-blue-50 p-3 text-xs leading-5">Los descuentos se aplican al completar los pasajeros. Los importes de esta muestra son de ejemplo.</p><button type="button" disabled={seleccion.length !== 2} className="min-h-12 w-full rounded bg-[#ff0018] px-4 text-white disabled:opacity-50" onClick={() => setContinuado(true)}>Continuar →</button>{continuado && <p role="status" className="mt-3 rounded bg-green-50 p-3 text-sm">Selección completa: {elegidos.map(c => c.codigo).join(', ')}. El siguiente paso son los pasajeros; esta vista previa no crea una reserva.</p>}</aside>
    </div>
  </section>;
}

function GruposHabilitados() {
  return <GruposHabilitadosEditor inicial={{ version: 1, frecuenciaId: 'preview-frecuencia', grupoIds: ['preview-confort'] }} frecuencias={[{ id: 'preview-frecuencia', codigo: 'FRE-008', origen: 'Quito', destino: 'Loja', hora: '07:00', activa: true }, { id: 'preview-ambato', codigo: 'FRE-009', origen: 'Ambato', destino: 'Quito', hora: '09:00', activa: true }]} grupos={[
    { id: 'preview-ejecutivo', nombre: 'Ejecutivo', descripcion: 'Unidades de dos pisos', activo: true, buses: Array.from({ length: 6 }, (_, i) => ({ id: 'preview-ej-' + i, unidad: String(18 + i).padStart(3, '0'), activo: true })), frecuenciaIds: [] },
    { id: 'preview-confort', nombre: 'Confort', descripcion: 'Unidades de un piso', activo: true, buses: Array.from({ length: 8 }, (_, i) => ({ id: 'preview-conf-' + i, unidad: String(25 + i).padStart(3, '0'), activo: true })), frecuenciaIds: ['preview-frecuencia', 'preview-ambato'] },
    { id: 'preview-regional', nombre: 'Regional', descripcion: 'Servicio regional', activo: true, buses: Array.from({ length: 4 }, (_, i) => ({ id: 'preview-reg-' + i, unidad: String(40 + i).padStart(3, '0'), activo: true })), frecuenciaIds: [] },
  ]} />;
}
function ConfigGlobal() {
  return <EditorConfiguracionGlobal inicial={{ version: 1, idioma: 'es-EC', moneda: 'USD', zonaHoraria: 'America/Guayaquil', sesionHoras: 8, mfaAdministradores: false, formatos: ['JPG', 'PNG', 'PDF'], maxArchivoMB: 5, correo: false, whatsapp: false }} canales={{ correo: false, whatsapp: false }} admiteMfa={false} />;
}
function Identidad() {
  return <EditorIdentidad inicial={{ version: 1, nombre: 'Gran Continental', razonSocial: 'Cooperativa de transporte', ruc: '', lema: 'El camino merece grandeza.', logoUrl: '/images/Logo G-C.png', primario: '#ff0018', secundario: '#00833e', texto: '#08035b', email: '', telefono: '', whatsapp: '', direccion: '', facebook: '', instagram: '' }} />;
}
function BusEjecutivoPreview({ normal = false }: { normal?: boolean }) {
  const [inicial] = useState(() => ({ version: 1, unidad: '', placa: '', chasis: 'Scania', carroceria: normal ? 'Marcopolo Paradiso 1200' : 'Marcopolo Paradiso 1800 DD', correo: '', grupoId: normal ? 'preview-normal' : 'preview-ejecutivo', propietario: '', activo: true, pisos: normal ? 1 : 2, filas: normal ? 10 : 6, celdas: normal ? plantillaNormal(10, 'preview-normal') : plantillaEjecutivo(6, 'preview-ejecutivo'), servicios: ['wifi', 'bano'], fotos: [], planoEnUso: false }));
  return <EditorBus inicial={inicial} grupos={[{ id: 'preview-ejecutivo', nombre: 'Ejecutivo' }, { id: 'preview-normal', nombre: 'Normal' }]} clases={[{ id: 'preview-normal', codigo: 'NORMAL', nombre: 'Normal' }, { id: 'preview-ejecutivo', codigo: 'EJECUTIVO', nombre: 'Ejecutivo' }]} chasis={['Scania', 'Mercedes-Benz']} carrocerias={['Marcopolo Paradiso 1800 DD', 'Marcopolo Paradiso 1200']} servicios={[{ id: 'wifi', nombre: 'WiFi' }, { id: 'bano', nombre: 'Baño' }, { id: 'climatizacion', nombre: 'Climatización' }, { id: 'usb', nombre: 'USB' }, { id: 'pantallas', nombre: 'Pantallas' }, { id: 'reclinacion', nombre: 'Asientos reclinables' }]} existentes={[]} />;
}
export function VistaMikel({ seccion }: { seccion: Exclude<Seccion, 'inicio'> }) {
  return <div className="py-5 text-blue-950">
    {(seccion === 'buses' || seccion === 'bus-normal') && (
      <nav aria-label="Tipo de bus" className="mb-4 flex flex-wrap gap-3">
        <Link to="/vista-previa/cooperativa" className={boton}>← Volver al resumen</Link>
        {[
          ['/vista-previa/cooperativa/buses/ejecutivo', 'Ejecutivo · dos pisos'],
          ['/vista-previa/cooperativa/buses/normal', 'Normal · un piso'],
        ].map(([ruta, nombre]) => (
          <NavLink key={ruta} to={ruta} className={({ isActive }) => `${boton} ${isActive ? 'border-blue-700 bg-blue-50 ring-1 ring-blue-700' : ''}`}>{nombre}</NavLink>
        ))}
      </nav>
    )}
    {seccion === 'normal' && <SelectorDemo key="normal" />}
    {seccion === 'premium' && <SelectorDemo key="premium" premium />}
    {seccion === 'buses' && <BusEjecutivoPreview key="ejecutivo" />}
    {seccion === 'bus-normal' && <BusEjecutivoPreview key="normal" normal />}
    {seccion === 'grupos' && <GruposHabilitados />}
    {seccion === 'global' && <ConfigGlobal />}
    {seccion === 'identidad' && <Identidad />}
  </div>;
}
const enlacesVistas = [
  ['3.1 · Asientos Normal', '/vista-previa/mikel-v3/asientos-normal', 'Cliente'],
  ['3.2 · Asientos Premium', '/vista-previa/mikel-v3/asientos-premium', 'Cliente'],
  ['11.4 · Configuración global', '/vista-previa/panel/configuracion/global', 'Administrador'],
  ['16 · Bus Ejecutivo', '/vista-previa/cooperativa/buses/ejecutivo', 'Cooperativa'],
  ['16.1 · Bus Normal', '/vista-previa/cooperativa/buses/normal', 'Cooperativa'],
  ['17.1 · Grupos habilitados', '/vista-previa/cooperativa/frecuencias/grupos', 'Cooperativa'],
  ['19 · Identidad y contacto', '/vista-previa/cooperativa/configuracion', 'Cooperativa'],
];
export function IndiceCooperativa() {
  return <section className="py-5"><h2 className="mb-4 text-2xl font-bold text-blue-950">Vistas de la cooperativa</h2><div className="grid gap-4 sm:grid-cols-2">{enlacesVistas.filter(([, , panel]) => panel === 'Cooperativa').map(([titulo, ruta]) => <Link key={ruta} to={ruta} className={boton}>{titulo}</Link>)}</div></section>;
}
export default function MikelV3Panel({ inicial = 'inicio' }: { inicial?: Seccion }) {
  if (inicial !== 'inicio') return <VistaMikel seccion={inicial} />;
  return <section className="mx-auto my-5 max-w-[1440px] rounded-lg bg-white p-5 text-blue-950"><h1 className="text-3xl font-bold">Vistas de Mikel</h1><p className="my-4">Cada enlace abre la vista dentro de su panel. Las vistas de asientos conservan el flujo de cliente. Vista previa sin guardado en el servidor.</p><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{enlacesVistas.map(([titulo, ruta, panel]) => <Link key={ruta} to={ruta} className="rounded-lg border border-blue-100 p-5 hover:bg-blue-50"><strong className="block">{titulo}</strong><span className="mt-2 block text-sm">{panel}</span></Link>)}</div></section>;
}
