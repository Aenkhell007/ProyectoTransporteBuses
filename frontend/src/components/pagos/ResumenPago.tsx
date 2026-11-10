import type { DatosPago } from "../../../../shared/pagos";
import { BusImagen } from "../compra/BusImagen";
import { Icono } from "../compra/Icono";
import { nombreGrupo } from "../compra/TripCard";
import { diaEnEcuador, formatearFechaLarga, formatearHora, formatearDuracion, minutosEntre } from "../../features/compra/fechas";
const dinero=(n:number)=>`$ ${(n/100).toFixed(2)}`;
const tarjeta="rounded-lg border border-indigo-100 bg-white p-4";
const titulo="mb-3 border-b border-indigo-50 pb-3 text-lg font-bold text-[#08035b]";

export default function ResumenPago({datos}:{datos:DatosPago}) {
 const v=datos.viaje,q=datos.cotizacion;
 return <div className="space-y-3 text-sm text-[#08035b]">
  <section className={tarjeta} aria-labelledby="resumen-viaje">
   <h2 id="resumen-viaje" className={titulo}>Resumen de tu viaje</h2>
   <div className="flex gap-3">
    <BusImagen pisos={v.pisos} alt="Ilustración del servicio seleccionado" className="h-24 w-24 shrink-0 rounded-lg"/>
    <div className="min-w-0"><span className="inline-block rounded bg-green-50 px-2 py-1 text-xs text-green-800">{nombreGrupo(v.servicio,v.pisos)}</span><p className="my-2 font-bold">{v.origen} → {v.destino}</p><p className="flex gap-1.5 text-xs leading-5 text-indigo-500"><Icono nombre="calendario" className="h-4 w-4"/>{formatearFechaLarga(diaEnEcuador(v.salida))}</p><p className="mt-1 flex gap-1.5 text-xs text-indigo-500"><Icono nombre="reloj" className="h-4 w-4"/>{formatearHora(v.salida)} → {formatearHora(v.llegada)}</p></div>
   </div>
   <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-xs text-indigo-500"><span className="flex gap-1"><Icono nombre="ubicacion" className="h-4 w-4 text-green-700"/>{v.terminalOrigen}</span><span>→</span><span className="flex gap-1"><Icono nombre="ubicacion" className="h-4 w-4 text-green-700"/>{v.terminalDestino}</span></div>
   <ul className="my-4 space-y-2 text-xs leading-5 text-indigo-500">
    <li className="flex gap-2"><Icono nombre="bus" className="h-4 w-4"/><span>Cooperativa: {v.cooperativa}</span></li>
    <li className="flex gap-2"><Icono nombre="bus" className="h-4 w-4"/><span>Unidad {v.unidad} · Placa {v.placa}</span></li>
    <li className="flex gap-2"><Icono nombre="asiento" className="h-4 w-4"/><span>Asientos: {datos.pasajeros.map(p=>p.asiento).join(", ") || "Sin pasajeros registrados"}</span></li>
    <li className="flex gap-2"><Icono nombre="personas" className="h-4 w-4"/><span>{datos.reserva.cantidad} {datos.reserva.cantidad===1?'pasajero':'pasajeros'}</span></li>
   </ul>
   <details className="rounded-md border border-indigo-100 px-3 text-blue-700"><summary className="cursor-pointer py-3">Ver detalles del viaje</summary><dl className="space-y-2 pb-3 text-xs leading-5 text-slate-600"><div><dt className="font-bold">Chasis / carrocería</dt><dd>{v.chasis} · {v.carroceria}</dd></div><div><dt className="font-bold">Duración</dt><dd>{formatearDuracion(minutosEntre(v.salida,v.llegada))}</dd></div><div><dt className="font-bold">Ubicación</dt><dd>{[...new Set(datos.pasajeros.map(p=>p.piso))].map(p=>v.pisos>1?(p===1?'Piso inferior':'Piso superior'):'Un piso').join(', ')}</dd></div></dl></details>
  </section>
  <section className={tarjeta} aria-labelledby="precios-pago"><h2 id="precios-pago" className={titulo}>Detalle de precios</h2>
   {q?<dl className="space-y-2">
    {datos.pasajeros.map(p=><div key={p.asiento} className="flex justify-between gap-2 border-b border-indigo-50 pb-2 text-xs"><dt className="text-indigo-500">Asiento {p.asiento} ({p.categoria})</dt><dd className="font-semibold">{dinero(p.tarifaCentavos-p.descuentoCentavos)}</dd></div>)}
    <div className="flex justify-between text-xs"><dt className="text-indigo-500">Tarifa base</dt><dd>{dinero(q.base_centavos)}</dd></div>
    <div className="flex justify-between text-xs"><dt className="text-indigo-500">Descuentos</dt><dd className="text-green-700">{q.descuento_centavos?'- ':''}{dinero(q.descuento_centavos)}</dd></div>
    <div className="flex justify-between text-xs"><dt className="text-indigo-500">Tarifa de servicio</dt><dd>{dinero(q.servicio_centavos)}</dd></div>
    <div className="flex justify-between text-xs"><dt className="text-indigo-500">IVA</dt><dd>{dinero(q.iva_centavos)}</dd></div>
    <div className="flex flex-wrap justify-between gap-1 rounded bg-linear-to-r from-green-50 to-green-100 p-2 text-lg font-bold text-black"><dt>{datos.compra?.estado==='CONFIRMADA'?'Total pagado':'Total a pagar'}</dt><dd>{dinero(datos.compra?.estado==='CONFIRMADA'?datos.compra.totalPagadoCentavos:q.total_centavos)}</dd></div>
   </dl>:<p className="text-slate-600">La reserva todavía no tiene una cotización.</p>}
  </section>
  <section className={tarjeta} aria-labelledby="pasajeros-pago"><h2 id="pasajeros-pago" className={titulo}>Pasajeros</h2><ol className="space-y-3">{datos.pasajeros.map((p,i)=><li key={p.asiento} className="flex items-start gap-2 border-b border-indigo-50 pb-3 last:border-0 last:pb-0"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs text-white">{i+1}</span><div className="min-w-0 flex-1"><p className="text-xs leading-5">{p.nombre}</p><p className="text-xs text-indigo-400">{p.categoria}</p></div><span className="rounded bg-blue-50 px-2 text-xs">{p.asiento}</span><strong className="text-xs">{dinero(p.tarifaCentavos-p.descuentoCentavos)}</strong></li>)}</ol></section>
 </div>;
}
