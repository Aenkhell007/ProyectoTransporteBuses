import { Link, useLocation, useSearchParams } from "react-router";
import PaymentLayout from "../../components/pagos/PaymentLayout";
import { Icono } from "../../components/compra/Icono";
import { cuentasDemo } from "../../mocks/cuentasBancarias";
import { escenariosPago, seguimientoPagoDemo as demo } from "../../mocks/seguimientoPago";
import type { EscenarioPago } from "../../mocks/seguimientoPago";

const mensajes = {
  revision: { titulo: "Comprobante recibido", subtitulo: "Tu pago está en verificación.", etiqueta: "Pago en verificación", detalle: "El oficinista revisará tu comprobante.", aviso: "Tu boleto estará disponible en Mis viajes cuando el pago sea aprobado." },
  aprobado: { titulo: "Pago aprobado", subtitulo: "La revisión de tu pago ha finalizado.", etiqueta: "Pago aprobado", detalle: "Consulta la confirmación de tu compra en Mis viajes.", aviso: "Podrás consultar tu boleto en Mis viajes cuando termine su emisión." },
  rechazado: { titulo: "Revisa tu comprobante", subtitulo: "No pudimos validar tu pago.", etiqueta: "Comprobante rechazado", detalle: demo.motivoRechazo, aviso: "Revisa el motivo antes de adjuntar otro comprobante. No realices un segundo pago sin consultar a la cooperativa." },
  vencida: { titulo: "Reserva vencida", subtitulo: "El plazo de esta reserva terminó.", etiqueta: "Reserva vencida", detalle: "Consulta nuevamente los viajes y asientos disponibles.", aviso: "Si ya hiciste una transferencia, contacta a la cooperativa antes de realizar otro pago." },
};
const estadoPagoClases: Record<EscenarioPago, string> = {
  revision: "bg-[#ffe3a7] text-[#bd4900]",
  aprobado: "bg-[#dcfce7] text-[#147044]",
  rechazado: "bg-[#fee2e2] text-[#b91c1c]",
  vencida: "bg-[#eef0f5] text-[#566071]",
};
const dinero = (centavos: number) => `$ ${(centavos / 100).toFixed(2)}`;
const textoLocal = (valor: unknown, ejemplo: string) => typeof valor === "string" && valor.trim() ? valor.trim().slice(0, 160) : ejemplo;

