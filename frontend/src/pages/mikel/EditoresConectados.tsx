import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import EditorBus, { type BusEditorDatos } from '../../components/flota/EditorBus';
import EditorIdentidad from '../../components/configuracion/EditorIdentidad';
import EditorConfiguracionGlobal from '../../components/configuracion/EditorConfiguracionGlobal';
import GruposHabilitadosEditor from '../../components/flota/GruposHabilitadosEditor';
import { editorApi } from '../../features/flota/editorApi';
import { plantillaNormal } from '../../features/flota/plantillasPlano';

function useCarga<T>(cargar: () => Promise<T>, clave = '') {
  const [datos, setDatos] = useState<T | null>(null), [error, setError] = useState(''), [turno, setTurno] = useState(0);
  useEffect(() => { let vivo = true; setDatos(null); setError('');
    cargar().then(r => { if (vivo) setDatos(r); }).catch((e: unknown) => { if (vivo) setError(e instanceof Error ? e.message : 'No se pudo consultar el servidor.'); });
    return () => { vivo = false; };
  // La clave representa la selección; reintentar repite la consulta sin borrar formularios montados.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, turno]);
  const aviso = <section className="space-y-3 py-6" aria-live="polite">{error ? <><p role="alert">{error}</p><button type="button" className="rounded border px-4 py-2" onClick={() => setTurno(t => t + 1)}>Reintentar consulta</button><Link className="ml-4 underline" to="/iniciar-sesion">Iniciar sesión</Link></> : <p>Cargando datos del servidor…</p>}</section>;
  return { datos, aviso };
}
export function IdentidadConectada() {
  const { datos, aviso } = useCarga(editorApi.identidad);
  return datos ? <EditorIdentidad inicial={datos} onGuardar={editorApi.guardarIdentidad} /> : aviso;
}
export function GlobalConectada() {
  const { datos, aviso } = useCarga(editorApi.global);
  return datos ? <EditorConfiguracionGlobal inicial={datos.datos} canales={datos.canales} admiteMfa={datos.admiteMfa} onGuardar={editorApi.guardarGlobal} /> : aviso;
}
export function CompatibilidadesConectadas() {
  const { datos, aviso } = useCarga(editorApi.compatibilidades);
  if (!datos) return aviso;
  if (!datos.frecuencias.length) return <p className="py-6">No hay frecuencias registradas en tu cooperativa. Registra una frecuencia antes de habilitar sus grupos.</p>;
  const f = datos.frecuencias[0];
  return <GruposHabilitadosEditor grupos={datos.grupos} frecuencias={datos.frecuencias} inicial={{version:f.version,frecuenciaId:f.id,grupoIds:datos.grupos.filter(g=>g.frecuenciaIds.includes(f.id)).map(g=>g.id)}} onGuardar={editorApi.guardarCompatibilidades} />;
}
export function BusesConectados() {
  const { datos, aviso } = useCarga(editorApi.catalogos);
  return datos ? <section className="space-y-5 py-5"><header className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-bold">Gestión de buses</h1><Link className="rounded bg-red-600 px-5 py-3 text-white" to="nuevo">Nuevo bus</Link></header>{datos.buses.length ? <ul className="grid gap-3 sm:grid-cols-2">{datos.buses.map(b=><li key={b.id} className="rounded border border-blue-100 p-4"><h2 className="font-bold">Unidad {b.unidad}</h2><p>{b.placa} · {b.activo?'Activo':'Inactivo'}</p><Link className="mt-3 inline-block underline" to={b.id}>Editar datos, fotos y plano →</Link></li>)}</ul> : <p>No hay buses registrados. Puedes agregar el primero.</p>}</section> : aviso;
}
export function BusConectado() {
  const { id = 'nuevo' } = useParams(); const navigate = useNavigate();
  const { datos, aviso } = useCarga(async () => ({ catalogos: await editorApi.catalogos(), bus: id === 'nuevo' ? null : await editorApi.bus(id) }), id);
  if (!datos) return aviso;
  const c=datos.catalogos;
  if(!c.grupos.length || !c.clases.length) return <p className="py-6">Faltan grupos activos o clases de asiento en el catálogo. Configúralos antes de registrar un bus.</p>;
  const clase=c.clases.find(k=>k.codigo==='NORMAL')??c.clases[0];
  const inicial: BusEditorDatos = datos.bus ?? {version:1,unidad:'',placa:'',chasis:'',carroceria:'',correo:'',propietario:'',activo:true,grupoId:c.grupos[0].id,pisos:1,filas:10,celdas:plantillaNormal(10,clase.id),servicios:[],fotos:[],planoEnUso:false};
  return <div className="py-5"><Link to="/cooperativa/buses" className="mb-4 inline-block underline">← Volver a la flota</Link><EditorBus key={id} inicial={inicial} grupos={c.grupos} clases={c.clases} servicios={c.servicios} existentes={c.buses} chasis={inicial.chasis?[inicial.chasis]:[]} carrocerias={inicial.carroceria?[inicial.carroceria]:[]} onGuardar={async(d,f,v)=>{const r=await editorApi.guardarBus(d,f,v); if(r.id!==id)navigate(`/cooperativa/buses/${r.id}`,{replace:true});return r;}} /></div>;
}
