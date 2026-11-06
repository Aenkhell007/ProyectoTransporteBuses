import type { ReactNode } from "react";
import { Icono } from "../compra/Icono";

export const campoAuth = "min-h-14 w-full rounded-lg border border-indigo-200 bg-white py-3 pl-12 pr-4 text-base text-blue-950 placeholder:text-indigo-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
export const botonAuth = "flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-[#ff0018] px-5 py-3 text-lg font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-50";

export function PresentacionAuth({ recuperacion = false, children }: { recuperacion?: boolean; children: ReactNode }) {
  return (
    <section className="mx-auto my-6 w-[calc(100%-24px)] max-w-[1200px] overflow-hidden rounded-xl bg-white p-0 sm:p-4 lg:my-8">
      <div className="grid overflow-hidden rounded-lg border border-indigo-100 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative h-48 overflow-hidden sm:h-64 lg:h-auto lg:min-h-[720px]">
          <img src="/images/registro-bus-andino.png" alt="Bus de Gran Continental en un paisaje andino" className="absolute inset-0 h-full w-full object-cover object-[center_65%] lg:object-center" fetchPriority="high" />
          <div className="relative hidden p-7 text-[#080658] lg:block xl:p-9">
            <h2 className="mt-5 text-[clamp(2.6rem,4.5vw,4.2rem)] font-extrabold leading-[1.04] tracking-tight">{recuperacion ? <>Vuelve a viajar<br />con nosotros</> : <>Tu próximo viaje<br />comienza aquí</>}</h2>
            <ul className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm font-medium">
              <li className="flex items-center gap-2"><Icono nombre="boleto" className="h-7 w-7 text-green-700" />Compra tus pasajes</li>
              <li className="flex items-center gap-2"><Icono nombre="maleta" className="h-7 w-7 text-green-700" />Consulta tus viajes</li>
              <li className="flex items-center gap-2"><Icono nombre="persona" className="h-7 w-7 text-green-700" />Guarda tus datos</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col justify-center px-5 py-8 text-[#080658] sm:px-8 sm:py-10 xl:px-10">{children}</div>
      </div>
    </section>
  );
}

export function IconoClave({ visible = false, ojo = false }: { visible?: boolean; ojo?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">{ojo ? <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path d="m3 3 18 18" />}</> : <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>}</svg>;
}
