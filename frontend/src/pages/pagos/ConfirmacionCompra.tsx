import { Link, useSearchParams } from "react-router";
import BookingProgress from "../../components/pagos/BookingProgress";
import { Icono } from "../../components/compra/Icono";
import type { NombreIcono } from "../../components/compra/Icono";
import { compraConfirmadaDemo as compra } from "../../mocks/confirmacionCompra";
import type { EstadoConfirmacionDemo } from "../../mocks/confirmacionCompra";

const dinero = (centavos: number) => `$ ${(centavos / 100).toFixed(2)}`;
const estados: EstadoConfirmacionDemo[] = ["listo", "preparando", "revision", "rechazado"];

export default function ConfirmacionCompra() {
  const [params] = useSearchParams();
  const ejemplo = params.get("ejemplo");
  const estado = estados.includes(ejemplo as EstadoConfirmacionDemo) ? ejemplo as EstadoConfirmacionDemo : "listo";
  const reservaId = params.get("reserva_id");
  const reservaDesconocida = reservaId !== null && reservaId !== "demo-reserva-pago";
  const disponible = !reservaDesconocida && estado === "listo";
  const base = compra.pasajeros.reduce((suma, p) => suma + p.tarifaCentavos, 0);
  const descuento = compra.pasajeros.reduce((suma, p) => suma + p.descuentoCentavos, 0);
  const subtotal = base - descuento + compra.servicioCentavos;
  const total = subtotal + compra.ivaCentavos;
  const textoWhatsapp = `Boleto de DEMOSTRACIÓN de Gran Continental. ${compra.codigo}: ${compra.origen} - ${compra.destino}, ${compra.fecha}, salida ${compra.salida}. Asientos U8 y U9. Total de ejemplo: ${dinero(total)}. No válido para viajar.`;

  return <section className="min-w-0 font-[Arial,Helvetica,sans-serif] text-[#08035b] [&>h1]:text-[27px] [&>h1]:font-bold [&>h1]:tracking-[-.8px] max-[601px]:[&>h1]:text-[22px] mx-auto my-4 w-[calc(100%-24px)] max-w-360 rounded-lg bg-white p-4 sm:my-6 sm:w-[calc(100%-36px)] sm:p-6">
    <BookingProgress confirmacionCompleta={disponible} />
    <h1>Confirmación de compra</h1>
    <p className="mt-2 rounded-[5px] bg-[#fff9e8] px-[10px] py-[7px] text-[12px] text-[#775009]">Demostración visual · Datos ficticios. Este documento no es válido para viajar ni acredita un pago real.</p>

    {!disponible ? <div className="px-3 py-[45px] text-center [&>svg]:mx-auto [&>svg]:mb-3 [&>svg]:size-[60px] [&_h2]:text-[24px] [&_h2]:font-bold [&_p]:mx-auto [&_p]:my-3 [&_p]:max-w-[520px] [&_a]:mx-auto [&_a]:mt-5 [&_a]:w-fit" role="status">
      <Icono nombre={estado === "rechazado" ? "alerta" : "reloj"} />
      <h2>{reservaDesconocida ? "Reserva no disponible en la demostración" : estado === "preparando" ? "Estamos preparando el documento" : estado === "rechazado" ? "El pago requiere una nueva revisión" : "Tu pago está en verificación"}</h2>
      <p>{reservaDesconocida ? "Esta pantalla aún no consulta reservas reales." : "El boleto y sus descargas solo aparecen en el ejemplo con pago aprobado y documento disponible."}</p>
      <Link className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#ff001b] bg-[#ff001b] text-white" to="/pago/seguimiento">Volver al seguimiento</Link>
    </div> : <>
      <header className="py-3 text-center [&_h2]:text-[32px] [&_h2]:font-bold [&_h2]:tracking-[-1px] [&_p]:text-[16px] [&_p]:leading-[1.45] [&_p]:text-[#4755b5] max-[601px]:[&_h2]:text-[25px] max-[601px]:[&_p]:text-[13px]">
        <span className="mx-auto mb-[5px] flex size-[68px] items-center justify-center rounded-full bg-linear-135 from-[#08a34e] to-[#008132] text-white [&_svg]:size-12 [&_svg]:stroke-3 max-[601px]:size-[51px] max-[601px]:[&_svg]:size-9" aria-hidden="true"><Icono nombre="check" /></span>
        <h2>¡Compra realizada!</h2>
        <p className="text-[19px]! font-bold max-[601px]:text-[15px]!">Tu pago fue aprobado y tu reserva está confirmada.</p>
        <p>Tu boleto de ejemplo está listo. El envío por correo y WhatsApp todavía no está integrado.</p>
      </header>

      <article className="rounded-[6px] border border-[#c9d6ff] px-[18px] py-2 max-[601px]:px-2" aria-labelledby="cc-titulo-boleto">
        <header className="flex items-center justify-between gap-3 border-b border-[#edf0fa] pb-[7px] [&_h2]:text-[24px] [&_h2]:font-bold [&_h2]:tracking-[-.8px] max-[901px]:[&_h2]:text-[20px] max-[601px]:flex-wrap max-[601px]:gap-[5px] max-[601px]:[&_h2]:text-[17px]"><h2 id="cc-titulo-boleto">Tu boleto de compra · {compra.pasajeros.length} asientos</h2><span className="inline-flex items-center gap-[7px] rounded-[5px] bg-[#e0fce8] px-[9px] py-[6px] text-[13px] whitespace-nowrap text-[#00863c] max-[601px]:px-[7px] max-[601px]:py-1 max-[601px]:text-[11px]"><Icono nombre="checkCirculo" />Boleto confirmado</span></header>
        <div className="relative flex min-h-24 items-center gap-10 border-b border-[#edf0fa] py-2 pr-[150px] max-[901px]:gap-[15px] max-[601px]:min-h-[122px] max-[601px]:flex-col max-[601px]:items-start max-[601px]:gap-[3px] max-[601px]:pr-[97px]">
          <img className="h-[82px] w-[195px] object-contain max-[901px]:w-[155px] max-[601px]:h-[60px] max-[601px]:w-[125px]" src="/images/Logo G-C.png" alt="Gran Continental" />
          <div className="[&_span]:block [&_span]:text-[14px] [&_strong]:block [&_strong]:text-[23px] [&_strong]:tracking-[-.8px] max-[901px]:[&_strong]:text-[19px] max-[601px]:[&_span]:text-[11px] max-[601px]:[&_strong]:text-[17px]"><span>Código de la compra</span><strong>{compra.codigo}</strong></div>
          <figure className="absolute top-2 right-0 w-[126px] text-center [&_img]:mx-auto [&_img]:size-28 [&_figcaption]:text-[11px] [&_figcaption]:leading-[1.4] [&_strong]:block max-[601px]:w-[90px] max-[601px]:[&_img]:size-[86px] max-[601px]:[&_figcaption]:text-[9px]"><img src={compra.qr} alt="QR de demostración: contiene únicamente el código de ejemplo, no autoriza el abordaje" /><figcaption>Código de la compra<strong>{compra.codigo}</strong></figcaption></figure>
        </div>
        <div className="py-2 pr-[145px] [&_h3]:flex [&_h3]:gap-7 [&_h3]:text-[18px] [&_h3]:font-bold max-[601px]:pr-0 max-[601px]:[&_h3]:gap-5 max-[601px]:[&_h3]:text-[16px]">
          <h3>{compra.origen}<span aria-hidden="true">→</span>{compra.destino}</h3>
          <div className="mt-[3px] mb-2 flex flex-wrap gap-5 [&_svg]:text-[#009946] max-[601px]:gap-2"><Dato icono="ubicacion">{compra.terminalOrigen}</Dato><Dato icono="ubicacion">{compra.terminalDestino}</Dato></div>
          <div className="grid grid-cols-[.9fr_1.3fr] gap-x-5 gap-y-2 max-[901px]:grid-cols-1 max-[601px]:gap-[5px]">
            <Dato icono="calendario">{compra.fecha}</Dato><Dato icono="reloj">Salida: {compra.salida} → Llegada: {compra.llegada} ({compra.duracion})</Dato>
            <Dato icono="bus">{compra.servicio} · {compra.piso}</Dato><Dato icono="persona">Asientos adquiridos: {compra.pasajeros.length} · <strong>U8 y U9</strong></Dato>
            <Dato icono="escudo">Cooperativa: {compra.cooperativa}</Dato><Dato icono="bus">Unidad {compra.unidad} · Placa {compra.placa} · Chasis {compra.chasis}<br />Carrocería: {compra.carroceria}</Dato>
          </div>
        </div>
        <div className="overflow-hidden rounded-[5px] border border-[#e0e7ff]">
          <table className="w-full border-collapse text-[13px] [&_th]:border [&_th]:border-[#edf0fa] [&_th]:px-[9px] [&_th]:py-[7px] [&_th]:text-center [&_th]:font-normal [&_td]:border [&_td]:border-[#edf0fa] [&_td]:px-[9px] [&_td]:py-[7px] [&_td]:text-center [&_thead]:bg-[#f0f7fd] [&_tbody_th]:w-[24%] [&_tbody_th]:text-left [&_small]:block [&_small]:text-[#5965b2] [&_tbody_td:last-child]:text-[16px] max-[601px]:table-fixed max-[601px]:text-[11px] max-[601px]:[&_th]:px-[3px] max-[601px]:[&_th]:py-[6px] max-[601px]:[&_th]:[overflow-wrap:anywhere] max-[601px]:[&_td]:px-[3px] max-[601px]:[&_td]:py-[6px] max-[601px]:[&_td]:[overflow-wrap:anywhere] max-[601px]:[&_tbody_th]:w-[34%] max-[601px]:[&_tbody_td:last-child]:text-[12px]">
            <caption className="sr-only">Pasajeros, documentos y valores del boleto de ejemplo</caption>
            <thead><tr><th scope="col">Pasajero</th><th scope="col">Documento</th><th scope="col">Asiento</th><th scope="col" className="max-[601px]:hidden">Tarifa base</th><th scope="col" className="max-[601px]:hidden">Descuento</th><th scope="col">Subtotal</th></tr></thead>
            <tbody>{compra.pasajeros.map(p => <tr key={p.asiento}><th scope="row">{p.nombre}<small>{p.categoria}</small></th><td>{p.documento}</td><td><span className="inline-block rounded px-3 py-[3px] bg-[#e0f2fe] font-bold max-[601px]:px-[6px]">{p.asiento}</span></td><td className="max-[601px]:hidden">{dinero(p.tarifaCentavos)}</td><td className={`max-[601px]:hidden ${p.descuentoCentavos ? "text-[#008e43]" : ""}`}>{p.descuentoCentavos ? "- " : ""}{dinero(p.descuentoCentavos)}</td><td><strong>{dinero(p.tarifaCentavos - p.descuentoCentavos)}</strong></td></tr>)}</tbody>
          </table>
        </div>
        <dl className="mt-[7px] grid grid-cols-[repeat(5,1fr)_1.45fr] gap-[2px] overflow-hidden rounded-[5px] bg-[#f0f8ff] text-center max-[601px]:grid-cols-3">
          <Total etiqueta="Tarifa base" valor={dinero(base)} />
          <Total etiqueta="Descuento" valor={`- ${dinero(descuento)}`} verde />
          <Total etiqueta="Servicio" valor={dinero(compra.servicioCentavos)} />
          <Total etiqueta="IVA (0%)" valor={dinero(compra.ivaCentavos)} />
          <Total etiqueta="Subtotal sin IVA" valor={dinero(subtotal)} />
          <div className="px-1 py-[7px] bg-[#dffce9] text-[#111] [&_dt]:text-[15px] [&_dt]:font-bold [&_dd]:text-[28px] [&_dd]:leading-[1.1] [&_dd]:font-bold max-[601px]:[&_dt]:text-[12px] max-[601px]:[&_dd]:text-[21px]"><dt>Total pagado</dt><dd>{dinero(total)}</dd></div>
        </dl>
        <p className="flex items-center gap-[10px] px-[14px] pt-[7px] text-[13px] max-[601px]:px-0 max-[601px]:text-[11px]"><Icono nombre="documento" />Método de pago: {compra.metodo}</p>
      </article>

      <nav className="mt-2 grid grid-cols-3 gap-3 max-[601px]:grid-cols-1 max-[601px]:gap-[7px]" aria-label="Acciones del boleto de ejemplo">
        <a className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#ff001b] bg-[#ff001b] text-white" href={compra.pdf} target="_blank" rel="noopener noreferrer"><Icono nombre="boleto" />Ver boleto<span className="sr-only"> de ejemplo en una pestaña nueva</span></a>
        <a className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#009caa] bg-white text-[#100caf]" href={compra.pdf} download="boleto-compra-demo.pdf"><Icono nombre="descarga" />Descargar PDF</a>
        <a className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#00a14a] bg-white text-[#008c3b]" href={`https://wa.me/?text=${encodeURIComponent(textoWhatsapp)}`} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" />Compartir por WhatsApp<span className="sr-only">: abre un mensaje de ejemplo para que decidas si enviarlo</span></a>
      </nav>
      <p className="mt-2 flex items-center gap-[10px] rounded-[5px] bg-[#eaf5ff] px-[15px] py-[9px] text-[14px] [&_svg]:text-[#007cff] max-[601px]:p-2 max-[601px]:text-[12px]"><Icono nombre="info" />Presenta tu boleto y documento de identidad al abordar. Llega 30 minutos antes de la salida.</p>
      <nav className="mt-2 grid grid-cols-[1.4fr_1fr] gap-3 max-[601px]:grid-cols-1 max-[601px]:gap-[7px]" aria-label="Continuar después de la compra">
        <Link className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#00a14a] bg-white text-[#008c3b]" to="/mis-viajes"><Icono nombre="maleta" />Ir a Mis viajes</Link>
        <Link className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#009caa] bg-white text-[#100caf]" to="/"><Icono nombre="lupa" />Comprar otro pasaje</Link>
      </nav>
    </>}
  </section>;
}

function Dato({ icono, children }: { icono: NombreIcono; children: React.ReactNode }) {
  return <p className="flex items-start gap-2 text-[14px] leading-[1.4] [&_svg]:size-[21px] [&_svg]:shrink-0 max-[601px]:gap-[6px] max-[601px]:text-[12px] max-[601px]:[&_svg]:size-4"><Icono nombre={icono} /><span>{children}</span></p>;
}
function Total({ etiqueta, valor, verde }: { etiqueta: string; valor: string; verde?: boolean }) {
  return <div className={`px-1 py-[7px] [&_dt]:text-[12px] [&_dd]:text-[19px] [&_dd]:font-bold max-[601px]:[&_dt]:text-[10px] max-[601px]:[&_dd]:text-[16px] ${verde ? "text-[#008e43]" : ""}`}><dt>{etiqueta}</dt><dd>{valor}</dd></div>;
}
