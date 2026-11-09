import { useState } from "react";
import type { EstadoCelda, MapaViaje } from "../../types/mapaViaje";

interface Props {
  mapa: MapaViaje;
  cantidad: number;
  seleccion: string[];
  onChange: (ids: string[]) => void;
}
const nombres: Record<EstadoCelda, string> = { DISPONIBLE: "disponible", SELECCIONADO: "retenido por ti", RESERVADO: "reservado", OCUPADO: "ocupado" };

export default function SelectorAsientos({ mapa, cantidad, seleccion, onChange }: Props) {
  const pisos = [...new Set(mapa.celdas.map(c=>c.piso))].sort((a,b)=>a-b);
  const [activo,setActivo] = useState(pisos[0] ?? 1);
  return <div>
    {pisos.length>1 && <div className="mb-4 flex justify-center gap-2 lg:hidden" role="group" aria-label="Selecciona el piso">
      {pisos.map(p=><button key={p} type="button" aria-pressed={activo===p} onClick={()=>setActivo(p)} className={`min-h-11 flex-1 rounded-md border px-3 text-sm font-semibold ${activo===p?'border-red-600 bg-[#ff0018] text-white':'border-indigo-100 bg-white text-[#08035b]'}`}>{p===1?'Piso inferior':p===2?'Piso superior':`Piso ${p}`}</button>)}
    </div>}
    <ul className="mb-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-slate-600" aria-label="Estados de los asientos">
      {[['Disponible','bg-green-700'],['Seleccionado','bg-blue-600'],['Ocupado','bg-red-600'],['Reservado','bg-slate-500 bg-[repeating-linear-gradient(135deg,transparent,transparent_3px,#ffffff55_3px,#ffffff55_6px)]']].map(([n,c])=><li key={n} className="flex items-center gap-2"><span className={`size-4 rounded-sm ${c}`} />{n}</li>)}
    </ul>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-start gap-5">
      {pisos.map(piso=>{
        const celdas=mapa.celdas.filter(c=>c.piso===piso);
        const columnas=Math.max(...celdas.map(c=>c.columna),1);
        const capacidad=celdas.filter(c=>c.tipo==='ASIENTO').length;
        return <section key={piso} aria-label={`Piso ${piso}`} className={`${activo!==piso?'hidden lg:block':''} mx-auto w-full max-w-[340px]`}>
          {pisos.length>1 && <h3 className={`mb-2 rounded-lg px-2 py-3 text-center text-xs font-bold uppercase text-[#08035b] ${piso===1?'bg-emerald-100':'bg-blue-100'}`}>Cubierta {piso===1?'inferior':piso===2?'superior':piso} ({capacidad} asientos)</h3>}
          <div className="relative overflow-hidden rounded-t-[48px] rounded-b-[38px] border-[7px] border-slate-300 bg-[linear-gradient(105deg,#141719,#414648_48%,#1b1e20)] p-3 shadow-[inset_0_0_0_3px_#16191a,0_8px_12px_#0003] before:absolute before:inset-y-8 before:left-0 before:w-1 before:bg-[linear-gradient(#008b46_0_30%,#fff_30%_43%,#ef1424_43%_65%,#fff_65%_75%,#008b46_75%)] after:absolute after:inset-y-8 after:right-0 after:w-1 after:bg-[linear-gradient(#008b46_0_30%,#fff_30%_43%,#ef1424_43%_65%,#fff_65%_75%,#008b46_75%)]">
            <div className="mb-5 mt-2 flex h-10 items-center justify-between gap-3 border-b border-white/20 px-2 pb-3 text-xs font-semibold text-white">
              <span className="rounded bg-black/50 px-3 py-2">PUERTA</span>
              <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8 fill-none stroke-slate-200 stroke-2"><circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="3"/><path d="M4 13h24M14 18l-4 9M18 18l4 9"/></svg>
            </div>
            <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${columnas},minmax(0,1fr))`}}>
              {celdas.map(c=>{
                const posicion={gridRow:c.fila,gridColumn:c.columna};
                if(c.tipo!=='ASIENTO')return <div key={c.id} style={posicion} aria-hidden="true" className={c.tipo==='BLOQUE'?'min-h-12 rounded-md bg-black/60':'flex items-center justify-center text-[10px] text-white/60'}>{c.tipo==='PASILLO'?c.fila:''}</div>;
                const elegido=seleccion.includes(c.id),libre=c.estado==='DISPONIBLE';
                const color=elegido?'border-blue-300 bg-linear-to-b from-blue-500 to-blue-700':libre?'border-green-500 bg-linear-to-b from-green-600 to-green-900':c.estado==='OCUPADO'?'border-red-400 bg-linear-to-b from-red-500 to-red-800':'border-slate-500 bg-[repeating-linear-gradient(135deg,#374151,#374151_6px,#596373_6px,#596373_12px)]';
                return <button key={c.id} type="button" style={posicion} aria-label={`Asiento ${c.codigo}, ${c.clase ?? ''}, ${elegido?'seleccionado':nombres[c.estado]}`} aria-pressed={elegido} disabled={!libre||(!elegido&&seleccion.length>=cantidad)} onClick={()=>onChange(elegido?seleccion.filter(id=>id!==c.id):[...seleccion,c.id])} className={`relative flex min-h-14 flex-col items-center justify-end rounded-lg border p-1 pb-2 font-bold text-white shadow-[inset_0_0_5px_#ffffff44,0_2px_2px_#0008] transition hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 disabled:cursor-not-allowed ${color}`}>
                  {c.clase!=='NORMAL'&&<span aria-hidden="true" className="absolute top-1.5 h-2 w-1/2 rounded-sm border border-white/60"/>}<span className="text-sm sm:text-base">{c.codigo}</span>
                </button>;
              })}
            </div>
            <div aria-hidden="true" className="mx-auto mt-5 h-1.5 w-2/3 rounded-full bg-slate-300 shadow-inner"/>
          </div>
        </section>;
      })}
    </div>
  </div>;
}
