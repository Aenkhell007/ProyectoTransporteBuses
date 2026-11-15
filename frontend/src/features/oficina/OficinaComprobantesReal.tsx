import { useState } from "react";
import { Link } from "react-router";
import { Icono } from "../../components/compra/Icono";
import type { ReservaOficina } from "./datos";
import { ConsultaEstado, dinero, Estado, etiquetaEstado, Indicadores, useConsulta } from "./ui";
const control="mt-1 min-h-11 w-full min-w-0 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800 outline-none placeholder:text-indigo-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const boton="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-blue-500 bg-white px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600";
const nombreTab=(e:string)=>e==="APROBADO"?"Aprobados":e==="RECHAZADO"?"Rechazados":e?etiquetaEstado(e):"Todos";
const dia=(r:ReservaOficina)=>r.recibido?new Date(r.recibido).toLocaleDateString("en-CA",{timeZone:"America/Guayaquil"}):"";
const fecha=(v:string)=>new Date(v).toLocaleDateString("es-EC",{timeZone:"America/Guayaquil",day:"2-digit",month:"short",year:"numeric"});
const hora=(v:string)=>new Date(v).toLocaleTimeString("es-EC",{timeZone:"America/Guayaquil",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
export function OficinaComprobantesReal(){
 const c=useConsulta<{comprobantes:ReservaOficina[]}>("/oficina/comprobantes");
 const [q,Q]=useState(""),[estado,E]=useState(""),[banco,B]=useState(""),[desde,D]=useState(""),[hasta,H]=useState("");
 const todas=c.datos?.comprobantes??[];
 const bancoDe=(r:ReservaOficina)=>r.banco_nombre??"Sin banco";
 const busqueda=q.trim().toLowerCase();
 const lista=todas.filter(r=>(!busqueda||[r.compra_codigo??"",r.id,r.cliente,r.referencia??""].join(" ").toLowerCase().includes(busqueda))&&(!estado||r.comprobante_estado===estado)&&(!banco||bancoDe(r)===banco)&&(!desde||!!dia(r)&&dia(r)>=desde)&&(!hasta||!!dia(r)&&dia(r)<=hasta));
 const conFiltros=!!(q||estado||banco||desde||hasta);
 function limpiar(){Q("");E("");B("");D("");H("");}
 function accion(r:ReservaOficina){const revision=r.comprobante_estado==="EN_REVISION";const rechazo=r.comprobante_estado==="RECHAZADO";return r.comprobante_id?<Link className={boton+" w-full "+(revision?"border-red-500 text-red-600 hover:bg-red-50":"")} to={r.comprobante_id}><Icono nombre={revision?"lupa":rechazo?"info":"documento"} className="size-4" />{revision?"Revisar":rechazo?"Ver motivo":"Ver detalle"}</Link>:<span className="text-xs text-slate-500">Sin archivo disponible</span>}
 function reembolso(r:ReservaOficina){if(!r.reembolso_estado)return <span className="inline-block rounded-md bg-slate-100 px-2 py-2 text-xs text-slate-600">{r.comprobante_estado==="APROBADO"?"Sin solicitud":"No aplica"}</span>;return <span className="inline-block rounded-md bg-blue-50 px-2 py-2 text-xs text-blue-700">{etiquetaEstado(r.reembolso_estado)}{r.reembolso_centavos!=null&&<strong className="mt-1 block">{dinero(Number(r.reembolso_centavos)/100)}</strong>}</span>}
 const monto=(r:ReservaOficina)=>r.reportado_centavos==null?"—":dinero(Number(r.reportado_centavos)/100);
 return <div className="of-vista space-y-4 pb-2">
  <header><h1 className="text-3xl font-bold tracking-tight text-[#1002b4]">Comprobantes de pago</h1><p className="mt-1 text-sm text-blue-800 sm:text-base">Revisa documentos y consulta su historial.</p></header>
  <ConsultaEstado {...c}/>
  {c.datos&&<>
   <Indicadores items={[{nombre:"Total comprobantes",color:"verde",valor:todas.length},{nombre:"En revisión",color:"ambar",valor:todas.filter(r=>r.comprobante_estado==="EN_REVISION").length},{nombre:"Aprobados",color:"verde",valor:todas.filter(r=>r.comprobante_estado==="APROBADO").length},{nombre:"Rechazados",color:"rojo",valor:todas.filter(r=>r.comprobante_estado==="RECHAZADO").length}]}/>
   <div className="grid grid-cols-4 gap-1 sm:gap-2" role="group" aria-label="Filtrar comprobantes por estado">{["","EN_REVISION","APROBADO","RECHAZADO"].map(e=><button type="button" key={e} aria-pressed={estado===e} onClick={()=>E(e)} className={"min-h-10 rounded-t-md px-1 py-2 text-[11px] leading-snug transition focus-visible:outline-2 focus-visible:outline-blue-600 sm:min-h-12 sm:px-3 sm:text-base "+(estado===e?"bg-[#ff0018] font-semibold text-white":"bg-linear-to-r from-blue-50 to-blue-100/70 text-blue-700 hover:bg-blue-100")}>{nombreTab(e)} ({todas.filter(r=>!e||r.comprobante_estado===e).length})</button>)}</div>
   <section aria-label="Filtros de comprobantes" className="rounded-lg border border-blue-100 bg-white p-3 sm:p-4">
    <div className="grid grid-cols-2 items-end gap-3 xl:grid-cols-[2fr_.85fr_1fr_1fr_.85fr]">
     <label className="col-span-2 text-sm text-blue-800 xl:col-span-1">Buscar por reserva, cliente o referencia<span className="relative block"><Icono nombre="lupa" className="pointer-events-none absolute top-4 left-3 size-5 text-indigo-500"/><input className={control+" pl-10"} value={q} onChange={e=>Q(e.target.value)} placeholder="Ej. GC-4587, nombre, REF001"/></span></label>
     <label className="text-sm text-blue-800">Banco<select className={control} value={banco} onChange={e=>B(e.target.value)}><option value="">Todos</option>{[...new Set(todas.map(bancoDe))].map(b=><option key={b}>{b}</option>)}</select></label>
     <label className="order-4 text-sm text-blue-800 xl:order-none">Recibido desde<input type="date" className={control} value={desde} max={hasta||undefined} onChange={e=>D(e.target.value)}/></label>
     <label className="order-5 text-sm text-blue-800 xl:order-none">Hasta<input type="date" className={control} value={hasta} min={desde||undefined} onChange={e=>H(e.target.value)}/></label>
     <label className="text-sm text-blue-800">Estado<select className={control} value={estado} onChange={e=>E(e.target.value)}><option value="">Todos</option>{["EN_REVISION","APROBADO","RECHAZADO"].map(e=><option key={e} value={e}>{nombreTab(e)}</option>)}</select></label>
    </div>
    {conFiltros&&<div className="mt-3 flex justify-between gap-3 border-t border-blue-100 pt-3 text-sm"><span>{lista.length} resultados</span><button onClick={limpiar} className="text-blue-700 underline underline-offset-2">Limpiar filtros</button></div>}
   </section>
   <section aria-label="Comprobantes recibidos" className="min-w-0">
    <h2 className="sr-only">Comprobantes recibidos</h2>
    <div className="hidden overflow-hidden rounded-lg border border-blue-100 lg:block"><table className="w-full table-fixed text-left text-sm"><colgroup><col className="w-[13%]"/><col className="w-[13%]"/><col className="w-[10%]"/><col className="w-[13%]"/><col className="w-[9%]"/><col className="w-[12%]"/><col className="w-[14%]"/><col className="w-[16%]"/></colgroup><thead><tr>{["Reserva","Cliente","Banco","Recibido","Monto","Estado","Reembolso","Acción"].map(t=><th key={t} className="text-xs">{t}</th>)}</tr></thead><tbody>{lista.map(r=><tr key={r.comprobante_id??r.id} className="text-blue-700"><td><span className="block truncate" title={r.compra_codigo??r.id}>{r.compra_codigo??r.id}</span></td><td className="wrap-break-word">{r.cliente}</td><td className="wrap-break-word">{bancoDe(r)}</td><td>{r.recibido?<><span className="block">{fecha(r.recibido)}</span><span>{hora(r.recibido)}</span></>:"—"}</td><td className="font-semibold whitespace-nowrap">{monto(r)}</td><td><Estado valor={r.comprobante_estado??"Pendiente"}/></td><td>{reembolso(r)}</td><td>{accion(r)}</td></tr>)}</tbody></table></div>
    <div className="space-y-3 lg:hidden">{lista.map(r=><article key={r.comprobante_id??r.id} className="rounded-md border border-blue-100 bg-white p-3 text-sm text-blue-800"><div className="flex items-start justify-between gap-3"><strong className="min-w-0 truncate" title={r.compra_codigo??r.id}>{r.compra_codigo??r.id}</strong><Estado valor={r.comprobante_estado??"Pendiente"}/></div><div className="mt-1 flex items-center justify-between gap-3"><span>{r.cliente}</span><strong>{monto(r)}</strong></div><p className="my-2 text-xs">{bancoDe(r)}{r.recibido?" → "+fecha(r.recibido)+" "+hora(r.recibido):""}</p><div className="flex flex-wrap items-center justify-between gap-3">{reembolso(r)}<div>{accion(r)}</div></div></article>)}</div>
    {!lista.length&&<div className="rounded-md border border-dashed border-blue-200 bg-blue-50/40 px-4 py-5 text-center text-sm text-blue-900"><p>{todas.length?"No hay comprobantes que coincidan con estos filtros.":"Todavía no se han recibido comprobantes en tu oficina."}</p>{!todas.length&&<><p className="mt-1">Adjunta un comprobante a una venta por transferencia para habilitar su revisión.</p><div className="mt-3 flex flex-wrap justify-center gap-2"><Link className={boton} to="ejemplo"><Icono nombre="documento" className="size-4"/>Ver ejemplo · Vista 13</Link><Link className={boton} to="../ventas">Crear venta por transferencia</Link></div></>}</div>}
    <p className="mt-2 text-sm text-blue-800">Mostrando {lista.length} comprobantes</p>
   </section>
   <aside className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-linear-to-r from-amber-50 to-orange-50/50 p-3 sm:gap-4 sm:p-4"><Icono nombre="alerta" className="size-10 text-amber-500"/><div className="min-w-0 flex-1"><p className="text-sm font-bold text-red-600">La aprobación del comprobante y la devolución son procesos diferentes.</p><p className="mt-1 text-sm text-blue-900">Un comprobante puede estar aprobado aunque ya se haya realizado un reembolso total o parcial.</p></div><Link to="../reembolsos" className="inline-flex min-h-9 items-center gap-2 text-sm text-blue-700 underline underline-offset-2">Gestionar reembolsos<Icono nombre="flechaDerecha" className="size-5"/></Link></aside>
  </>}
 </div>;
}
