import { Link, useLocation, useSearchParams } from "react-router";
import PaymentLayout from "../../components/pagos/PaymentLayout";
import { Icono } from "../../components/compra/Icono";
import { cuentasDemo } from "../../mocks/cuentasBancarias";
import { escenariosPago, seguimientoPagoDemo as demo } from "../../mocks/seguimientoPago";
import type { EscenarioPago } from "../../mocks/seguimientoPago";
import "./seguimiento-pago.css";

const mensajes = {
  revision: { titulo: "Comprobante recibido", subtitulo: "Tu pago está en verificación.", etiqueta: "Pago en verificación", detalle: "El oficinista revisará tu comprobante.", aviso: "Tu boleto estará disponible en Mis viajes cuando el pago sea aprobado." },
  aprobado: { titulo: "Pago aprobado", subtitulo: "La revisión de tu pago ha finalizado.", etiqueta: "Pago aprobado", detalle: "Consulta la confirmación de tu compra en Mis viajes.", aviso: "Podrás consultar tu boleto en Mis viajes cuando termine su emisión." },
  rechazado: { titulo: "Revisa tu comprobante", subtitulo: "No pudimos validar tu pago.", etiqueta: "Comprobante rechazado", detalle: demo.motivoRechazo, aviso: "Revisa el motivo antes de adjuntar otro comprobante. No realices un segundo pago sin consultar a la cooperativa." },
  vencida: { titulo: "Reserva vencida", subtitulo: "El plazo de esta reserva terminó.", etiqueta: "Reserva vencida", detalle: "Consulta nuevamente los viajes y asientos disponibles.", aviso: "Si ya hiciste una transferencia, contacta a la cooperativa antes de realizar otro pago." },
};
const dinero = (centavos: number) => `$ ${(centavos / 100).toFixed(2)}`;
const textoLocal = (valor: unknown, ejemplo: string) => typeof valor === "string" && valor.trim() ? valor.trim().slice(0, 160) : ejemplo;

export default function SeguimientoPago() {
  const location = useLocation();
  const [params] = useSearchParams();
  const id = params.get("reserva_id");
  const escenario = params.get("ejemplo");
  const estado: EscenarioPago = escenariosPago.some((item) => item.id === escenario) ? escenario as EscenarioPago : "revision";
  const mensaje = mensajes[estado];
  const cuenta = cuentasDemo.find((item) => item.id === location.state?.cuenta) ?? cuentasDemo[0];
  const archivo = textoLocal(location.state?.nombreArchivo, demo.archivo);
  const referencia = textoLocal(location.state?.referencia, demo.referencia);

  return <PaymentLayout title="Estado del comprobante">
    <div className="pago-verificacion">
    {id && id !== demo.reservaId ? <div className="pv-no-disponible">
      <h2>Esta reserva no está disponible en la demostración</h2>
      <p>Todavía no se consultan reservas reales. Puedes abrir el ejemplo para conocer esta pantalla.</p>
      <Link className="pv-boton pv-boton--principal" to="/pago/seguimiento">Ver seguimiento de ejemplo →</Link>
    </div> : <>
      <div className="pv-layout">
        <div className="pv-principal">
          <div className={`pv-mensaje pv-mensaje--${estado}`}>
            <ComprobanteRecibido estado={estado} />
            <h2>{mensaje.titulo}</h2>
            <p className="pv-subtitulo">{mensaje.subtitulo}</p>
            <p className="pv-explicacion">{mensaje.detalle}<br />{estado === "revision" && "Te avisaremos por correo y WhatsApp cuando se apruebe el pago."}</p>
          </div>

          <section className="pv-reserva" aria-labelledby="titulo-datos-reserva">
            <h2 id="titulo-datos-reserva">Datos de tu reserva</h2>
            <div className="pv-reserva-cabecera">
              <div><span className="pv-etiqueta">Código de reserva</span><strong className="pv-codigo">{demo.codigo}</strong></div>
              <span className={`pv-estado pv-estado--${estado}`}><Icono nombre="reloj" />{mensaje.etiqueta}</span>
            </div>
            <dl className="pv-datos">
              <div><dt>Método de pago</dt><dd><BancoIcono />Transferencia/Depósito</dd></div>
              <div><dt>Monto reportado</dt><dd className="pv-monto">{dinero(demo.montoReportadoCentavos)}</dd></div>
              <div className="pv-archivo"><dt>Comprobante de pago</dt><dd>
                <MiniComprobante /><span className="pv-archivo-nombre"><span title={archivo}>{archivo}</span><small>{demo.tamanoArchivo}</small></span>
                <span className="pv-recibido"><span aria-hidden="true">✓</span> Recibido</span>
              </dd></div>
            </dl>
            <details className="pv-referencia"><summary>Ver referencia de operación</summary><p>{referencia} · {cuenta.banco}</p></details>
          </section>

          <p className="pv-aviso"><span className="pv-info" aria-hidden="true">i</span><span>{mensaje.aviso}</span></p>
          <div className="pv-ilustracion" aria-hidden="true"><RevisionIlustracion /></div>
        </div>

        <nav className="pv-acciones" aria-label="Acciones del seguimiento">
          {estado === "rechazado" ? <Link to="/pago/comprobante" state={{ metodo: "transferencia", cuenta: cuenta.id }} className="pv-boton pv-boton--principal">Adjuntar otro comprobante <span aria-hidden="true">→</span></Link>
            : estado === "vencida" ? <Link to="/" className="pv-boton pv-boton--principal">Buscar otro viaje <span aria-hidden="true">→</span></Link>
            : <Link to="/mis-viajes" className="pv-boton pv-boton--principal"><Icono nombre="maleta" />Ir a Mis viajes <span aria-hidden="true">→</span></Link>}
          <Link to="/" className="pv-boton pv-boton--volver"><span aria-hidden="true">←</span> Volver al inicio</Link>
        </nav>
      </div>
      <p className="pv-demo">Maqueta con datos de ejemplo. No se registran pagos ni se envían notificaciones.</p>
    </>}
    </div>
  </PaymentLayout>;
}

