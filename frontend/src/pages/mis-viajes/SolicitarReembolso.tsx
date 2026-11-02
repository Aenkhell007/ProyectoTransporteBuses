import { useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Icono } from "../../components/compra/Icono";
import type { NombreIcono } from "../../components/compra/Icono";
import { MyTripsTabs } from "../../components/compra/MyTripsTabs";
import { reembolsoDemo as viaje, motivosReembolso } from "../../mocks/reembolso";
import { estimarReembolsoDemo, validarReembolsoDemo } from "../../features/pagos/reembolsoDemo";
import type { ErroresReembolso, FormularioReembolso } from "../../types/pagos/reembolso";

const dinero = (centavos: number) => `$ ${(centavos / 100).toFixed(2)}`;
const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
const campo = "w-full rounded-md border border-[#cbd8ff] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#8691c4] focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";
const boton = `inline-flex min-h-11 items-center justify-center gap-3 rounded-md border border-blue-700 px-5 py-2 text-sm text-blue-800 hover:bg-blue-50 ${foco}`;

export default function SolicitarReembolso() {
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const id = useId();
  const panelId = `${id}-reembolso`;
  const politica = useRef<HTMLDialogElement>(null);
  const formularioRef = useRef<HTMLFormElement>(null);
  const [datos, setDatos] = useState<FormularioReembolso>({ alcance: "compra", pasajeros: [], motivo: "cambio-planes", observacion: "" });
  const [errores, setErrores] = useState<ErroresReembolso>({});
  const [solicitudCreada, setSolicitudCreada] = useState(false);
  const [pasoConfirmacion, setPasoConfirmacion] = useState(false);
  const confirmacionRef = useRef<HTMLDivElement>(null);
  const resultadoRef = useRef<HTMLDivElement>(null);
  const habilitada = params.get("ejemplo") === "habilitada";
  const vencida = params.get("ejemplo") === "vencida";
  const desconocida = params.has("reserva_id") && params.get("reserva_id") !== viaje.reservaId;
  const estimacion = estimarReembolsoDemo(viaje.pasajeros, datos, viaje.porcentajePropuesto);
  const editando = !solicitudCreada;
  const bloquear = !habilitada || vencida || solicitudCreada;

  function actualizar(nuevos: Partial<FormularioReembolso>) {
    setDatos(anterior => ({ ...anterior, ...nuevos }));
    setErrores({});
    setPasoConfirmacion(false);
  }
  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bloquear) return;
    const invalidos = validarReembolsoDemo(datos, viaje.pasajeros, motivosReembolso.map(m => m.id));
    setErrores(invalidos);
    if (Object.keys(invalidos).length) {
      requestAnimationFrame(() => formularioRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setPasoConfirmacion(true);
    requestAnimationFrame(() => confirmacionRef.current?.focus());
  }
  function confirmarSimulacion() {
    if (bloquear || !pasoConfirmacion) return;
    setPasoConfirmacion(false);
    setSolicitudCreada(true);
    requestAnimationFrame(() => resultadoRef.current?.focus());
  }

  return <section className="mx-auto my-4 w-[calc(100%-24px)] max-w-360 rounded-lg bg-white p-4 font-[Arial,Helvetica,sans-serif] text-[#08035b] sm:my-6 sm:w-[calc(100%-36px)] sm:p-6">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-bold tracking-tight sm:text-[42px]">Mis viajes</h1><p className="mt-1 text-sm text-blue-800 sm:text-lg">Consulta tus reservas y accede al boleto de cada compra.</p></div>
      <Link to="/" className={`${boton} max-sm:hidden`}><Icono nombre="lupa" />Buscar un viaje</Link>
    </header>
    <MyTripsTabs actual="proximos" onCambiar={seccion => navegar(`/mis-viajes?seccion=${seccion}`)} panelId={panelId} />
    <div id={panelId} role="tabpanel" aria-labelledby="pestana-proximos" className="mt-3">
      <Link to="/mis-viajes" className={`mb-3 flex min-h-11 items-center gap-2 rounded-md border border-[#dbe5ff] px-3 text-sm text-blue-800 ${foco}`}><Icono nombre="flechaIzquierda" />Volver a Mis viajes</Link>
      <p className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">Vista de demostración. No se consulta una reserva real, no se cancela una compra y no se mueve dinero.</p>

      {desconocida ? <div className="rounded-md border border-slate-200 p-6" role="status"><h2 className="text-xl font-bold">Reserva no disponible en esta demostración</h2><p className="mt-2">Solo está disponible la reserva de ejemplo para esta vista.</p><Link to="/mis-viajes/reembolso" className={`${boton} mt-4`}>Ver reserva de ejemplo</Link></div> : <form ref={formularioRef} onSubmit={enviar} noValidate>
        <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section aria-labelledby={`${id}-titulo`} className="min-w-0 rounded-lg border border-[#dbe5ff] p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-3"><h2 id={`${id}-titulo`} className="text-2xl font-bold tracking-tight sm:text-[28px]">Solicitar reembolso</h2><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${habilitada ? "bg-green-50 text-green-800" : "bg-amber-50 text-orange-600"}`}><Icono nombre={habilitada ? "checkCirculo" : "alerta"} className="size-4" />{habilitada ? "Política de ejemplo habilitada" : "Propuesta en revisión"}</span></div>
            <p className="mt-1 mb-3 text-sm text-[#5965b3] sm:text-base">Completa la información para solicitar el reembolso de esta reserva.</p>
            <div className="grid gap-4 border-t border-[#dbe5ff] pt-3 md:grid-cols-2">
              <article aria-label="Compra seleccionada para el reembolso" className="min-w-0 md:border-r md:border-[#e5ebff] md:pr-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-900"><Icono nombre="checkCirculo" />Confirmada</span><div className="text-sm"><span className="block text-[#5965b3]">Código de la compra</span><strong className="block text-lg text-blue-900">{viaje.codigo}</strong></div></div>
                <img src={viaje.foto} alt="Autobús de Gran Continental, imagen de referencia" className="mb-3 hidden h-36 w-full rounded-md object-cover object-[center_77%] md:block" />
                <div className="flex items-start justify-between gap-2 text-lg font-bold text-blue-900"><div>{viaje.origen}<span className="block">{viaje.salida}</span></div><span aria-hidden="true">→</span><div>{viaje.destino}<span className="block">{viaje.llegada}<small className="ml-2 text-xs font-normal">({viaje.duracion})</small></span></div></div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-blue-800"><span className="inline-flex items-center gap-1"><Icono nombre="ubicacion" className="size-4 text-green-700" />{viaje.terminalOrigen}</span><span className="inline-flex items-center gap-1"><Icono nombre="ubicacion" className="size-4 text-green-700" />{viaje.terminalDestino}</span></div>
                <ul className="mt-4 space-y-3 text-sm text-[#4d5ab2]">
                  <Detalle icono="bus">{viaje.servicio} · {viaje.piso}</Detalle>
                  <Detalle icono="personas">{viaje.pasajeros.length} pasajeros · Asientos <strong>U8 y U9</strong></Detalle>
                  <Detalle icono="persona">Comprador: {viaje.comprador}</Detalle>
                  <Detalle icono="calendario">{viaje.fecha}</Detalle>
                </ul>
              </article>
              <div className="min-w-0">
                <fieldset disabled={!editando}>
                  <legend className="mb-3 text-sm font-semibold">¿Para qué deseas solicitar el reembolso?</legend>
                  <label className="flex cursor-pointer items-start gap-3"><input type="radio" name={`${id}-alcance`} value="compra" checked={datos.alcance === "compra"} onChange={() => actualizar({ alcance: "compra" })} className="mt-0.5 size-5 shrink-0 accent-blue-700" /><span className="text-sm"><strong>Toda la compra</strong><small className="mt-1 block text-xs leading-relaxed text-[#5965b3]">Se solicitará el reembolso para todos los pasajeros de esta reserva.</small></span></label>
                  <label className="mt-4 flex cursor-pointer items-start gap-3"><input type="radio" name={`${id}-alcance`} value="pasajeros" checked={datos.alcance === "pasajeros"} onChange={() => actualizar({ alcance: "pasajeros" })} className="mt-0.5 size-5 shrink-0 accent-blue-700" /><span className="text-sm"><strong>Seleccionar pasajeros</strong><small className="mt-1 block text-xs text-[#5965b3]">Podrás elegir los pasajeros de esta reserva.</small></span></label>
                </fieldset>
                {datos.alcance === "pasajeros" && <fieldset className="mt-3 space-y-2 rounded-md bg-blue-50 p-3" disabled={!editando}><legend className="text-xs font-semibold">Pasajeros incluidos</legend>{viaje.pasajeros.map(p => <label key={p.id} className="flex cursor-pointer items-center gap-2 text-xs"><input type="checkbox" checked={datos.pasajeros.includes(p.id)} aria-invalid={errores.pasajeros ? true : undefined} aria-describedby={errores.pasajeros ? `${id}-error-pasajeros` : undefined} onChange={e => actualizar({ pasajeros: e.target.checked ? [...datos.pasajeros, p.id] : datos.pasajeros.filter(v => v !== p.id) })} className="size-4 shrink-0 accent-blue-700" /><span>{p.nombre}<small className="block text-[#5965b3]">{p.asiento} · {dinero(p.pagadoCentavos)}</small></span></label>)}</fieldset>}
                {errores.pasajeros && <p id={`${id}-error-pasajeros`} role="alert" className="mt-2 text-xs text-red-700">{errores.pasajeros}</p>}
                <div className="mt-4 border-t border-[#dbe5ff] pt-4"><label htmlFor={`${id}-motivo`} className="mb-2 block text-sm font-semibold">Motivo de la solicitud</label><select id={`${id}-motivo`} value={datos.motivo} disabled={!editando} onChange={e => actualizar({ motivo: e.target.value })} aria-invalid={errores.motivo ? true : undefined} aria-describedby={errores.motivo ? `${id}-error-motivo` : undefined} className={campo}>{motivosReembolso.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select>{errores.motivo && <p id={`${id}-error-motivo`} role="alert" className="mt-2 text-xs text-red-700">{errores.motivo}</p>}</div>
                <label htmlFor={`${id}-observacion`} className="mt-4 mb-2 block text-sm font-semibold">Observación (opcional)</label>
                <textarea id={`${id}-observacion`} value={datos.observacion} disabled={!editando} onChange={e => actualizar({ observacion: e.target.value })} rows={4} maxLength={500} aria-invalid={errores.observacion ? true : undefined} aria-describedby={`${id}-contador${errores.observacion ? ` ${id}-error-observacion` : ""}`} placeholder="Puedes escribir un comentario sobre tu solicitud." className={`${campo} min-h-24 resize-y`} />
                <p id={`${id}-contador`} className="mt-1 text-right text-xs text-[#7c85bd]">{datos.observacion.length}/500</p>
                {errores.observacion && <p id={`${id}-error-observacion`} role="alert" className="text-xs text-red-700">{errores.observacion}</p>}
              </div>
            </div>
          </section>

          <aside aria-labelledby={`${id}-estimacion`} className="rounded-lg border border-[#dbe5ff] p-3 sm:p-4">
            <h2 id={`${id}-estimacion`} className="text-xl font-bold tracking-tight">Estimación de devolución</h2>
            <div className="mt-4 flex items-start gap-3"><span className="rounded-full bg-amber-50 p-2 text-orange-500"><Icono nombre="reloj" className="size-7" /></span><div><p className="text-sm text-[#5965b3]">Tiempo hasta la salida</p><p className="text-2xl font-bold">{vencida ? "Plazo finalizado" : `${viaje.horasHastaSalida} horas`}</p><p className="mt-1 text-xs text-[#5965b3]">Tiempo ficticio del escenario. La solicitud debe enviarse antes de la salida del bus.</p></div></div>
            <dl aria-live="polite" aria-atomic="true" className="mt-4 border-t border-[#e5ebff] pt-3 text-sm">
              <Fila etiqueta={datos.alcance === "compra" ? "Total pagado" : "Pagado por pasajeros seleccionados"} valor={dinero(estimacion.pagadoCentavos)} />
              <Fila etiqueta="Porcentaje de devolución" valor={`${viaje.porcentajePropuesto}%`} />
              <div className="my-3 flex items-center justify-between gap-3 rounded-md bg-green-50 p-3"><dt className="text-sm text-teal-950">Monto estimado<br />de devolución</dt><dd className="text-2xl font-bold text-teal-950">{dinero(estimacion.devolucionCentavos)}</dd></div>
              <Fila etiqueta="Monto por retención" valor={dinero(estimacion.retencionCentavos)} />
            </dl>
            <p className="mt-2 flex gap-2 text-xs text-[#5965b3]"><Icono nombre="info" className="size-4 text-blue-600" />Estimación de ejemplo según una propuesta del 50%; no constituye una política publicada.</p>
            <p className="mt-4 flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-700"><Icono nombre="info" />La devolución se solicita para revisión; no implica un abono inmediato.</p>
            <button type="button" onClick={() => politica.current?.showModal()} className={`mt-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-[#dbe5ff] px-3 py-2 text-sm text-blue-800 ${foco}`}><Icono nombre="documento" /><span className="underline">Ver política de reembolsos</span><Icono nombre="externo" className="size-4" /></button>
          </aside>
        </div>

        <p className="mt-3 flex items-center gap-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-orange-700 sm:text-sm"><Icono nombre="alerta" />Después de la salida no se permiten solicitudes ordinarias desde esta opción.</p>

        {pasoConfirmacion && <div ref={confirmacionRef} tabIndex={-1} role="region" aria-labelledby={`${id}-confirmar`} className="mt-3 rounded-md border border-blue-300 bg-blue-50 p-4 focus:outline-blue-600"><h3 id={`${id}-confirmar`} className="font-bold">Revisa la solicitud de ejemplo</h3><p className="mt-2 text-sm">Se incluirá{estimacion.cantidad === 1 ? "" : "n"} {estimacion.cantidad} {estimacion.cantidad === 1 ? "pasajero" : "pasajeros"}. La devolución estimada es {dinero(estimacion.devolucionCentavos)}. Esta simulación no cancelará boletos ni realizará un reembolso real.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={confirmarSimulacion} className={`${boton} border-red-600 bg-red-600 text-white hover:bg-red-700`}>Confirmar simulación</button><button type="button" onClick={() => setPasoConfirmacion(false)} className={boton}>Seguir editando</button></div></div>}
        {solicitudCreada && <div ref={resultadoRef} tabIndex={-1} role="status" className="mt-3 rounded-md border border-green-200 bg-green-50 p-4 focus:outline-green-600"><h3 className="font-bold text-green-900">Solicitud de ejemplo creada · En revisión</h3><p className="mt-2 text-sm text-green-900">Referencia: DEMO-REEMBOLSO-001. Esta solicitud es solo un ejemplo y no se ha enviado a la cooperativa. No se realizó un abono. Al recargar, la simulación se reinicia.</p></div>}

        <footer className="mt-3 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-start">
          <Link to="/mis-viajes" className={`${boton} sm:min-w-64`}><Icono nombre="flechaIzquierda" />Volver a Mis viajes</Link>
          <div className="sm:min-w-72"><button type="submit" disabled={bloquear || pasoConfirmacion} aria-describedby={`${id}-disponibilidad`} className={`flex min-h-11 w-full items-center justify-center gap-3 rounded-md bg-[#ff001b] px-5 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-[#fa7c8c] ${foco}`}><Icono nombre="boleto" />{solicitudCreada ? "Solicitud de ejemplo en revisión" : "Solicitar reembolso"}</button><p id={`${id}-disponibilidad`} className="mt-1 text-center text-[11px] text-slate-500">{solicitudCreada ? "No se ha realizado un reembolso real." : vencida ? "Plazo de solicitud finalizado en este escenario." : habilitada ? "Modo de prueba local: no se enviará una solicitud real." : "Disponible cuando la política esté publicada."}</p></div>
        </footer>
      </form>}
    </div>

    <dialog ref={politica} aria-labelledby={`${id}-politica`} className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-[#08035b] shadow-xl backdrop:bg-slate-950/40">
      <h2 id={`${id}-politica`} className="text-xl font-bold">Propuesta de política de reembolsos</h2><p className="mt-3 text-sm">Esta vista utiliza un porcentaje ilustrativo del 50% para mostrar una estimación. No es la política vigente de la cooperativa.</p><ul className="mt-3 list-disc space-y-2 pl-5 text-sm"><li>El ejemplo calcula la devolución sobre lo pagado por los pasajeros seleccionados.</li><li>El plazo y las condiciones definitivas se mostrarán cuando la cooperativa publique su política.</li><li>Solicitar una devolución no implica su aprobación ni un abono inmediato.</li></ul><form method="dialog" className="mt-5"><button type="submit" className={boton}>Cerrar</button></form>
    </dialog>
  </section>;
}

function Detalle({ icono, children }: { icono: NombreIcono; children: ReactNode }) {
  return <li className="flex items-start gap-2"><Icono nombre={icono} /><span>{children}</span></li>;
}
function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <div className="mt-2 flex items-start justify-between gap-3"><dt>{etiqueta}</dt><dd className="shrink-0 font-semibold text-slate-950">{valor}</dd></div>;
}
