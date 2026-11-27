import type { ReservaPendiente } from "../../types/compra/reserva";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Icono } from "../../components/compra/Icono";
import { http } from "../../services/http";
import type { ReservaOficina } from "./datos";
import { pagoEstado } from "./datos";
import { Dialogo, Aviso, ConsultaEstado, dinero, Estado, etiquetaEstado, Indicadores, useConsulta } from "./ui";
const control="mt-1 min-h-11 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800 outline-none placeholder:text-indigo-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const enlace="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-blue-500 bg-white px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50";
const fechaViaje=(v:string)=>new Date(v).toLocaleDateString("es-EC",{timeZone:"America/Guayaquil",day:"2-digit",month:"short",year:"numeric"});
const horaViaje=(v:string)=>new Date(v).toLocaleTimeString("es-EC",{timeZone:"America/Guayaquil",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
export function OficinaReservasPage() {
 const c=useConsulta<{reservas:ReservaOficina[]}>("/oficina/reservas");
 const [params,setParams]=useSearchParams();
 const [q,Q]=useState(""),[fecha,F]=useState(""),[estado,E]=useState(""),[pago,P]=useState(""),[ruta,R]=useState("");
 const [detalle,D]=useState<ReservaPendiente|null>(null),[error,X]=useState(""),[abriendo,A]=useState<string|null>(null);
 const todas=c.datos?.reservas??[];
 const busqueda=q.trim().toLowerCase();
 const lista=todas.filter(r=>(!params.get("viaje")||r.viaje_id===params.get("viaje"))&&(!busqueda||[r.compra_codigo??"",r.id,r.cliente].join(" ").toLowerCase().includes(busqueda))&&(!fecha||new Date(r.salida).toLocaleDateString("en-CA",{timeZone:"America/Guayaquil"})===fecha)&&(!estado||r.estado_actual===estado)&&(!pago||pagoEstado(r)===pago)&&(!ruta||r.ruta===ruta));
 const conFiltros=!!(q||fecha||estado||pago||ruta||params.get("viaje"));
 function limpiar(){Q("");F("");E("");P("");R("");const p=new URLSearchParams(params);p.delete("viaje");setParams(p);}
 async function ver(id:string){if(abriendo)return;X("");A(id);try{D(await http<ReservaPendiente>("/oficina/reservas/"+id));}catch(e){X((e as Error).message)}finally{A(null)}}
 function accion(r:ReservaOficina){return r.comprobante_id&&r.comprobante_estado==="EN_REVISION" ? <Link className={enlace+" w-full"} to={"../comprobantes/"+r.comprobante_id}><Icono nombre="documento" className="size-4" />Ver comprobante</Link> : <button className={enlace+" w-full"} disabled={!!abriendo} onClick={()=>void ver(r.id)}><Icono nombre="documento" className="size-4" />{abriendo===r.id?"Abriendo…":"Ver reserva"}</button>}
 return <div className="of-vista space-y-4 pb-2">
  <header><h1 className="text-3xl font-bold tracking-tight text-[#1002b4]">Reservas</h1><p className="mt-1 text-sm text-blue-800 sm:text-base">Consulta las compras de tu cooperativa y oficina.</p></header>
  <ConsultaEstado {...c} />{error&&<p role="alert" className="rounded-md bg-red-50 p-3 text-red-700">{error}</p>}
  {c.datos&&<>
   <Indicadores items={[
    {nombre:"Pendiente de pago",color:"ambar",valor:todas.filter(r=>r.estado_actual==="PENDIENTE"&&pagoEstado(r)==="Pendiente").length},
    {nombre:"En revisión",color:"azul",valor:todas.filter(r=>pagoEstado(r)==="En revisión").length},
    {nombre:"Confirmada",color:"verde",valor:todas.filter(r=>r.estado_actual==="CONFIRMADA").length},
    {nombre:"Vencida",color:"rojo",valor:todas.filter(r=>r.estado_actual==="VENCIDA").length}
   ]} />
   <section aria-label="Filtros de reservas" className="rounded-lg border border-blue-100 bg-white p-3 sm:p-4">
    <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr]">
     <label className="text-sm text-blue-800 sm:col-span-2 xl:col-span-1">Buscar por código o cliente<span className="relative block"><Icono nombre="lupa" className="pointer-events-none absolute top-4 left-3 size-5 text-indigo-500" /><input className={control+" pl-10"} value={q} onChange={e=>Q(e.target.value)} placeholder="Código de reserva o nombre del cliente" /></span></label>
     <label className="text-sm text-blue-800">Fecha de viaje<input type="date" className={control} value={fecha} onChange={e=>F(e.target.value)} /></label>
     <label className="text-sm text-blue-800">Ruta<select className={control} value={ruta} onChange={e=>R(e.target.value)}><option value="">Todas</option>{[...new Set(todas.map(r=>r.ruta))].map(r=><option key={r}>{r}</option>)}</select></label>
     <label className="text-sm text-blue-800">Estado de reserva<select className={control} value={estado} onChange={e=>E(e.target.value)}><option value="">Todos</option>{["PENDIENTE","CONFIRMADA","VENCIDA","CANCELADA"].map(e=><option key={e} value={e}>{etiquetaEstado(e)}</option>)}</select></label>
     <label className="text-sm text-blue-800">Estado de pago<select className={control} value={pago} onChange={e=>P(e.target.value)}><option value="">Todos</option>{["Pagado","En revisión","Rechazado","Pendiente"].map(e=><option key={e}>{e}</option>)}</select></label>
     <Link to="../ventas" className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-md bg-[#ff0018] px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-blue-600 xl:justify-self-end"><span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-white text-xl leading-none text-red-600">+</span>Nueva venta en oficina</Link>
    </div>
    {conFiltros&&<div className="mt-3 flex items-center justify-between gap-3 border-t border-blue-100 pt-3 text-sm"><span>{lista.length} reservas encontradas{params.get("viaje")?" · Viaje seleccionado":""}</span><button className="text-blue-700 underline underline-offset-2" onClick={limpiar}>Limpiar filtros</button></div>}
   </section>
   <section className="min-w-0 rounded-lg border border-blue-100 bg-white p-3 sm:p-4">
    <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold tracking-tight text-[#1002b4]"><Icono nombre="calendario" className="size-8" />Reservas<span className="ml-auto text-xs font-normal text-blue-700 lg:hidden">{lista.length} registros</span></h2>
    {!lista.length&&<Aviso>No hay reservas que coincidan con los filtros.</Aviso>}
    <div className="hidden lg:block"><table className="w-full table-fixed text-left text-sm"><colgroup><col className="w-[13%]"/><col className="w-[13%]"/><col className="w-[10%]"/><col className="w-[13%]"/><col className="w-[8%]"/><col className="w-[8%]"/><col className="w-[11%]"/><col className="w-[11%]"/><col className="w-[13%]"/></colgroup><thead><tr>{["Código","Cliente","Ruta","Fecha de viaje","Asientos","Monto","Estado reserva","Estado pago","Acción"].map(t=><th className="text-xs" key={t}>{t}</th>)}</tr></thead><tbody>{lista.map(r=><tr key={r.id} className="text-blue-700"><td><button className="block w-full truncate text-left text-sm hover:underline" title={r.compra_codigo??r.id} onClick={()=>void ver(r.id)} disabled={!!abriendo}>{r.compra_codigo??r.id}</button></td><td className="wrap-break-word">{r.cliente}</td><td className="wrap-break-word">{r.ruta}</td><td><span className="block">{fechaViaje(r.salida)}</span><span>{horaViaje(r.salida)}</span></td><td className="wrap-break-word">{r.asientos??r.cantidad+(r.cantidad===1?" pasajero":" pasajeros")}</td><td className="font-semibold whitespace-nowrap">{dinero(Number(r.total_centavos??0)/100)}</td><td><Estado valor={r.estado_actual}/></td><td><Estado valor={pagoEstado(r)}/></td><td>{accion(r)}</td></tr>)}</tbody></table></div>
    <div className="space-y-3 lg:hidden">{lista.map(r=><article key={r.id} className="rounded-md border border-blue-100 p-3 text-sm text-blue-800"><div className="flex items-start justify-between gap-3"><button className="min-w-0 truncate text-left font-bold text-blue-700 underline-offset-2 hover:underline" onClick={()=>void ver(r.id)} title={r.compra_codigo??r.id} disabled={!!abriendo}>{r.compra_codigo??r.id}</button><Estado valor={r.estado_actual}/></div><p className="mt-1">{r.cliente}</p><p className="mt-1">{r.ruta} · {fechaViaje(r.salida)} {horaViaje(r.salida)}</p><div className="my-3 flex flex-wrap items-center gap-2"><span>{r.asientos??r.cantidad+(r.cantidad===1?" pasajero":" pasajeros")}</span><strong className="border-l border-blue-100 pl-2">{dinero(Number(r.total_centavos??0)/100)}</strong><Estado valor={pagoEstado(r)}/></div>{accion(r)}</article>)}</div>
    <p className="mt-3 text-sm text-blue-800">Mostrando {lista.length} {lista.length === 1 ? "reserva" : "reservas"}</p>
   </section>
  </>}
  {detalle&&<Dialogo titulo="Detalle de reserva" cerrar={()=>D(null)}><div className="space-y-3"><p className="text-sm wrap-anywhere"><strong>Identificador completo:</strong> {detalle.reserva_id}</p><Estado valor={detalle.estado}/><p>Viaje: {detalle.viaje.origen.ciudad} → {detalle.viaje.destino.ciudad}</p><p>Salida: {fechaViaje(detalle.viaje.salida)} {horaViaje(detalle.viaje.salida)}</p><p>Asientos: {detalle.asientos?.map(a=>a.codigo).join(", ")||"Sin asientos activos"}</p><h3 className="font-bold">Pasajeros registrados</h3>{detalle.pasajeros?.map((p,i)=><p key={i}>{p.nombres} {p.apellidos} · {p.documento}</p>)}<p className="border-t border-blue-100 pt-3 font-bold">Total: {dinero(Number(detalle.cotizacion?.total_centavos??0)/100)}</p></div></Dialogo>}
 </div>;
}
