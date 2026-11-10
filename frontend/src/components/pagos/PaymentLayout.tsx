import ResumenPago from "./ResumenPago";
import type { DatosPago } from "../../../../shared/pagos";
import type { ReactNode } from "react";
import BookingProgress from "./BookingProgress";

interface Props {datos?:DatosPago;title:string;description?:string;children:ReactNode}
// Las tres vistas mantienen el mismo ancho y la misma posición del resumen.
export default function PaymentLayout({datos,title,description,children}:Props){
 return <section className="mx-auto my-5 w-[calc(100%-24px)] max-w-[1440px] rounded-lg bg-white p-4 text-[#08035b] sm:w-[calc(100%-36px)] sm:p-5">
  <BookingProgress/>
  <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
   <div className="min-w-0"><header className="mb-5"><h1 className="text-2xl font-bold tracking-tight">{title}</h1>{description&&<p className="mt-1 text-sm leading-6 text-indigo-500">{description}</p>}</header>{children}</div>
   <aside className="min-w-0" aria-label="Resumen de la reserva">{datos?<ResumenPago datos={datos}/>:<section className="rounded-lg border border-indigo-100 p-4"><h2 className="text-lg font-bold">Resumen de tu viaje</h2><p className="mt-3 text-sm text-slate-600">No hay una reserva cargada.</p></section>}</aside>
  </div>
 </section>;
}
