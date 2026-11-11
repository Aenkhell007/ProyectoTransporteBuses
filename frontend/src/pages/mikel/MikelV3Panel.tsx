import EditorIdentidad from '../../components/configuracion/EditorIdentidad';
import GruposHabilitadosEditor from '../../components/flota/GruposHabilitadosEditor';
import EditorConfiguracionGlobal from '../../components/configuracion/EditorConfiguracionGlobal';
import { useMemo, useState } from 'react';
import SelectorAsientos from '../../components/flota/SelectorAsientos';
import EditorBus from '../../components/flota/EditorBus';
import { plantillaEjecutivo, plantillaNormal } from '../../features/flota/plantillasPlano';

import type { CeldaMapa, MapaViaje } from '../../types/mapaViaje';

type Seccion = 'inicio' | 'normal' | 'premium' | 'buses' | 'bus-normal' | 'grupos' | 'global' | 'identidad';
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
  return <GruposHabilitadosEditor inicial={{ version: 1, frecuenciaId: 'preview-frecuencia', grupoIds: ['preview-confort'] }} frecuencias={[{ id: 'preview-frecuencia', codigo: 'FRE-008', origen: 'Quito', destino: 'Loja', hora: '07:00', activa: true }]} grupos={[
    { id: 'preview-ejecutivo', nombre: 'Ejecutivo', descripcion: 'Unidades de dos pisos', activo: true, buses: [], frecuenciaIds: [] },
    { id: 'preview-confort', nombre: 'Confort', descripcion: 'Unidades de un piso', activo: true, buses: [], frecuenciaIds: ['preview-frecuencia'] },
    { id: 'preview-regional', nombre: 'Regional', descripcion: 'Servicio regional', activo: false, buses: [], frecuenciaIds: [] },
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
  return <EditorBus inicial={inicial} grupos={[{ id: 'preview-ejecutivo', nombre: 'Ejecutivo' }, { id: 'preview-normal', nombre: 'Normal' }]} clases={[{ id: normal ? 'preview-normal' : 'preview-ejecutivo', codigo: normal ? 'NORMAL' : 'EJECUTIVO', nombre: normal ? 'Normal' : 'Ejecutivo' }]} chasis={['Scania', 'Mercedes-Benz']} carrocerias={['Marcopolo Paradiso 1800 DD']} servicios={[{ id: 'wifi', nombre: 'WiFi' }, { id: 'bano', nombre: 'Baño' }, { id: 'climatizacion', nombre: 'Climatización' }, { id: 'usb', nombre: 'USB' }, { id: 'pantallas', nombre: 'Pantallas' }, { id: 'reclinacion', nombre: 'Asientos reclinables' }]} existentes={[]} />;
}
export default function MikelV3Panel({ inicial = 'inicio' }: { inicial?: Seccion }) {
  const [seccion, setSeccion] = useState<Seccion>(inicial);
  const menu: Array<[Seccion, string]> = [['inicio','Resumen'],['normal','3.1 Normal'],['premium','3.2 Premium'],['buses','16 Bus Ejecutivo'],['bus-normal','16.1 Bus Normal'],['grupos','17.1 Grupos'],['global','11.4 Global'],['identidad','19 Identidad']];
  return <section className="mx-auto my-5 w-[calc(100%-24px)] max-w-[1440px] rounded-lg bg-slate-50 p-4 text-blue-950 sm:p-6"><header className="mb-5"><p className="text-sm font-semibold uppercase tracking-wide text-red-600">MIKEL V3 · Flota y configuración</p><h1 className="mt-1 text-3xl font-bold">Flujo de demostración de las 7 vistas</h1><p className="mt-2 text-slate-600">Selecciona una vista para recorrer el módulo completo. Los mapas reutilizan el selector común y conservan la regla de pasillo separado de asiento.</p></header><nav className="mb-5 flex flex-wrap gap-2" aria-label="Vistas de Mikel">{menu.map(([id, label]) => <button key={id} type="button" className={seccion === id ? activo : boton} onClick={() => setSeccion(id)}>{label}</button>)}</nav>{seccion === 'inicio' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{menu.slice(1).map(([id,label]) => <button key={id} type="button" onClick={() => setSeccion(id)} className="rounded-lg border border-blue-100 bg-white p-5 text-left shadow-sm hover:border-red-300"><span className="text-lg font-bold">{label}</span><span className="mt-2 block text-sm text-slate-600">Abrir pantalla y continuar el flujo.</span></button>)}</div>}{seccion === 'normal' && <SelectorDemo/>}{seccion === 'premium' && <SelectorDemo premium/>}{seccion === 'buses' && <BusEjecutivoPreview key="ejecutivo"/>}{seccion === 'bus-normal' && <BusEjecutivoPreview key="normal" normal/>}{seccion === 'grupos' && <GruposHabilitados/>}{seccion === 'global' && <ConfigGlobal/>}{seccion === 'identidad' && <Identidad/>}</section>;
}
