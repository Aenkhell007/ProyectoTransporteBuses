import {IconoBiblioteca} from '../ui/IconoBiblioteca';
import type { ReactNode } from "react";
import { Icono } from "../compra/Icono";

export const campoAuth = "min-h-11 w-full rounded-lg border border-indigo-200 bg-white py-2.5 pl-11 pr-4 text-sm text-blue-950 placeholder:text-indigo-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-base";
export const botonAuth = "flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-[#ff0018] px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-50";

export function PresentacionAuth({ recuperacion = false, registro = false, children }: { recuperacion?: boolean; registro?: boolean; children: ReactNode }) {
  return (
    <section className={`mx-auto my-2 w-[calc(100%-24px)] overflow-hidden rounded-xl bg-white p-0 shadow-sm sm:my-3 sm:w-[calc(100%-36px)] sm:p-3.5 ${registro ? "max-w-[1120px]" : "max-w-[1040px]"}`}>
      <div className="grid overflow-hidden rounded-lg border border-indigo-100 lg:grid-cols-2">
        <div className={`${registro ? "hidden lg:block" : "h-44 sm:h-52"} relative overflow-hidden lg:h-auto lg:min-h-[clamp(420px,calc(100dvh-245px),540px)]`}>
          <img src="/images/registro-bus-andino.png" alt="Bus de Gran Continental en un paisaje andino" className="absolute inset-0 h-full w-full object-cover object-[center_65%] lg:object-[center_72%]" fetchPriority="high" />
          <div className="relative hidden px-6 py-6 text-[#080658] lg:block xl:px-8 xl:py-8">
            <h2 className="text-[clamp(1.75rem,2.6vw,2.75rem)] font-extrabold leading-[1.06] tracking-tight">{registro ? <>Crea tu cuenta<br />y viaja con<br />nosotros</> : recuperacion ? <>Vuelve a viajar<br />con nosotros</> : <>Tu próximo viaje<br />comienza aquí</>}</h2>
            {registro ? <p className="mt-3 flex items-center gap-2.5 text-sm font-medium xl:text-base"><Icono nombre="persona" className="h-5 w-5 shrink-0 text-green-700" />Guarda tus datos y consulta tus viajes.</p> : <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium lg:divide-x lg:divide-blue-950/20 xl:text-sm">
              <li className="flex items-center gap-1.5 pl-0"><Icono nombre="boleto" className="h-5 w-5 text-green-700" />Compra tus pasajes</li>
              <li className="flex items-center gap-1.5 pl-3 first:pl-0"><Icono nombre="maleta" className="h-5 w-5 text-green-700" />Consulta tus viajes</li>
              <li className="flex items-center gap-1.5 pl-3 first:pl-0"><Icono nombre="persona" className="h-5 w-5 text-green-700" />Guarda tus datos</li>
            </ul>}
          </div>
        </div>
        <div className="flex min-w-0 flex-col justify-center px-5 py-5 text-[#080658] sm:px-7 sm:py-6">{children}</div>
      </div>
    </section>
  );
}

export function IconoClave({ visible = false, ojo = false }: { visible?: boolean; ojo?: boolean }) {
  return <IconoBiblioteca nombre={ojo ? (visible ? 'oculto' : 'ojo') : 'clave'} className="h-5 w-5"/>;
}
