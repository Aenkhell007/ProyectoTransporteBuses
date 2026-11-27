import FlotaBusesVista from '../../components/flota/FlotaBusesVista';
import GruposGestion from '../../components/flota/GruposGestion';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import EditorBus, { type BusEditorDatos } from '../../components/flota/EditorBus';
import EditorIdentidad from '../../components/configuracion/EditorIdentidad';
import OficinasCooperativa from '../../components/configuracion/OficinasCooperativa';
import EditorConfiguracionGlobal from '../../components/configuracion/EditorConfiguracionGlobal';
import GruposHabilitadosEditor from '../../components/flota/GruposHabilitadosEditor';
import { leerHttpCache } from '../../services/http';
import { CargaSeccion, useMostrarCarga } from '../../components/ui/CargaSeccion';
import { useAuth } from '../../features/auth/AuthContext';
import { editorApi } from '../../features/flota/editorApi';
import { plantillaNormal } from '../../features/flota/plantillasPlano';

function rutaAmbito(ruta: string, cooperativaId?: string) {
  return cooperativaId ? `${ruta}?cooperativaId=${encodeURIComponent(cooperativaId)}` : ruta;
}

function useCarga<T>(cargar: () => Promise<T>, clave = '', rutaCache?: string) {
  const inicial = rutaCache ? leerHttpCache<T>(rutaCache) : null;
  const [datos, setDatos] = useState<T | null>(inicial), [error, setError] = useState(''), [turno, setTurno] = useState(0);
  const mostrarCarga = useMostrarCarga(!datos && !error, 250);
  useEffect(() => {
    let vivo = true;
    const enCache = turno === 0 && rutaCache ? leerHttpCache<T>(rutaCache) : null;
    if (enCache) {
      setDatos(enCache);
      setError('');
    } else {
      setDatos(null);
      setError('');
    }
    cargar().then(r => { if (vivo) setDatos(r); }).catch((e: unknown) => { if (vivo && !enCache) setError(e instanceof Error ? e.message : 'No se pudo consultar el servidor.'); });
    return () => { vivo = false; };
  // La clave representa la selección; reintentar repite la consulta sin borrar formularios montados.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, turno]);
  const aviso = error
    ? <section className="space-y-3 py-6" aria-live="polite"><p role="alert">{error}</p><button type="button" className="rounded border px-4 py-2" onClick={() => setTurno(t => t + 1)}>Reintentar consulta</button><Link className="ml-4 underline" to="/iniciar-sesion">Iniciar sesión</Link></section>
    : mostrarCarga ? <CargaSeccion /> : null;
  return { datos, aviso };
}
function ConAmbito({ permiso, children }: { permiso: string; children: (id: string) => ReactNode }) {
  const rutaAmbitos = permiso === 'config.admin' ? '/mikel/identidad/ambitos' : `/mikel/ambitos/${encodeURIComponent(permiso)}`;
  const { datos, aviso } = useCarga(() => permiso === 'config.admin' ? editorApi.ambitosIdentidad() : editorApi.ambitos(permiso), permiso, rutaAmbitos);
  const [params, setParams] = useSearchParams();
  const seleccion = params.get('cooperativaId');
  useEffect(() => {if(datos?.cooperativas.length&&!seleccion){const p=new URLSearchParams(params);p.set('cooperativaId',datos.cooperativas[0].id);setParams(p,{replace:true});}},[datos,seleccion,setParams]);
  if (!datos) return aviso;
  const cooperativaId = datos.cooperativas.find(c => c.id === seleccion)?.id ?? datos.cooperativas[0]?.id;
  if (!cooperativaId) return <p>No hay cooperativas autorizadas para este editor.</p>;
  return <section className="space-y-4">
    {datos.cooperativas.length > 1 && <label className="block max-w-md text-sm text-blue-900">Cooperativa
      <select aria-label="Cooperativa de configuración" className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2" value={cooperativaId} onChange={e => { const p = new URLSearchParams(params); p.set('cooperativaId',e.target.value); setParams(p); }}>
        {datos.cooperativas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
    </label>}
    <div key={cooperativaId}>{children(cooperativaId)}</div>
  </section>;
}
export function IdentidadConectada() {
  return <ConAmbito permiso="config.admin">{id => <IdentidadDeCooperativa cooperativaId={id} />}</ConAmbito>;
}
function IdentidadDeCooperativa({ cooperativaId }: { cooperativaId: string }) {
  const { refrescar } = useAuth();
  const { datos, aviso } = useCarga(() => editorApi.identidad(cooperativaId), cooperativaId, rutaAmbito('/mikel/identidad', cooperativaId));
  if (!datos) return aviso;
  return (
    <div className="space-y-4">
      <EditorIdentidad inicial={datos} onGuardar={async (d, logo) => { const r = await editorApi.guardarIdentidad(d, logo, cooperativaId); await refrescar().catch(() => {}); return r; }} />
      <OficinasCooperativa
        inicial={datos.oficinas ?? []}
        onCrear={(d) => editorApi.crearOficina(d, cooperativaId)}
        onActualizar={(id, d) => editorApi.actualizarOficina(id, d, cooperativaId)}
      />
    </div>
  );
}
export function GruposGestionConectada() { return <ConAmbito permiso="flota.admin">{id => <GruposDeCooperativa cooperativaId={id} />}</ConAmbito>; }
function GruposDeCooperativa({ cooperativaId }: { cooperativaId: string }) {
  const { datos, aviso } = useCarga(() => editorApi.listarGrupos(cooperativaId), cooperativaId, rutaAmbito('/mikel/grupos', cooperativaId));
  return datos ? <GruposGestion cooperativaId={cooperativaId} inicial={datos.grupos} onCrear={(d) => editorApi.crearGrupo(d, cooperativaId)} onActualizar={(id, d) => editorApi.actualizarGrupo(id, d, cooperativaId)} /> : aviso;
}
export function GlobalConectada() {
  const { datos, aviso } = useCarga(editorApi.global, '', '/mikel/global');
  return datos ? <EditorConfiguracionGlobal inicial={datos.datos} canales={datos.canales} admiteMfa={datos.admiteMfa} onGuardar={editorApi.guardarGlobal} /> : aviso;
}
export function CompatibilidadesConectadas() { return <ConAmbito permiso="operacion.admin">{id => <CompatibilidadesDeCooperativa cooperativaId={id} />}</ConAmbito>; }
function CompatibilidadesDeCooperativa({ cooperativaId }: { cooperativaId: string }) {
  const { datos, aviso } = useCarga(() => editorApi.compatibilidades(cooperativaId), cooperativaId, rutaAmbito('/mikel/compatibilidades', cooperativaId));
  if (!datos) return aviso;
  if (!datos.frecuencias.length) return <p className="py-6">No hay frecuencias registradas en tu cooperativa. Registra una frecuencia antes de habilitar sus grupos.</p>;
  const f = datos.frecuencias[0];
  return <GruposHabilitadosEditor grupos={datos.grupos} frecuencias={datos.frecuencias} inicial={{version:f.version,frecuenciaId:f.id,grupoIds:datos.grupos.filter(g=>g.frecuenciaIds.includes(f.id)).map(g=>g.id)}} onGuardar={d => editorApi.guardarCompatibilidades(d,cooperativaId)} />;
}
export function BusesConectados() { return <ConAmbito permiso="flota.admin">{id => <BusesDeCooperativa cooperativaId={id} />}</ConAmbito>; }
function BusesDeCooperativa({ cooperativaId }: { cooperativaId: string }) {
  const { datos, aviso } = useCarga(() => editorApi.catalogos(cooperativaId), cooperativaId, rutaAmbito('/mikel/buses', cooperativaId));
  return datos ? <FlotaBusesVista cooperativaId={cooperativaId} buses={datos.buses} grupos={datos.grupos} /> : aviso;
}
export function BusConectado() { return <ConAmbito permiso="flota.admin">{id => <BusDeCooperativa cooperativaId={id} />}</ConAmbito>; }
function BusDeCooperativa({ cooperativaId }: { cooperativaId: string }) {
  const { id = 'nuevo' } = useParams(); const navigate = useNavigate();
  const { datos, aviso } = useCarga(async () => {
    const [catalogos, bus] = await Promise.all([
      editorApi.catalogos(cooperativaId),
      id === 'nuevo' ? Promise.resolve(null) : editorApi.bus(id, cooperativaId),
    ]);
    return { catalogos, bus };
  }, id + cooperativaId);
  if (!datos) return aviso;
  const c=datos.catalogos;
  if(!c.grupos.length || !c.clases.length) return <p className="py-6">Faltan grupos activos o clases de asiento en el catálogo. Configúralos antes de registrar un bus.</p>;
  const clase=c.clases.find(k=>k.codigo==='NORMAL')??c.clases[0];
  const inicial: BusEditorDatos = datos.bus ?? {version:1,unidad:'',placa:'',chasis:'',carroceria:'',correo:'',propietario:'',activo:true,grupoId:c.grupos[0].id,pisos:1,filas:10,celdas:plantillaNormal(10,clase.id),servicios:[],fotos:[],planoEnUso:false};
  return <div className="py-3"><EditorBus key={id} inicial={inicial} grupos={c.grupos} ambitoOperacion={c.ambitoOperacion} clases={c.clases} servicios={c.servicios} existentes={c.buses} chasis={c.chasis ?? (inicial.chasis ? [inicial.chasis] : [])} carrocerias={c.carrocerias ?? (inicial.carroceria ? [inicial.carroceria] : [])} volverHref={"/cooperativa/buses?cooperativaId="+cooperativaId} onGuardar={async(d,f,v)=>{const r=await editorApi.guardarBus(d,f,v,cooperativaId); if(r.id!==id)navigate(`/cooperativa/buses/${r.id}?cooperativaId=${cooperativaId}`,{replace:true});return r;}} /></div>;
}
