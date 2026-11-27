import { BotonGoogleWallet } from "../../components/pagos/BotonGoogleWallet";
import {useEffect,useState} from 'react';
import {http} from '../../services/http';
import { Link } from "react-router";
import { useFlujoPago } from "../../features/pagos/useFlujoPago";
import EstadoConsultaPago from "../../components/pagos/EstadoConsultaPago";
import { enlaceLogoCooperativa, enlacePago } from "../../features/pagos/pagosApi";

import BookingProgress from "../../components/pagos/BookingProgress";
import { Icono } from "../../components/compra/Icono";
import type { NombreIcono } from "../../components/compra/Icono";

const dinero = (centavos: number) => `$ ${(centavos / 100).toFixed(2)}`;

export default function ConfirmacionCompra() {
  const { reservaId, flujo, compra, datos, cargando, error, status, recargar } =
    useFlujoPago();
  const [entrega,setEntrega]=useState<{canales:{EMAIL:boolean;WHATSAPP:boolean};estados:{canal:string;estado:string;error_codigo:string|null}[]}|null>(null);
  const entregaResuelta = Boolean(
    entrega &&
      ((!entrega.canales.EMAIL && !entrega.canales.WHATSAPP) ||
        (entrega.estados.length > 0 &&
          entrega.estados.every((e) => !["PENDIENTE", "EN_PROCESO"].includes(e.estado)))),
  );
  useEffect(()=>{
    let vivo=true;
    if(!reservaId||!datos?.compra){setEntrega(null);return;}
    const cargar=()=>{
      if(document.visibilityState==="hidden")return;
      void http<NonNullable<typeof entrega>>('/reservas/'+reservaId+'/entrega-boleto').then(r=>{if(vivo)setEntrega(r);}).catch(()=>{});
    };
    cargar();
    if(entregaResuelta)return()=>{vivo=false;};
    const timer=setInterval(cargar,5000);
    return()=>{vivo=false;clearInterval(timer);};
  },[reservaId,datos?.compra?.id,entregaResuelta]);
  if (!datos || !reservaId || !flujo || !compra)
    return <EstadoConsultaPago {...{ cargando, error, status, recargar }} />;
  const estado = flujo.estado;
  const disponible = flujo.estado === "aprobado" && flujo.documentoDisponible;
  const tituloPendiente =
    estado === "seleccion"
      ? "Completa los pasos de pago"
      : estado === "cancelada"
        ? "La compra fue cancelada o reembolsada"
        : estado === "vencida"
          ? "La reserva venció"
          : estado === "aprobado"
            ? "Estamos preparando el documento"
            : estado === "rechazado"
              ? "Revisa tu comprobante"
              : "Tu pago está en verificación";
  const base = compra.pasajeros.reduce((suma, p) => suma + p.tarifaCentavos, 0);
  const recargoVipTotal =
    datos.cotizacion?.recargo_vip_centavos ??
    compra.pasajeros.reduce((suma, p) => suma + (p.recargoVipCentavos ?? 0), 0);
  const tarifaNormalTotal =
    datos.cotizacion?.tarifa_normal_centavos ?? Math.max(0, base - recargoVipTotal);
  const descuento = compra.pasajeros.reduce(
    (suma, p) => suma + p.descuentoCentavos,
    0,
  );
  const subtotal = base - descuento + compra.servicioCentavos;
  const total =
    datos.compra?.totalPagadoCentavos ?? subtotal + compra.ivaCentavos;
  const colorPrimario = datos.viaje.marca?.colorPrimario ?? "#CB102E";
  const colorSecundario = datos.viaje.marca?.colorSecundario ?? "#00833E";
  const logoSrc = datos.viaje.marca?.tieneLogo
    ? enlaceLogoCooperativa(reservaId)
    : /gran continental/i.test(compra.cooperativa)
      ? "/images/Logo G-C.png"
      : "";
  const textoWhatsapp = `Mi viaje con ${compra.cooperativa}: ${compra.origen} - ${compra.destino}, ${compra.fecha}, salida ${compra.salida}. Asientos: ${compra.pasajeros.map((p) => p.asiento).join(", ")}.`;

  return (
    <section className="min-w-0 font-[Arial,Helvetica,sans-serif] text-[#08035b] [&>h1]:text-[27px] [&>h1]:font-bold [&>h1]:tracking-[-.8px] max-[601px]:[&>h1]:text-[22px] mx-auto my-4 w-[calc(100%-24px)] max-w-360 rounded-lg bg-white p-4 sm:my-6 sm:w-[calc(100%-36px)] sm:p-6 print:my-0 print:w-full print:max-w-[380px] print:p-2 print:shadow-none">
      <div className="print:hidden">
        <BookingProgress confirmacionCompleta={disponible} />
      </div>
      <h1 className="print:hidden">Confirmación de compra</h1>
      {!!datos.reembolsos?.cancelados.length&&<p className="my-3 rounded-md bg-amber-50 p-3 text-sm print:hidden">Documento actualizado con los pasajeros vigentes. Devolución en trámite: {dinero(datos.reembolsos.enTramiteCentavos)}. Abonado: {dinero(datos.reembolsos.ejecutadoCentavos)}. Los importes de compra conservan el pago original.</p>}
      {entrega&&disponible&&<div className="my-3 rounded-md bg-blue-50 p-3 text-sm print:hidden"><p className="font-semibold">Entrega del boleto</p>{(['EMAIL','WHATSAPP'] as const).filter(canal=>canal==='EMAIL'||entrega.canales[canal]).map(canal=>{const estadoCanal=entrega.estados.find(e=>e.canal===canal)?.estado;return <p key={canal}>{canal==='EMAIL'?'Correo electrónico':'WhatsApp'}: {!entrega.canales[canal]?'servicio pendiente de configuración en el servidor':estadoCanal==='ENVIADA'?'enviado a tu correo registrado con el boleto PDF adjunto':estadoCanal==='FALLIDA'?'no se confirmó el envío automático; conserva el PDF descargado':estadoCanal==='EN_PROCESO'?'enviando boleto PDF a tu correo registrado…':'en cola para envío automático'}</p>;})}</div>}
      {error && (
        <p role="alert" className="mt-2 rounded bg-amber-50 p-3">
          {error}
        </p>
      )}

      {!disponible ? (
        <div
          className="px-3 py-[45px] text-center [&>svg]:mx-auto [&>svg]:mb-3 [&>svg]:size-[60px] [&_h2]:text-[24px] [&_h2]:font-bold [&_p]:mx-auto [&_p]:my-3 [&_p]:max-w-[520px] [&_a]:mx-auto [&_a]:mt-5 [&_a]:w-fit"
          role="status"
        >
          <Icono nombre={estado === "rechazado" ? "alerta" : "reloj"} />
          <h2>{tituloPendiente}</h2>
          <p>
            El boleto estará disponible después de aprobar el pago y completar la emisión del documento.
          </p>
          <Link
            className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#ff001b] bg-[#ff001b] text-white"
            to={enlacePago(
              flujo?.comprobante ? "/pago/seguimiento" : "/pago",
              reservaId,
            )}
          >
            {flujo?.comprobante
              ? "Volver al seguimiento"
              : "Ir al método de pago"}
          </Link>
        </div>
      ) : (
        <>
          <header className="py-3 text-center [&_h2]:text-[32px] [&_h2]:font-bold [&_h2]:tracking-[-1px] [&_p]:text-[16px] [&_p]:leading-[1.45] [&_p]:text-[#4755b5] max-[601px]:[&_h2]:text-[25px] max-[601px]:[&_p]:text-[13px] print:hidden">
            <span
              className="mx-auto mb-[5px] flex size-[68px] items-center justify-center rounded-full bg-linear-135 from-[#08a34e] to-[#008132] text-white [&_svg]:size-12 [&_svg]:stroke-3 max-[601px]:size-[51px] max-[601px]:[&_svg]:size-9"
              aria-hidden="true"
            >
              <Icono nombre="check" />
            </span>
            <h2>¡Compra realizada!</h2>
            <p className="text-[19px]! font-bold max-[601px]:text-[15px]!">
              Tu pago fue aprobado y tu reserva está confirmada.
            </p>
            <p>
              Tu boleto está disponible. Puedes descargarlo y consultar tu
              compra en Mis viajes.
            </p>
          </header>

          <article
            className="overflow-hidden rounded-[6px] border border-[#c9d6ff] print:mx-auto print:max-w-[380px] print:border-dashed print:border-slate-400"
            style={{ borderColor: `${colorPrimario}40` }}
            aria-labelledby="cc-titulo-boleto"
          >
            <div className="flex h-2 w-full">
              <div className="w-1/2" style={{ backgroundColor: colorPrimario }} />
              <div className="w-1/2" style={{ backgroundColor: colorSecundario }} />
            </div>
            <div className="px-[18px] py-2 max-[601px]:px-2 print:px-3 print:py-2">
            <header className="flex items-center justify-between gap-3 border-b border-[#edf0fa] pb-[7px] [&_h2]:text-[24px] [&_h2]:font-bold [&_h2]:tracking-[-.8px] max-[901px]:[&_h2]:text-[20px] max-[601px]:flex-wrap max-[601px]:gap-[5px] max-[601px]:[&_h2]:text-[17px] print:[&_h2]:text-[15px]">
              <h2 id="cc-titulo-boleto" style={{ color: colorPrimario }}>
                Tu boleto de compra · {compra.pasajeros.length} {compra.pasajeros.length === 1 ? "asiento" : "asientos"}
              </h2>
              <span
                className="inline-flex items-center gap-[7px] rounded-[5px] px-[9px] py-[6px] text-[13px] font-semibold whitespace-nowrap text-white max-[601px]:px-[7px] max-[601px]:py-1 max-[601px]:text-[11px]"
                style={{ backgroundColor: colorSecundario }}
              >
                <Icono nombre="checkCirculo" />
                Boleto confirmado
              </span>
            </header>
            <div className="relative flex min-h-24 items-center gap-10 border-b border-[#edf0fa] py-2 pr-[150px] max-[901px]:gap-[15px] max-[601px]:min-h-[122px] max-[601px]:flex-col max-[601px]:items-start max-[601px]:gap-[3px] max-[601px]:pr-[97px] print:min-h-0 print:flex-col print:items-center print:gap-2 print:pr-0 print:text-center">
              {logoSrc ? (
                <img
                  className="h-[82px] w-[195px] object-contain max-[901px]:w-[155px] max-[601px]:h-[60px] max-[601px]:w-[125px] print:h-12 print:w-auto"
                  src={logoSrc}
                  alt={compra.cooperativa}
                />
              ) : (
                <div
                  className="flex h-[68px] min-w-[140px] items-center justify-center rounded-md px-4 text-center text-lg font-bold text-white"
                  style={{ backgroundColor: colorPrimario }}
                >
                  {compra.cooperativa}
                </div>
              )}
              <div className="[&_span]:block [&_span]:text-[14px] [&_strong]:block [&_strong]:break-all [&_strong]:text-[23px] [&_strong]:tracking-[-.8px] max-[901px]:[&_strong]:text-[19px] max-[601px]:[&_span]:text-[11px] max-[601px]:[&_strong]:text-[17px] print:[&_span]:text-[11px] print:[&_strong]:text-[16px]">
                <span>Código de la compra</span>
                <strong>{compra.codigo}</strong>
              </div>
              <figure className="absolute top-2 right-0 w-[126px] text-center [&_img]:mx-auto [&_img]:size-28 [&_figcaption]:text-[11px] [&_figcaption]:leading-[1.4] [&_strong]:block max-[601px]:w-[90px] max-[601px]:[&_img]:size-[86px] max-[601px]:[&_figcaption]:text-[9px] print:static print:w-full print:[&_img]:size-24">
                <img src={compra.qr} alt="Identificador QR del boleto" />
                <figcaption>
                  Código de la compra<strong>{compra.codigo}</strong>
                </figcaption>
              </figure>
            </div>
            <div className="py-2 pr-[145px] [&_h3]:flex [&_h3]:gap-7 [&_h3]:text-[18px] [&_h3]:font-bold max-[601px]:pr-0 max-[601px]:[&_h3]:gap-5 max-[601px]:[&_h3]:text-[16px] print:pr-0 print:[&_h3]:text-[15px]">
              <h3>
                {compra.origen}
                <span aria-hidden="true">→</span>
                {compra.destino}
              </h3>
              <div className="mt-[3px] mb-2 flex flex-wrap gap-5 [&_svg]:text-[#009946] max-[601px]:gap-2">
                <Dato icono="ubicacion">{compra.terminalOrigen}</Dato>
                <Dato icono="ubicacion">{compra.terminalDestino}</Dato>
              </div>
              <div className="grid grid-cols-[.9fr_1.3fr] gap-x-5 gap-y-2 max-[901px]:grid-cols-1 max-[601px]:gap-[5px] print:grid-cols-1 print:gap-1">
                <Dato icono="calendario">{compra.fecha}</Dato>
                <Dato icono="reloj">
                  Salida: {compra.salida} → Llegada: {compra.llegada} (
                  {compra.duracion})
                </Dato>
                <Dato icono="bus">
                  {compra.servicio} · {compra.piso}
                </Dato>
                <Dato icono="persona">
                  Asientos adquiridos: {compra.pasajeros.length} ·{" "}
                  <strong>
                    {compra.pasajeros.map((p) => p.asiento).join(", ")}
                  </strong>
                </Dato>
                <Dato icono="escudo">Cooperativa: {compra.cooperativa}</Dato>
                <Dato icono="bus">
                  Unidad {compra.unidad} · Placa {compra.placa}
                </Dato>
              </div>
            </div>
            <div className="overflow-hidden rounded-[5px] border border-[#e0e7ff]">
              <table className="w-full border-collapse text-[13px] [&_th]:border [&_th]:border-[#edf0fa] [&_th]:px-[9px] [&_th]:py-[7px] [&_th]:text-center [&_th]:font-normal [&_td]:border [&_td]:border-[#edf0fa] [&_td]:px-[9px] [&_td]:py-[7px] [&_td]:text-center [&_thead]:bg-[#f0f7fd] [&_tbody_th]:w-[24%] [&_tbody_th]:text-left [&_small]:block [&_small]:text-[#5965b2] [&_tbody_td:last-child]:text-[16px] max-[601px]:table-fixed max-[601px]:text-[11px] max-[601px]:[&_th]:px-[3px] max-[601px]:[&_th]:py-[6px] max-[601px]:[&_th]:[overflow-wrap:anywhere] max-[601px]:[&_td]:px-[3px] max-[601px]:[&_td]:py-[6px] max-[601px]:[&_td]:[overflow-wrap:anywhere] max-[601px]:[&_tbody_th]:w-[34%] max-[601px]:[&_tbody_td:last-child]:text-[12px]">
                <caption className="sr-only">
                  Pasajeros, documentos y valores del boleto
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Pasajero</th>
                    <th scope="col">Documento</th>
                    <th scope="col">Asiento</th>
                    <th scope="col" className="max-[601px]:hidden">
                      Tarifa base
                    </th>
                    <th scope="col" className="max-[601px]:hidden">
                      Descuento
                    </th>
                    <th scope="col">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {compra.pasajeros.map((p) => {
                    const recargo = p.recargoVipCentavos ?? 0;
                    const esVip = recargo > 0 || p.clase === "VIP" || p.clase === "EJECUTIVO";
                    const tarifaNormal = p.tarifaNormalCentavos ?? Math.max(0, p.tarifaCentavos - recargo);
                    return (
                      <tr key={p.asiento}>
                        <th scope="row">
                          {p.nombre}
                          <small>{p.categoria}</small>
                        </th>
                        <td>{p.documento}</td>
                        <td>
                          <span className="inline-flex items-center gap-1 rounded px-3 py-[3px] bg-[#e0f2fe] font-bold max-[601px]:px-[6px]">
                            <span>{p.asiento}</span>
                            {esVip && (
                              <span className="rounded bg-amber-200 px-1 text-[10px] font-extrabold text-amber-950">
                                VIP
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="max-[601px]:hidden">
                          <span>{dinero(p.tarifaCentavos)}</span>
                          {recargo > 0 && (
                            <small className="text-amber-700! font-semibold">
                              Normal {dinero(tarifaNormal)} + VIP (+{p.recargoVipPct ?? 0}%) {dinero(recargo)}
                            </small>
                          )}
                        </td>
                        <td
                          className={`max-[601px]:hidden ${p.descuentoCentavos ? "text-[#008e43]" : ""}`}
                        >
                          {p.descuentoCentavos ? "- " : ""}
                          {dinero(p.descuentoCentavos)}
                        </td>
                        <td>
                          <strong>
                            {dinero(p.tarifaCentavos - p.descuentoCentavos)}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <dl className={`mt-[7px] grid gap-[2px] overflow-hidden rounded-[5px] bg-[#f0f8ff] text-center max-[601px]:grid-cols-3 ${recargoVipTotal > 0 ? "grid-cols-[repeat(6,1fr)_1.45fr]" : "grid-cols-[repeat(5,1fr)_1.45fr]"}`}>
              <Total
                etiqueta={recargoVipTotal > 0 ? "Tarifa normal" : "Tarifa base"}
                valor={dinero(recargoVipTotal > 0 ? tarifaNormalTotal : base)}
              />
              {recargoVipTotal > 0 && (
                <Total
                  etiqueta="Recargo VIP"
                  valor={`+ ${dinero(recargoVipTotal)}`}
                  ambar
                />
              )}
              <Total
                etiqueta="Descuento"
                valor={`- ${dinero(descuento)}`}
                verde
              />
              <Total
                etiqueta="Servicio"
                valor={dinero(compra.servicioCentavos)}
              />
              <Total etiqueta="IVA" valor={dinero(compra.ivaCentavos)} />
              <Total etiqueta="Subtotal sin IVA" valor={dinero(subtotal)} />
              <div className="px-1 py-[7px] bg-[#dffce9] text-[#111] [&_dt]:text-[15px] [&_dt]:font-bold [&_dd]:text-[28px] [&_dd]:leading-[1.1] [&_dd]:font-bold max-[601px]:[&_dt]:text-[12px] max-[601px]:[&_dd]:text-[21px]">
                <dt>Total pagado</dt>
                <dd style={{ color: colorSecundario }}>{dinero(total)}</dd>
              </div>
            </dl>
            <p className="flex items-center gap-[10px] px-[14px] pt-[7px] text-[13px] max-[601px]:px-0 max-[601px]:text-[11px]">
              <Icono nombre="documento" />
              Método de pago: {compra.metodo}
            </p>
            </div>
          </article>

          <nav
            className="mt-2 grid grid-cols-3 gap-3 max-[601px]:grid-cols-1 max-[601px]:gap-[7px] print:hidden"
            aria-label="Acciones del boleto"
          >
            <a
              className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#ff001b] bg-[#ff001b] text-white"
              href={compra.pdfVista}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icono nombre="boleto" />
              Ver boleto<span className="sr-only"> en una pestaña nueva</span>
            </a>
            <a
              className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#009caa] bg-white text-[#100caf]"
              href={compra.pdf}
              download
            >
              <Icono nombre="descarga" />
              Descargar PDF
            </a>
            <a
              className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#00a14a] bg-white text-[#008c3b]"
              href={`https://wa.me/?text=${encodeURIComponent(textoWhatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icono nombre="whatsapp" />
              Compartir por WhatsApp
              <span className="sr-only">
                : abre un mensaje para que decidas si enviarlo
              </span>
            </a>
          </nav>
          <div className="mt-3 print:hidden">
            <BotonGoogleWallet reservaId={reservaId} />
          </div>
          <p className="mt-2 flex items-center gap-[10px] rounded-[5px] bg-[#eaf5ff] px-[15px] py-[9px] text-[14px] [&_svg]:text-[#007cff] max-[601px]:p-2 max-[601px]:text-[12px] print:bg-transparent print:px-0 print:text-[11px]">
            <Icono nombre="info" />
            Presenta tu boleto y documento de identidad al abordar. Llega 30
            minutos antes de la salida.
          </p>
          <nav
            className="mt-2 grid grid-cols-[1.4fr_1fr] gap-3 max-[601px]:grid-cols-1 max-[601px]:gap-[7px] print:hidden"
            aria-label="Continuar después de la compra"
          >
            <Link
              className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#00a14a] bg-white text-[#008c3b]"
              to={`/mis-viajes?reserva_id=${encodeURIComponent(reservaId)}`}
            >
              <Icono nombre="maleta" />
              Ir a Mis viajes
            </Link>
            <Link
              className="flex min-h-[43px] items-center justify-center gap-[10px] rounded-[5px] border px-3 py-[7px] text-center text-[16px] no-underline hover:brightness-95 focus-visible:outline-3 focus-visible:outline-[#167bff] focus-visible:outline-offset-3 max-[601px]:min-h-[41px] max-[601px]:text-[14px] border-[#009caa] bg-white text-[#100caf]"
              to="/"
            >
              <Icono nombre="lupa" />
              Comprar otro pasaje
            </Link>
          </nav>
        </>
      )}
    </section>
  );
}

function Dato({
  icono,
  children,
}: {
  icono: NombreIcono;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-start gap-2 text-[14px] leading-[1.4] [&_svg]:size-[21px] [&_svg]:shrink-0 max-[601px]:gap-[6px] max-[601px]:text-[12px] max-[601px]:[&_svg]:size-4">
      <Icono nombre={icono} />
      <span>{children}</span>
    </p>
  );
}
function Total({
  etiqueta,
  valor,
  verde,
  ambar,
}: {
  etiqueta: string;
  valor: string;
  verde?: boolean;
  ambar?: boolean;
}) {
  return (
    <div
      className={`px-1 py-[7px] [&_dt]:text-[12px] [&_dd]:text-[19px] [&_dd]:font-bold max-[601px]:[&_dt]:text-[10px] max-[601px]:[&_dd]:text-[16px] ${verde ? "text-[#008e43]" : ambar ? "text-amber-700" : ""}`}
    >
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