export default function SeguimientoPago() {
  const location = useLocation();
  const [params] = useSearchParams();
  const id = params.get("reserva_id");
  const escenario = params.get("ejemplo");
  const estado: EscenarioPago = escenariosPago.some((item) => item.id === escenario) ? escenario as EscenarioPago : "revision";
  const documentoDisponible = estado === "aprobado" && params.get("documento") === "listo";
  const mensaje = documentoDisponible ? { ...mensajes[estado], detalle: "El documento de ejemplo ya está disponible.", aviso: "Puedes abrir la confirmación de ejemplo para ver el boleto y descargar su PDF." } : mensajes[estado];
  const cuenta = cuentasDemo.find((item) => item.id === location.state?.cuenta) ?? cuentasDemo[0];
  const archivo = textoLocal(location.state?.nombreArchivo, demo.archivo);
  const referencia = textoLocal(location.state?.referencia, demo.referencia);

  return <PaymentLayout title="Estado del comprobante">
    <div className="min-w-0 font-[Arial,Helvetica,sans-serif] text-[#08035b] [&_a]:no-underline [&_a:focus-visible]:outline-3 [&_a:focus-visible]:outline-[#007cff] [&_a:focus-visible]:outline-offset-4 [&_summary:focus-visible]:outline-3 [&_summary:focus-visible]:outline-[#007cff] [&_summary:focus-visible]:outline-offset-4">
    {id && id !== demo.reservaId ? <div className="py-[30px] [&_h2]:text-[23px] [&_h2]:font-bold [&_p]:my-3 [&_p]:mb-5 [&_p]:text-[#5d69ae]">
      <h2>Esta reserva no está disponible en la demostración</h2>
      <p>Todavía no se consultan reservas reales. Puedes abrir el ejemplo para conocer esta pantalla.</p>
      <Link className="inline-flex min-h-11 items-center justify-center gap-4 rounded-[5px] border border-[#e9ecfc] px-5 py-[10px] text-[14px] text-[#0800b8] [&_svg]:size-5 max-[761px]:min-h-[39px] max-[761px]:w-full max-[761px]:p-2 max-[761px]:text-[13px] min-w-64 border-[#ff0018]! bg-[#ff0018] text-white! hover:bg-[#e00016] max-[1151px]:min-w-0" to="/pago/seguimiento">Ver seguimiento de ejemplo →</Link>
    </div> : <>
      <div className="">
        <div className="min-w-0">
          <div className="px-[14px] pt-[5px] pb-5 text-center [&_h2]:text-[29px] [&_h2]:font-bold [&_h2]:leading-[1.3] [&_h2]:tracking-[-.7px] max-[761px]:px-[5px] max-[761px]:pt-[10px] max-[761px]:pb-[14px] max-[761px]:[&_h2]:text-[22px] max-[761px]:[&_h2]:tracking-[-.5px]">
            <ComprobanteRecibido estado={estado} />
            <h2>{mensaje.titulo}</h2>
            <p className={`mt-[3px] text-[22px] leading-[1.4] font-bold max-[761px]:mt-[2px] max-[761px]:text-[16px] ${estado === "rechazado" || estado === "vencida" ? "text-[#b72a35]" : "text-[#4d5ab2]"}`}>{mensaje.subtitulo}</p>
            <p className="mt-[5px] text-[18px] leading-[1.35] text-[#4d5ab2] max-[761px]:mt-[2px] max-[761px]:text-[14px] max-[761px]:leading-[1.5]">{mensaje.detalle}<br />{estado === "revision" && "Los avisos por correo y WhatsApp estarán disponibles cuando se integre el servicio."}</p>
          </div>

          <section className="rounded-lg border border-[#dce3fc] px-[14px] pt-3 pb-2 [&_h2]:text-[19px] [&_h2]:leading-[1.4] [&_h2]:font-bold [&_h2]:tracking-[-.6px] max-[761px]:p-[10px] max-[761px]:[&_h2]:text-[16px]" aria-labelledby="titulo-datos-reserva">
            <h2 id="titulo-datos-reserva">Datos de tu reserva</h2>
            <div className="flex items-center gap-[35px] py-2 min-[761px]:max-[1151px]:gap-4 max-[761px]:justify-between max-[761px]:gap-[7px] max-[761px]:pt-[7px] max-[761px]:pb-[9px]">
              <div><span className="block text-[13px] leading-[1.5] font-normal text-[#6873bd] max-[761px]:text-[11px]">Código de reserva</span><strong className="block text-[20px] leading-[1.4] max-[761px]:text-[14px] max-[761px]:whitespace-nowrap max-[351px]:text-[12px]">{demo.codigo}</strong></div>
              <span className={`${estadoPagoClases[estado]} inline-flex items-center gap-2 rounded-[9px] px-3 py-[9px] text-[14px] whitespace-nowrap [&_svg]:size-[21px] max-[761px]:gap-1 max-[761px]:rounded-[6px] max-[761px]:px-[7px] max-[761px]:py-[6px] max-[761px]:text-[10px] max-[761px]:[&_svg]:size-[15px] max-[351px]:text-[9px]`}><Icono nombre="reloj" />{mensaje.etiqueta}</span>
            </div>
            <dl className="grid grid-cols-[1.12fr_.85fr_1.22fr] rounded-[7px] border border-[#edf0fc] py-[9px] [&>div]:min-w-0 [&>div]:px-3 [&>div+div]:border-l [&>div+div]:border-[#edf0fc] [&_dt]:block [&_dt]:text-[13px] [&_dt]:leading-[1.5] [&_dt]:font-normal [&_dt]:text-[#6873bd] [&_dd]:flex [&_dd]:min-h-12 [&_dd]:items-center [&_dd]:gap-2 [&_dd]:text-[13px] min-[761px]:max-[1151px]:grid-cols-2 max-[761px]:grid-cols-[1.15fr_.85fr] max-[761px]:rounded-none max-[761px]:border-0 max-[761px]:border-t max-[761px]:pt-2 max-[761px]:pb-0 max-[761px]:[&>div]:px-[6px] max-[761px]:[&>div:first-child]:pl-0 max-[761px]:[&_dt]:text-[11px] max-[761px]:[&_dd]:min-h-[34px] max-[761px]:[&_dd]:gap-1 max-[761px]:[&_dd]:text-[11px] max-[351px]:[&_dd]:text-[10px]">
              <div><dt>Método de pago</dt><dd><BancoIcono />Transferencia/Depósito</dd></div>
              <div><dt>Monto reportado</dt><dd className="text-[25px]! font-bold max-[761px]:text-[22px]!">{dinero(demo.montoReportadoCentavos)}</dd></div>
              <div className="min-[761px]:max-[1151px]:col-span-full min-[761px]:max-[1151px]:mt-2 min-[761px]:max-[1151px]:border-l-0! min-[761px]:max-[1151px]:border-t min-[761px]:max-[1151px]:pt-2! max-[761px]:col-span-full max-[761px]:mt-[7px] max-[761px]:border-l-0! max-[761px]:border-t max-[761px]:px-0! max-[761px]:pt-[6px]!"><dt>Comprobante de pago</dt><dd>
                <MiniComprobante /><span className="flex min-w-0 flex-col gap-[5px] [&>span]:block [&>span]:max-w-[130px] [&>span]:truncate [&>span]:text-[11px] [&_small]:text-[11px] [&_small]:text-[#7580c3] min-[761px]:max-[1151px]:[&>span]:max-w-[240px] max-[761px]:[&>span]:max-w-[155px]"><span title={archivo}>{archivo}</span><small>{demo.tamanoArchivo}</small></span>
                <span className="ml-auto inline-flex items-center gap-[5px] text-[11px] whitespace-nowrap text-[#008244] [&>span]:inline-flex [&>span]:size-5 [&>span]:items-center [&>span]:justify-center [&>span]:rounded-full [&>span]:bg-[#008244] [&>span]:text-[15px] [&>span]:text-white min-[761px]:max-[1151px]:ml-2 max-[761px]:text-[10px] max-[761px]:[&>span]:size-[18px] max-[761px]:[&>span]:text-[13px]"><span aria-hidden="true">✓</span> Recibido</span>
              </dd></div>
            </dl>
            <details className="mt-[5px] text-[11px] text-[#7580c3] [&_summary]:w-fit [&_summary]:cursor-pointer [&_p]:py-[5px] [&_p]:[overflow-wrap:anywhere] max-[761px]:hidden"><summary>Ver referencia de operación</summary><p>{referencia} · {cuenta.banco}</p></details>
          </section>

          <p className="mt-[10px] flex items-center gap-[10px] rounded-[6px] bg-[#ecf7ff] px-[14px] py-[11px] text-[16px] leading-[1.5] text-[#2476ed] max-[761px]:mt-[9px] max-[761px]:items-start max-[761px]:gap-2 max-[761px]:px-[10px] max-[761px]:py-[9px] max-[761px]:text-[12px]"><span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0081ff] font-bold text-white max-[761px]:size-[21px] max-[761px]:text-[14px]" aria-hidden="true">i</span><span>{mensaje.aviso}</span></p>
          <div className="mx-auto mt-[10px] w-[380px] max-w-[65%] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full max-[761px]:hidden" aria-hidden="true"><RevisionIlustracion /></div>
        </div>

        <nav className="mt-[10px] flex items-center justify-between gap-4 pb-[6px] max-[761px]:mt-2 max-[761px]:w-full max-[761px]:flex-col max-[761px]:gap-[3px] max-[761px]:p-0" aria-label="Acciones del seguimiento">
          {documentoDisponible ? <Link to="/pago/confirmacion?reserva_id=demo-reserva-pago" className="inline-flex min-h-11 items-center justify-center gap-4 rounded-[5px] border border-[#e9ecfc] px-5 py-[10px] text-[14px] text-[#0800b8] [&_svg]:size-5 max-[761px]:min-h-[39px] max-[761px]:w-full max-[761px]:p-2 max-[761px]:text-[13px] min-w-64 border-[#ff0018]! bg-[#ff0018] text-white! hover:bg-[#e00016] max-[1151px]:min-w-0"><Icono nombre="boleto" />Ver confirmación de ejemplo →</Link>
            : estado === "rechazado" ? <Link to="/pago/comprobante" state={{ metodo: "transferencia", cuenta: cuenta.id }} className="inline-flex min-h-11 items-center justify-center gap-4 rounded-[5px] border border-[#e9ecfc] px-5 py-[10px] text-[14px] text-[#0800b8] [&_svg]:size-5 max-[761px]:min-h-[39px] max-[761px]:w-full max-[761px]:p-2 max-[761px]:text-[13px] min-w-64 border-[#ff0018]! bg-[#ff0018] text-white! hover:bg-[#e00016] max-[1151px]:min-w-0">Adjuntar otro comprobante <span aria-hidden="true">→</span></Link>
            : estado === "vencida" ? <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-4 rounded-[5px] border border-[#e9ecfc] px-5 py-[10px] text-[14px] text-[#0800b8] [&_svg]:size-5 max-[761px]:min-h-[39px] max-[761px]:w-full max-[761px]:p-2 max-[761px]:text-[13px] min-w-64 border-[#ff0018]! bg-[#ff0018] text-white! hover:bg-[#e00016] max-[1151px]:min-w-0">Buscar otro viaje <span aria-hidden="true">→</span></Link>
            : <Link to="/mis-viajes" className="inline-flex min-h-11 items-center justify-center gap-4 rounded-[5px] border border-[#e9ecfc] px-5 py-[10px] text-[14px] text-[#0800b8] [&_svg]:size-5 max-[761px]:min-h-[39px] max-[761px]:w-full max-[761px]:p-2 max-[761px]:text-[13px] min-w-64 border-[#ff0018]! bg-[#ff0018] text-white! hover:bg-[#e00016] max-[1151px]:min-w-0"><Icono nombre="maleta" />Ir a Mis viajes <span aria-hidden="true">→</span></Link>}
          <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-4 rounded-[5px] border border-[#e9ecfc] px-5 py-[10px] text-[14px] text-[#0800b8] [&_svg]:size-5 max-[761px]:min-h-[39px] max-[761px]:w-full max-[761px]:p-2 max-[761px]:text-[13px] min-w-[205px] max-[1151px]:min-w-0 max-[761px]:border-0"><span aria-hidden="true">←</span> Volver al inicio</Link>
        </nav>
      </div>
      <p className="pt-2 text-center text-[10px] text-[#7c85bd] max-[761px]:text-[9px] max-[761px]:leading-[1.4]">Maqueta con datos de ejemplo. No se registran pagos ni se envían notificaciones.</p>
    </>}
    </div>
  </PaymentLayout>;
}

function BancoIcono() {
  return <svg className="size-[26px] shrink-0 max-[761px]:size-[21px]" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m3 7 9-5 9 5H3Zm0 14h18M5 18h14M6 10v6m6-6v6m6-6v6" /></svg>;
}

function ComprobanteRecibido({ estado }: { estado: EscenarioPago }) {
  return <svg className="mx-auto mb-2 block h-[118px] w-[136px] max-[761px]:mb-[3px] max-[761px]:h-[82px] max-[761px]:w-[94px]" aria-hidden="true" viewBox="0 0 150 130" fill="none"><defs><linearGradient id="pv-papel" x1="25" y1="5" x2="100" y2="125" gradientUnits="userSpaceOnUse"><stop stopColor="#e5f0ff"/><stop offset="1" stopColor="#c9e0ff"/></linearGradient></defs><path d="M34 5h53l27 27v80a9 9 0 0 1-9 9H34a9 9 0 0 1-9-9V14a9 9 0 0 1 9-9Z" fill="url(#pv-papel)"/><path d="M87 5v25a3 3 0 0 0 3 3h24" fill="#83b9ff"/><path d="M48 40h28M48 60h40M48 80h29M48 100h18" stroke="#7cb6ff" strokeWidth="8" strokeLinecap="round"/><circle cx="117" cy="96" r="30" fill={estado === "rechazado" || estado === "vencida" ? "#db3b42" : "#007cff"}/>{estado === "rechazado" || estado === "vencida" ? <path d="m107 86 20 20m0-20-20 20" stroke="white" strokeWidth="6" strokeLinecap="round"/> : <path d="m103 96 10 10 19-23" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>}</svg>;
}

function MiniComprobante() {
  return <svg className="h-[46px] w-[30px] shrink-0 max-[761px]:h-[42px] max-[761px]:w-[28px]" aria-hidden="true" viewBox="0 0 34 48"><rect x="1" y="1" width="32" height="46" rx="2" fill="#e0e3e7" stroke="#c4cad2"/><path d="m4 5 4 2 4-2 4 2 4-2 4 2 6-2v38l-5-2-5 2-4-2-4 2-4-2-4 2Z" fill="#f3f4f5"/><path d="M9 12h16M7 18h20M7 22h13M7 27h19M7 31h17M9 38h15" stroke="#abb1ba" strokeWidth="1.3"/></svg>;
}

function RevisionIlustracion() {
  return <svg viewBox="0 0 440 170" fill="none"><defs><linearGradient id="pv-hoja" x1="160" y1="0" x2="270" y2="170" gradientUnits="userSpaceOnUse"><stop stopColor="#e8f2ff"/><stop offset="1" stopColor="#d8e9ff"/></linearGradient></defs><path d="M28 153c-33-14-14-44 9-41-7-45 46-62 65-32 13-30 51-14 51 16 26-13 47 13 37 37h41c-3-32 25-51 47-36-2-42 44-63 66-27 26-16 54 6 48 36 34-6 52 35 19 47Z" fill="#eaf3ff"/><path d="M51 153c-21-50-5-68 9-25-3-52 27-46 15 25m275 0c-9-42 13-63 16-26 12-34 30-17 15 26" fill="#d8eaff"/><rect x="155" y="8" width="124" height="155" rx="12" fill="url(#pv-hoja)"/><path d="M184 43h65M184 65h65M184 87h65M184 109h45M184 131h45" stroke="#8fc1ff" strokeWidth="8" strokeLinecap="round"/><circle cx="278" cy="87" r="31" fill="#e8f2ff" fillOpacity=".7" stroke="#315eb0" strokeWidth="7"/><path d="m301 111 40 41" stroke="#315eb0" strokeWidth="12" strokeLinecap="round"/></svg>;
}
