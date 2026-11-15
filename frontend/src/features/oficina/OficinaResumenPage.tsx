import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Icono, type NombreIcono } from "../../components/compra/Icono";
import type { OficinaResumenResponse } from "./OficinaResumenPage.types";
import { ConsultaEstado, dinero, Estado, useConsulta } from "./ui";

const accion = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#ff0018] bg-[#ff0018] px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:min-h-12";
const enlace = "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-blue-500 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600";
function Bloque({titulo, icono, accion: boton, children}: {titulo:string; icono:NombreIcono; accion?:ReactNode; children:ReactNode}) {
 return <section className="min-w-0 rounded-lg border border-blue-100 bg-white p-3 sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-xl font-bold tracking-tight text-[#1002b4] sm:text-2xl"><Icono nombre={icono} className="size-8 sm:size-9" />{titulo}</h2>{boton}</div>{children}</section>;
}
export function OficinaResumenPage() {
 const [fecha,setFecha]=useState(new Date().toLocaleDateString("en-CA",{timeZone:"America/Guayaquil"}));
 const c=useConsulta<OficinaResumenResponse>("/oficina/resumen?fecha="+fecha);
 const d=c.datos;
 const pendientes=d?.kpis.comprobantesPendientes ?? 0;
 return <div className="of-vista space-y-4 pb-2 text-[#0b1248]">
  <div className="flex justify-end"><label className="flex items-center gap-2 text-xs text-blue-900"><span>Fecha de consulta</span><input aria-label="Fecha de consulta" type="date" required value={fecha} onChange={e=>{if(e.target.value)setFecha(e.target.value)}} className="h-9 rounded-md border border-blue-200 bg-white px-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-600" /></label></div>
  <ConsultaEstado {...c} />
  {d && <>
   <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
    {([
      {nombre:"Ventas de hoy",valor:dinero(d.kpis.ventasHoy),icono:"dinero",color:"bg-green-100 text-green-700"},
      {nombre:"Asientos vendidos",valor:d.kpis.asientosVendidos,icono:"asiento",color:"bg-blue-100 text-blue-600"},
      {nombre:"Comprobantes pendientes",valor:pendientes,icono:"documento",color:"bg-amber-100 text-amber-500"},
      {nombre:"Reservas confirmadas",valor:d.kpis.reservasConfirmadas,icono:"calendario",color:"bg-violet-100 text-violet-700"}
    ] satisfies {nombre:string;valor:string|number;icono:NombreIcono;color:string}[]).map(i=><div key={i.nombre} className="flex min-w-0 items-center gap-2 rounded-md border border-blue-100 bg-white p-3 sm:gap-3 sm:p-4 lg:min-h-28"><span className={"grid size-11 shrink-0 place-items-center rounded-full sm:size-16 "+i.color}><Icono nombre={i.icono} className="size-7 sm:size-9" /></span><div className="min-w-0"><p className="text-xs leading-snug text-blue-700 sm:text-sm">{i.nombre}</p><strong className="mt-1 block text-2xl leading-tight font-bold tracking-tight text-[#10069b] tabular-nums sm:text-3xl">{i.valor}</strong></div></div>)}
   </div>
   <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-linear-to-r from-amber-50 to-orange-50/50 p-3 sm:gap-4 sm:p-4"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-500"><Icono nombre="alerta" className="size-9" /></span><div className="min-w-0 flex-1"><h2 className="text-base font-bold tracking-tight text-red-600 sm:text-xl">{pendientes === 0 ? "No hay comprobantes pendientes de revisión." : pendientes+" "+(pendientes === 1 ? "comprobante espera revisión." : "comprobantes esperan revisión.")}</h2><p className="mt-1 text-sm text-blue-900">Revisa y valida los comprobantes pendientes de la oficina.</p></div><Link className={accion+" w-full sm:w-auto"} to="comprobantes"><Icono nombre="documento" />Revisar comprobantes</Link></div>
   <Bloque titulo="Comprobantes pendientes" icono="documento" accion={<Link className={accion+" w-full sm:w-auto"} to="ventas"><span className="grid size-5 place-items-center rounded-full bg-white text-lg leading-none text-red-600" aria-hidden="true">+</span>Nueva venta en oficina</Link>}>
    <div className="hidden grid-cols-[1.15fr_1.3fr_1.15fr_.6fr_1fr_1.2fr] items-center gap-3 rounded-md bg-linear-to-r from-blue-50 to-blue-100/70 px-3 py-3 text-sm font-semibold text-blue-800 lg:grid" aria-hidden="true">{["Reserva","Cliente","Viaje","Monto","Estado","Acción"].map(t=><span key={t}>{t}</span>)}</div>
    {!d.comprobantesPendientes.length && <p className="rounded-md border border-dashed border-blue-100 px-4 py-6 text-center text-sm text-blue-900">No hay comprobantes pendientes para esta oficina.</p>}
    {d.comprobantesPendientes.map(p=><article key={p.id} className="mt-2 grid min-w-0 grid-cols-2 items-center gap-2 rounded-md border border-blue-100 p-3 text-sm text-blue-700 lg:mt-0 lg:grid-cols-[1.15fr_1.3fr_1.15fr_.6fr_1fr_1.2fr] lg:gap-3 lg:rounded-none lg:border-0 lg:border-b lg:py-4"><strong className="min-w-0 wrap-anywhere lg:font-normal">{p.reserva}</strong><div className="justify-self-end lg:order-5 lg:justify-self-start"><Estado valor={p.estado} /></div><span className="col-span-2 lg:order-2 lg:col-span-1">{p.cliente}</span><span className="lg:order-3">{p.viaje}</span><strong className="justify-self-end lg:order-4 lg:justify-self-start">{dinero(p.monto)}</strong><Link className={enlace+" col-span-2 lg:order-6 lg:col-span-1"} to={"comprobantes/"+p.id}><Icono nombre="documento" className="size-4" />Ver comprobante</Link></article>)}
   </Bloque>
   <Bloque titulo="Próximas salidas" icono="bus">
    <div className="hidden grid-cols-[1.3fr_.55fr_.8fr_1fr_.65fr_1fr] items-center gap-3 rounded-md bg-linear-to-r from-blue-50 to-blue-100/70 px-3 py-3 text-sm font-semibold text-blue-800 lg:grid" aria-hidden="true">{["Ruta","Hora","Unidad","Asientos vendidos","Capacidad","Acción"].map(t=><span key={t}>{t}</span>)}</div>
    {!d.proximasSalidas.length && <p className="rounded-md border border-dashed border-blue-100 px-4 py-6 text-center text-sm text-blue-900">No hay próximas salidas publicadas para esta fecha.</p>}
    {d.proximasSalidas.map(v=><article key={v.id} className="mt-2 grid grid-cols-2 items-center gap-2 rounded-md border border-blue-100 p-3 text-sm text-blue-700 lg:mt-0 lg:grid-cols-[1.3fr_.55fr_.8fr_1fr_.65fr_1fr] lg:gap-3 lg:rounded-none lg:border-0 lg:border-b lg:py-4"><strong className="text-base">{v.ruta}</strong><span>{v.hora}</span><span>Unidad {v.unidad}</span><span className="font-semibold text-green-700">{v.asientosVendidos}<span className="lg:hidden"> / {v.capacidad} vendidos</span></span><span className="hidden lg:inline">{v.capacidad}</span><Link className={enlace+" col-span-2 lg:col-span-1"} to={"reservas?viaje="+v.id}><Icono nombre="bus" className="size-4" />Ver detalles</Link></article>)}
   </Bloque>
  </>}
 </div>;
}