function BancoIcono() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m3 7 9-5 9 5H3Zm0 14h18M5 18h14M6 10v6m6-6v6m6-6v6" /></svg>;
}

function ComprobanteRecibido({ estado }: { estado: EscenarioPago }) {
  return <svg className="pv-documento" aria-hidden="true" viewBox="0 0 150 130" fill="none"><defs><linearGradient id="pv-papel" x1="25" y1="5" x2="100" y2="125" gradientUnits="userSpaceOnUse"><stop stopColor="#e5f0ff"/><stop offset="1" stopColor="#c9e0ff"/></linearGradient></defs><path d="M34 5h53l27 27v80a9 9 0 0 1-9 9H34a9 9 0 0 1-9-9V14a9 9 0 0 1 9-9Z" fill="url(#pv-papel)"/><path d="M87 5v25a3 3 0 0 0 3 3h24" fill="#83b9ff"/><path d="M48 40h28M48 60h40M48 80h29M48 100h18" stroke="#7cb6ff" strokeWidth="8" strokeLinecap="round"/><circle cx="117" cy="96" r="30" fill={estado === "rechazado" || estado === "vencida" ? "#db3b42" : "#007cff"}/>{estado === "rechazado" || estado === "vencida" ? <path d="m107 86 20 20m0-20-20 20" stroke="white" strokeWidth="6" strokeLinecap="round"/> : <path d="m103 96 10 10 19-23" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>}</svg>;
}

function MiniComprobante() {
  return <svg className="pv-mini-comprobante" aria-hidden="true" viewBox="0 0 34 48"><rect x="1" y="1" width="32" height="46" rx="2" fill="#e0e3e7" stroke="#c4cad2"/><path d="m4 5 4 2 4-2 4 2 4-2 4 2 6-2v38l-5-2-5 2-4-2-4 2-4-2-4 2Z" fill="#f3f4f5"/><path d="M9 12h16M7 18h20M7 22h13M7 27h19M7 31h17M9 38h15" stroke="#abb1ba" strokeWidth="1.3"/></svg>;
}

function RevisionIlustracion() {
  return <svg viewBox="0 0 440 170" fill="none"><defs><linearGradient id="pv-hoja" x1="160" y1="0" x2="270" y2="170" gradientUnits="userSpaceOnUse"><stop stopColor="#e8f2ff"/><stop offset="1" stopColor="#d8e9ff"/></linearGradient></defs><path d="M28 153c-33-14-14-44 9-41-7-45 46-62 65-32 13-30 51-14 51 16 26-13 47 13 37 37h41c-3-32 25-51 47-36-2-42 44-63 66-27 26-16 54 6 48 36 34-6 52 35 19 47Z" fill="#eaf3ff"/><path d="M51 153c-21-50-5-68 9-25-3-52 27-46 15 25m275 0c-9-42 13-63 16-26 12-34 30-17 15 26" fill="#d8eaff"/><rect x="155" y="8" width="124" height="155" rx="12" fill="url(#pv-hoja)"/><path d="M184 43h65M184 65h65M184 87h65M184 109h45M184 131h45" stroke="#8fc1ff" strokeWidth="8" strokeLinecap="round"/><circle cx="278" cy="87" r="31" fill="#e8f2ff" fillOpacity=".7" stroke="#315eb0" strokeWidth="7"/><path d="m301 111 40 41" stroke="#315eb0" strokeWidth="12" strokeLinecap="round"/></svg>;
}
