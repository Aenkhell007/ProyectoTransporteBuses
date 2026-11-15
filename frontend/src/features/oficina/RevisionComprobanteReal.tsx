import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { http } from "../../services/http";
import { Icono } from "../../components/compra/Icono";
import type { DatosPago } from "../../../../shared/pagos";
import type { ReservaOficina } from "./datos";
import { Aviso, Dialogo, ConsultaEstado, useConsulta } from "./ui";
import { RevisionComprobanteVista, accionRevision } from "./RevisionComprobanteVista";
export function RevisionComprobanteReal(){
 const {id}=useParams();
 const c=useConsulta<{comprobante:ReservaOficina;compra:DatosPago}>("/oficina/comprobantes/"+id);
 const [motivo,M]=useState(""),[ocupado,O]=useState(false),[mensaje,S]=useState(""),[error,E]=useState("");
 const [confirmacion,confirmar]=useState<boolean|null>(null);
 useEffect(()=>{M("");E("");S("");confirmar(null)},[id]);
 const d=c.datos,r=d?.comprobante;
 const base=((import.meta.env.VITE_API_URL as string|undefined)??"/api").replace(/\/$/,"");
 async function decidir(aprobar:boolean,confirmado=false){
  if(!r||ocupado||c.cargando||r.comprobante_estado!=="EN_REVISION")return;
  E("");if(!aprobar&&!motivo.trim()){E("Escribe el motivo del rechazo.");return;}
  if(!confirmado){confirmar(aprobar);return;}confirmar(null);O(true);
  try{await http("/pagos/comprobantes/"+id+"/revision",{method:"POST",body:JSON.stringify({aprobar,motivo:motivo.trim(),version:r.comprobante_version})});S(aprobar?"Pago aprobado. La compra y el boleto se registraron correctamente.":"Comprobante rechazado. El cliente puede consultar el motivo.");c.recargar();}catch(e){E((e as Error).message);}finally{O(false)}
 }
 return <div className="of-vista space-y-4 pb-2"><ConsultaEstado {...c}/>{mensaje&&<Aviso>{mensaje}</Aviso>}{error&&<p role="alert" className="rounded-md bg-red-50 p-3 text-red-700">{error}</p>}
 {r&&d&&<RevisionComprobanteVista datos={{codigo:r.compra_codigo??r.id,cliente:r.cliente,estado:r.comprobante_estado??"EN_REVISION",viaje:d.compra.viaje,cotizacion:d.compra.cotizacion,pasajeros:d.compra.pasajeros,reportado:r.reportado_centavos==null?null:Number(r.reportado_centavos),nombre:d.compra.comprobante?.nombre??"Comprobante adjunto",mime:r.mime,bytes:Number(r.bytes??0),archivo:base+"/oficina/comprobantes/"+id+"/archivo",referencia:r.referencia}} observaciones={<>
 <label htmlFor="motivo-revision" className="mb-1 flex items-center gap-2 text-sm font-bold text-blue-800"><Icono nombre="documento" className="size-4"/>Observaciones / motivo del rechazo</label>
 {r.comprobante_estado==="EN_REVISION"?<><textarea id="motivo-revision" rows={3} maxLength={300} value={motivo} onChange={e=>M(e.target.value)} disabled={ocupado} placeholder="Obligatorio si rechazas el comprobante" className="w-full rounded-md border border-blue-200 bg-white p-3 text-sm outline-none placeholder:text-indigo-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/><p className="text-right text-xs text-blue-800">{motivo.length}/300</p><div className="mt-3 flex gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-800"><Icono nombre="info"/><p>Al aprobar se confirma la compra y se emite un boleto con los pasajeros registrados. El envío externo depende de la configuración disponible.</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-green-700 px-3 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50" disabled={ocupado||c.cargando} onClick={()=>void decidir(true)}><Icono nombre="checkCirculo"/>Aprobar pago</button><button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-red-500 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50" disabled={ocupado||c.cargando} onClick={()=>void decidir(false)}><Icono nombre="xCirculo"/>Rechazar comprobante</button></div></>:<p className="rounded-md bg-blue-50 p-3 text-sm text-blue-900 wrap-anywhere">{r.motivo||"Este comprobante ya fue revisado."}</p>}
 </>}/>}
 {!r&&!c.cargando&&<Link className={accionRevision} to="../comprobantes">Volver a comprobantes</Link>}
 {confirmacion!==null&&<Dialogo titulo={confirmacion?"Confirmar aprobación del pago":"Confirmar rechazo"} cerrar={()=>confirmar(null)}><p>{confirmacion?"Confirma que verificaste el documento y la transferencia bancaria. Se confirmará la compra y se emitirá el boleto.":"Se rechazará el comprobante con el motivo indicado."}</p><div className="mt-4 flex justify-end gap-3"><button className={accionRevision} onClick={()=>confirmar(null)}>Volver</button><button className={accionRevision} disabled={ocupado} onClick={()=>void decidir(confirmacion,true)}>Confirmar {confirmacion?"aprobación":"rechazo"}</button></div></Dialogo>}
 </div>;
}
