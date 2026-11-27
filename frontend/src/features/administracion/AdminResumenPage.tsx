import { escalaRegistros } from "./escalaRegistros";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  fetchAdminResumenData,
  mensajeErrorResumen,
} from "./AdminResumenPage.service";
import { Icono, type NombreIcono } from "../../components/compra/Icono";
import { Dialogo, Indicadores } from "../oficina/ui";
import type {
  CooperativaItem,
  AdminResumenResponse,
} from "./AdminResumenPage.types";

type EstadoResumen =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "listo"; datos: AdminResumenResponse };

export function AdminResumenPage() {
  const navigate = useNavigate();
  const [detalle, setDetalle] = useState<CooperativaItem | null>(null);
  const [estado, setEstado] = useState<EstadoResumen>({ tipo: "cargando" });
  const [intento, setIntento] = useState(0);
  const [fecha, setFecha] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }),
  );

  useEffect(() => {
    const consulta = new AbortController();
    fetchAdminResumenData(undefined, fecha, consulta.signal)
      .then((datos) => {
        if (!consulta.signal.aborted) setEstado({ tipo: "listo", datos });
      })
      .catch((error: unknown) => {
        if (!consulta.signal.aborted) {
          setEstado({ tipo: "error", mensaje: mensajeErrorResumen(error) });
        }
      });
    return () => consulta.abort();
  }, [intento, fecha]);

  if (estado.tipo === "cargando") {
    return (
      <p role="status" className="p-4">
        Cargando panel de administración…
      </p>
    );
  }

  if (estado.tipo === "error") {
    return (
      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <p role="alert">{estado.mensaje}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md border border-blue-700 px-3 py-2 text-blue-900"
            onClick={() => {
              setEstado({ tipo: "cargando" });
              setIntento((anterior) => anterior + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const datos = estado.datos;

  const { kpis, cooperativas, usuariosPorRol, tendenciaUsuarios } = datos;
  const escala=escalaRegistros(tendenciaUsuarios.map(t=>t.registros));
  const puntos=tendenciaUsuarios.map((t,i)=>({...t,x:tendenciaUsuarios.length===1?280:44+i*464/(tendenciaUsuarios.length-1),y:174-t.registros/escala.tope*144}));
  const linea=puntos.map(p=>p.x+","+p.y).join(" ");
  const area=puntos.length>1?puntos[0].x+",174 "+linea+" "+puntos[puntos.length-1].x+",174":"";
  const rolVisible=(rol:string)=>/admin/i.test(rol)?"Administrador":/oficin/i.test(rol)?"Oficinista":/cooperativa/i.test(rol)?"Cooperativa":/chofer|conductor/i.test(rol)?"Chofer":/cliente/i.test(rol)?"Cliente":rol;
  const orden=["Cliente","Oficinista","Cooperativa","Chofer","Administrador"];
  const roles=orden.map(rol=>({rol,cantidad:usuariosPorRol.filter(r=>rolVisible(r.rol)===rol).reduce((n,r)=>n+r.cantidad,0)}));
  const extras=usuariosPorRol.filter(r=>!orden.includes(rolVisible(r.rol)));roles.push(...extras);
  const iconoRol=(rol:string):NombreIcono=>rol==="Cooperativa"?"personas":rol==="Oficinista"?"oficina":rol==="Chofer"?"usuarioCuenta":"persona";
  const etiquetaFecha=(valor:string)=>/^\d{4}-\d{2}-\d{2}$/.test(valor)?new Date(valor+"T12:00:00").toLocaleDateString("es-EC",{day:"2-digit",month:"short"}):valor;
  const estadoCoop=(coop:CooperativaItem)=><span className={"inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs "+(coop.estado==="Activa"?"bg-green-100 text-green-800":"bg-slate-100 text-slate-600")}><span className="size-2 rounded-full bg-current"/>{coop.estado}</span>;
  const logo=(coop:CooperativaItem)=>/gran continental/i.test(coop.nombre)&&!/prueba/i.test(coop.nombre)?<img src="/images/Logo G-C.png" alt="" className="h-10 w-16 shrink-0 object-contain"/>:<Icono nombre="montana" className="h-10 w-16 text-blue-700"/>;
  return <div className="of-vista space-y-4 pb-2">
   <div className="flex justify-end"><label className="flex items-center gap-2 text-xs text-blue-900">Fecha del informe<input type="date" required value={fecha} onChange={e=>{if(e.target.value){setEstado({tipo:"cargando"});setFecha(e.target.value)}}} className="h-9 rounded-md border border-blue-200 bg-white px-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"/></label></div>
   <Indicadores items={[{nombre:"Cooperativas activas",valor:kpis.cooperativasActivas},{nombre:"Usuarios registrados",valor:kpis.usuariosRegistrados},{nombre:"Oficinas",valor:kpis.oficinas},{nombre:"Buses registrados",valor:kpis.busesRegistrados}]}/>
   <div className="flex flex-wrap items-center gap-4 rounded-lg border border-sky-200 bg-linear-to-r from-sky-50 to-sky-100 p-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-sky-500 text-white"><Icono nombre="info" className="size-8"/></span><div className="min-w-0 flex-1"><p className="text-base font-bold tracking-tight text-blue-900 sm:text-lg">Cada cooperativa gestiona sus buses y frecuencias.</p><p className="mt-1 text-sm text-blue-900">Los oficinistas validan los comprobantes de pago.</p></div><button onClick={()=>navigate("/panel/cooperativas")} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"><Icono nombre="personas"/>Ver cooperativas</button></div>
   <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
    <section className="min-w-0 rounded-lg border border-blue-100 bg-white p-3 sm:p-4"><h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight text-[#1002b4] sm:text-xl"><Icono nombre="grafico" className="size-7"/>Usuarios registrados · últimos 7 días</h2>{!puntos.length?<p className="p-4 text-sm text-blue-800">No hay registros en este período.</p>:<svg className="h-auto min-h-48 w-full" viewBox="0 0 552 218" role="img"><title>Usuarios registrados por día: {puntos.map(p=>etiquetaFecha(p.fecha)+": "+p.registros).join("; ")}</title>{escala.marcas.map(n=><g key={n}><line x1="44" y1={174-n/escala.tope*144} x2="508" y2={174-n/escala.tope*144} stroke="#dce8f6"/><text x="34" y={178-n/escala.tope*144} fontSize="11" textAnchor="end" fill="#244488">{n}</text></g>)}{puntos.map(p=><line key={p.fecha} x1={p.x} y1="30" x2={p.x} y2="174" stroke="#e8eff9"/>)}{area&&<polygon points={area} fill="#d5f5df" fillOpacity=".85"/>}<polyline points={linea} fill="none" stroke="#009c41" strokeWidth="3"/>{puntos.map(p=><g key={p.fecha}><circle cx={p.x} cy={p.y} r="5" fill="#008c38" stroke="white" strokeWidth="2"><title>{etiquetaFecha(p.fecha)}: {p.registros}</title></circle><text x={p.x} y="198" fontSize="11" textAnchor="middle" fill="#244488">{etiquetaFecha(p.fecha)}</text></g>)}</svg>}</section>
    <section className="min-w-0 rounded-lg border border-blue-100 bg-white p-3 sm:p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#1002b4] sm:text-xl"><Icono nombre="personas" className="size-7"/>Usuarios por rol</h2><span className="text-xs text-blue-700">Total: {kpis.usuariosRegistrados}</span></div><div className="space-y-3">{roles.map(r=><div key={r.rol} className="grid grid-cols-[minmax(130px,1.2fr)_2rem_minmax(0,1fr)] items-center gap-2 text-sm"><span className="flex min-w-0 items-center gap-2 text-blue-800"><span className={"grid size-8 shrink-0 place-items-center rounded-full "+(r.rol==="Cooperativa"?"bg-green-50 text-green-700":r.rol==="Oficinista"?"bg-violet-50 text-violet-700":r.rol==="Chofer"?"bg-orange-50 text-orange-600":"bg-blue-50 text-blue-700")}><Icono nombre={iconoRol(r.rol)} className="size-5"/></span><span className="min-w-0 wrap-break-word">{r.rol}</span></span><strong className="text-right text-blue-950">{r.cantidad}</strong><div className="h-3 overflow-hidden rounded-full bg-slate-200" role="meter" aria-label={r.rol} aria-valuemin={0} aria-valuemax={Math.max(kpis.usuariosRegistrados,r.cantidad,1)} aria-valuenow={r.cantidad}><div className="h-full rounded-full bg-linear-to-r from-green-600 to-green-400" style={{width:Math.min(100,r.cantidad/Math.max(kpis.usuariosRegistrados,1)*100)+"%"}}/></div></div>)}</div></section>
   </div>
   <section className="rounded-lg border border-blue-100 bg-white p-3 sm:p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-xl font-bold tracking-tight text-[#1002b4] sm:text-2xl"><Icono nombre="personas" className="size-8"/>Cooperativas registradas</h2><button onClick={()=>navigate("/panel/cooperativas")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#ff0018] px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"><span className="grid size-5 place-items-center rounded-full bg-white text-lg leading-none text-red-600" aria-hidden="true">+</span>Nueva cooperativa</button></div>
   <div className="hidden lg:block"><table className="w-full table-fixed text-left text-sm"><colgroup><col className="w-[32%]"/><col className="w-[30%]"/><col className="w-[10%]"/><col className="w-[13%]"/><col className="w-[15%]"/></colgroup><thead><tr>{["Cooperativa","Responsable","Buses","Estado","Acción"].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{cooperativas.map(coop=><tr key={coop.id}><td><div className="flex items-center gap-3">{logo(coop)}<strong className="min-w-0 wrap-break-word text-blue-900">{coop.nombre}</strong></div></td><td className="wrap-break-word text-blue-800">{coop.responsable}</td><td className="font-semibold text-blue-800">{coop.buses}</td><td>{estadoCoop(coop)}</td><td><button onClick={()=>setDetalle(coop)} className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-md border border-blue-500 px-2 py-1 text-sm text-blue-700 hover:bg-blue-50"><Icono nombre="documento" className="size-4"/>Ver detalle</button></td></tr>)}</tbody></table></div>
   <div className="space-y-2 lg:hidden">{cooperativas.map(coop=><button key={coop.id} onClick={()=>setDetalle(coop)} className="flex w-full items-center gap-3 rounded-md border border-blue-100 p-3 text-left text-sm">{logo(coop)}<span className="min-w-0 flex-1"><strong className="block wrap-break-word text-blue-900">{coop.nombre}</strong><small className="block text-blue-700">{coop.responsable}</small></span><span className="shrink-0 text-blue-800">{coop.buses}<small className="block">buses</small></span>{estadoCoop(coop)}<Icono nombre="chevronDerecha" className="size-4 text-blue-700"/></button>)}</div>
   {!cooperativas.length&&<p className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">No hay cooperativas registradas.</p>}
   <p className="mt-3 flex items-center gap-2 text-sm text-blue-800"><Icono nombre="info" className="size-4"/>Asigna un usuario responsable a cada cooperativa.</p>
   </section>
   {detalle&&<Dialogo titulo="Detalle de cooperativa" cerrar={()=>setDetalle(null)}><dl className="space-y-3"><dt className="font-bold">Cooperativa</dt><dd>{detalle.nombre}</dd><dt className="font-bold">Responsable</dt><dd>{detalle.responsable}</dd><dt className="font-bold">Buses registrados</dt><dd>{detalle.buses}</dd><dt className="font-bold">Estado</dt><dd>{detalle.estado}</dd></dl></Dialogo>}
  </div>;
}
export default AdminResumenPage;
