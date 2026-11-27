import {I,iconoRol,colorRol,LogoCooperativa} from './Visual';
import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router';
import {AMBITOS_OPERACION,PROVINCIAS_ECUADOR,type AmbitoOperacion} from '../../constants/ecuador';
import {identidadApi} from './api';
import type{Cooperativa,Usuario}from'./api';
import{useAdministracion,Carga,Caja,Fila,Estado,Avisos,campo,boton,primario}from'./ui';

const NOMBRES_PERMISO: Record<string, string> = {
  'cooperativa.leer': 'Consultar su cooperativa',
  'flota.admin': 'Gestionar su propia flota',
  'operacion.admin': 'Frecuencias y hoja de ruta',
  'oficina.vender': 'Vender boletos',
  'pagos.revisar': 'Revisar comprobantes',
  'identidad.admin': 'Gestionar usuarios y roles',
  'cooperativas.admin': 'Administrar cooperativas',
};

export default function AccesosPage(){
  const a=useAdministracion();
  const[params]=useSearchParams();
  const[uid,setUid]=useState(params.get('usuario')||'');
  const[cid,setCid]=useState(params.get('cooperativa')||'');
  const[usuario,setUsuario]=useState<Usuario|null>(null);
  const[coop,setCoop]=useState<Cooperativa|null>(null);
  const[asignacion,setAsignacion]=useState({rol:'CLIENTE',cooperativaId:'',oficinaId:'',membresiaId:''});
  const[asignacionInicial,setAsignacionInicial]=useState('');
  const[confirmarInvitar,setConfirmarInvitar]=useState(false);
  const dialogoRef=useRef<HTMLDialogElement>(null);

  useEffect(()=>{
    const el=dialogoRef.current;
    if(!el)return;
    if(confirmarInvitar&&!el.open)el.showModal();
    if(!confirmarInvitar&&el.open)el.close();
  },[confirmarInvitar]);

  useEffect(()=>{
    if(!a.datos)return;
    const u=a.datos.usuarios.find(u=>u.id===uid)||(!uid?(a.datos.usuarios.find(v=>v.membresias.some(m=>m.activa&&m.rol==='COOPERATIVA'))??a.datos.usuarios.find(v=>v.membresias.some(m=>m.activa))??a.datos.usuarios[0]):undefined);
    setUsuario(u??null);
    const m=u?.membresias.find(m=>m.activa);
    const inicial={rol:u?.globales.includes('ADMIN_SISTEMA')?'ADMIN_SISTEMA':m?.rol??'CLIENTE',cooperativaId:m?.cooperativaId??'',oficinaId:m?.oficinaId??'',membresiaId:m?.id??''};
    setAsignacion(inicial);
    setAsignacionInicial(JSON.stringify(inicial));
  },[a.datos,uid]);

  useEffect(()=>{
    if(!a.datos)return;
    const c=a.datos.cooperativas.find(c=>c.id===(cid||usuario?.membresias[0]?.cooperativaId))||a.datos.cooperativas[0];
    setCoop(c??null);
  },[a.datos,cid,usuario?.id]);

  if(!a.datos)return <Carga error={a.error}/>;
  const d=a.datos;
  const permisosRol=d.roles.find(r=>r.codigo===asignacion.rol)?.permisos??[];
  const permisosNegados=Object.keys(NOMBRES_PERMISO).filter(p=>!permisosRol.includes(p));

  return (
    <section className="space-y-4 py-3 text-blue-900">
      <header>
        <h1 className="text-3xl font-bold">Cooperativas, usuarios y roles</h1>
        <p className="mt-1">Registra cooperativas y asigna responsables con el acceso adecuado.</p>
        <div className="mt-3 flex flex-wrap justify-end gap-3">
          <Link className={boton} to="/panel/cooperativas/nueva"><I nombre="mas"/>Nueva cooperativa</Link>
          <Link className={boton} to="/panel/usuarios/nuevo"><I nombre="mas"/>Nuevo usuario</Link>
        </div>
      </header>
      <Avisos error={a.error} mensaje={a.mensaje}/>
      <fieldset disabled={a.ocupado} className="grid min-w-0 items-stretch gap-4 lg:grid-cols-2">
        <Caja titulo="Datos de la cooperativa" icono="cooperativa">
          <div className="mb-4 flex items-center gap-3">
            <LogoCooperativa nombre={coop?.nombre??''} logoArchivoId={coop?.logo_archivo_id}/>
            <span className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700"><I nombre="editar" clase="size-4"/>Editando</span>
          </div>
          <Fila nombre="Cooperativa">
            <select className={campo} value={coop?.id??''} onChange={e=>setCid(e.target.value)}>
              {d.cooperativas.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Fila>
          {coop ? (
            <form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();const amb=(coop.ambito_operacion??'INTERPROVINCIAL') as AmbitoOperacion;if(amb!=='INTERPROVINCIAL'&&!(coop.provincia??'').trim()){a.setError('Selecciona la provincia de operación para cooperativas urbanas o rurales.');return;}void a.ejecutar(async()=>{a.setDatos(await identidadApi.cooperativa(coop.id,{...coop,ambito_operacion:amb,provincia:coop.provincia?.trim()||null}));a.setMensaje('Cooperativa guardada.');});}}>
              {[['nombre','Nombre comercial *'],['razon_social','Razón social *'],['ruc','RUC *'],['soporte_email','Correo de contacto'],['telefono','Teléfono']].map(([k,n])=>(
                <Fila key={k} nombre={n}>
                  <input className={campo} required={['nombre','razon_social','ruc'].includes(k)} type={k==='soporte_email'?'email':'text'} value={String(coop[k as keyof Cooperativa]??'')} onChange={e=>setCoop({...coop,[k]:e.target.value})}/>
                </Fila>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <Fila nombre="Ámbito de operación *">
                  <select className={campo} value={coop.ambito_operacion??'INTERPROVINCIAL'} onChange={e=>{const ambito=e.target.value as AmbitoOperacion;setCoop({...coop,ambito_operacion:ambito,provincia:ambito==='INTERPROVINCIAL'?'':(coop.provincia??'')});}}>
                    {AMBITOS_OPERACION.map(op=><option key={op.codigo} value={op.codigo}>{op.etiqueta}</option>)}
                  </select>
                </Fila>
                <Fila nombre={(coop.ambito_operacion??'INTERPROVINCIAL')==='INTERPROVINCIAL'?'Provincia sede (opcional)':'Provincia de operación *'}>
                  <select className={campo} required={(coop.ambito_operacion??'INTERPROVINCIAL')!=='INTERPROVINCIAL'} value={coop.provincia??''} onChange={e=>setCoop({...coop,provincia:e.target.value})}>
                    <option value="">Selecciona provincia…</option>
                    {PROVINCIAS_ECUADOR.map(prov=><option key={prov} value={prov}>{prov}</option>)}
                  </select>
                </Fila>
              </div>
              <Fila nombre="Estado">
                <select className={campo} value={String(coop.activa)} onChange={e=>setCoop({...coop,activa:e.target.value==='true'})}>
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </Fila>
              <p className="rounded bg-blue-50 p-3 text-xs">Los responsables se asignan al crear la cooperativa o el usuario. El estado de la cooperativa no elimina su historial.</p>
              <button className={boton+' w-full'} type="submit"><I nombre="guardar"/>Guardar cooperativa</button>
            </form>
          ) : <p className="mt-4">Todavía no hay cooperativas.</p>}
        </Caja>

        <Caja titulo="Usuario responsable">
          <Fila nombre="Usuario">
            <select className={campo} value={usuario?.id??''} onChange={e=>setUid(e.target.value)}>
              {d.usuarios.map(u=><option key={u.id} value={u.id}>{u.nombres} {u.apellidos} · {u.email}</option>)}
            </select>
          </Fila>
          {usuario ? (
            <form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();void a.ejecutar(async()=>{a.setDatos(await identidadApi.usuario(usuario.id,{...usuario,...(JSON.stringify(asignacion)!==asignacionInicial?{asignacion}:{})}));a.setMensaje('Usuario guardado.');});}}>
              <div className="grid gap-3 sm:grid-cols-2">
                {[['nombres','Nombres *'],['apellidos','Apellidos *']].map(([k,n])=>(
                  <Fila key={k} nombre={n}><input required className={campo} value={String(usuario[k as keyof Usuario]??'')} onChange={e=>setUsuario({...usuario,[k]:e.target.value})}/></Fila>
                ))}
              </div>
              <Fila nombre="Documento"><input className={campo} value={usuario.documento} readOnly/></Fila>
              <Fila nombre="Correo"><input className={campo} value={usuario.email} readOnly/></Fila>
              <Fila nombre="Teléfono / WhatsApp"><input className={campo} value={usuario.telefono??''} onChange={e=>setUsuario({...usuario,telefono:e.target.value})}/></Fila>
              <Fila nombre="Rol">
                <select className={campo} disabled={usuario.id===d.actor} value={asignacion.rol} onChange={e=>setAsignacion({...asignacion,rol:e.target.value})}>
                  {d.roles.map(r=><option key={r.codigo} value={r.codigo}>{r.nombre}</option>)}
                </select>
              </Fila>
              {!['ADMIN_SISTEMA','CLIENTE'].includes(asignacion.rol) && (
                <>
                  <Fila nombre="Cooperativa asignada">
                    <select required className={campo} value={asignacion.cooperativaId} onChange={e=>setAsignacion({...asignacion,cooperativaId:e.target.value,oficinaId:''})}>
                      <option value="">Selecciona…</option>
                      {d.cooperativas.filter(c=>c.activa).map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </Fila>
                  <Fila nombre="Oficina">
                    <select className={campo} value={asignacion.oficinaId} onChange={e=>setAsignacion({...asignacion,oficinaId:e.target.value})}>
                      <option value="">Toda la cooperativa</option>
                      {d.oficinas.filter(o=>o.cooperativa_id===asignacion.cooperativaId).map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>
                  </Fila>
                </>
              )}
              <p className="text-xs">Cambiar la asignación restablece sus permisos individuales y cierra sus sesiones. Elegir Cliente desactiva sus asignaciones de personal.</p>
              <Fila nombre="Estado">
                <select className={campo} disabled={usuario.id===d.actor} value={String(usuario.activo)} onChange={e=>setUsuario({...usuario,activo:e.target.value==='true'})}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </Fila>
              <Estado activo={usuario.activo}/>
              <button className={primario+' w-full'} type="submit"><I nombre="usuario"/>Guardar usuario</button>
              <button className={boton+' w-full'} type="button" disabled={!usuario.activo} onClick={()=>setConfirmarInvitar(true)}>
                <I nombre="enviar"/>Enviar enlace de acceso
              </button>
              <Link className={boton+' w-full'} to="/panel/usuarios">Ver y gestionar permisos</Link>
            </form>
          ) : <p className="mt-4">Selecciona un usuario.</p>}
        </Caja>
      </fieldset>

      <Caja titulo="Permisos del rol seleccionado" icono="configuracion">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
          <div>
            <div className="grid gap-2 sm:grid-cols-2">
              {permisosRol.map(p=>(
                <span key={p} className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-xs text-green-800">
                  <I nombre="check" clase="size-4"/>{NOMBRES_PERMISO[p]??p}
                </span>
              ))}
              {permisosNegados.map(p=>(
                <span key={p} className="flex items-center gap-2 rounded-md bg-slate-100 p-3 text-xs text-slate-500">
                  <I nombre="bloqueo" clase="size-4"/>{NOMBRES_PERMISO[p]}
                </span>
              ))}
              {!permisosRol.length && <p className="rounded bg-blue-50 p-3 text-sm sm:col-span-2">Gestiona sus propias compras y viajes.</p>}
            </div>
            <p className="mt-3 flex items-center gap-2 rounded bg-blue-50 p-3 text-xs"><I nombre="info"/>Los permisos se asignan según el rol y la cooperativa.</p>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><I nombre="grupo"/>Roles disponibles</h3>
            <div className="flex flex-wrap gap-2">
              {d.roles.map(r=>(
                <span key={r.codigo} className={'flex items-center gap-2 rounded-md border px-2 py-2 text-xs '+(asignacion.rol===r.codigo?'border-blue-500 bg-blue-50':'border-blue-100')}>
                  <span className={colorRol(r.codigo)}><I nombre={iconoRol(r.codigo)}/></span>
                  {r.codigo==='COOPERATIVA'?'Cooperativa':r.codigo==='ADMIN_SISTEMA'?'Administrador':r.nombre}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Caja>

      <dialog ref={dialogoRef} aria-labelledby="confirmar-invitacion" onCancel={e=>{e.preventDefault();if(!a.ocupado)setConfirmarInvitar(false);}} className="m-auto w-[calc(100%-32px)] max-w-md rounded-xl border border-blue-100 bg-white p-0 text-blue-950 shadow-2xl backdrop:bg-slate-950/40">
        <div className="p-5">
          <h2 id="confirmar-invitacion" className="mb-2 flex items-center gap-2 text-lg font-bold text-[#1002b4]">
            <I nombre="correo" clase="size-6 text-blue-700"/>Enviar enlace de acceso
          </h2>
          <p className="text-sm text-slate-700">
            ¿Deseas enviar un enlace de activación y acceso al correo <strong>{usuario?.email}</strong>?
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={boton} disabled={a.ocupado} onClick={()=>setConfirmarInvitar(false)}>Cancelar</button>
            <button type="button" className={primario} disabled={a.ocupado||!usuario} onClick={()=>{if(!usuario)return;void a.ejecutar(async()=>{setConfirmarInvitar(false);a.setMensaje((await identidadApi.invitar(usuario.id)).mensaje);});}}>
              {a.ocupado?'Enviando…':'Enviar enlace'}
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
