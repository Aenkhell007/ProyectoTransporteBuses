import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import SelectorAsientos from "../../components/flota/SelectorAsientos";
import BookingProgress from "../../components/pagos/BookingProgress";
import { apiCompra } from "../../features/compra/cliente";
import { obtenerReserva, cambiarAsientos, reservarAsientos } from "../../features/compra/reservaApi";
import { ErrorCompra, mensajeDeError } from "../../features/compra/errores";
import { useAuth } from "../../features/auth/AuthContext";
import type { ReservaPendiente } from "../../types/compra/reserva";
import type { MapaViaje } from "../../types/mapaViaje";
import type { DetalleViaje } from "../../types/compra/viajes";
import {
  diaEnEcuador,
  formatearFechaLarga,
  formatearHora,
} from "../../features/compra/fechas";
import { Icono } from "../../components/compra/Icono";
import { BusImagen } from "../../components/compra/BusImagen";
import { infoServicioBus, nombreGrupo } from "../../components/compra/TripCard";
import { formatearCentavos } from "../../features/compra/dinero";
import { formatearDuracion, minutosEntre } from "../../features/compra/fechas";
export default function SeleccionAsientosPage() {
  const [p] = useSearchParams(),
    navegar = useNavigate(),
    location = useLocation();
  const { usuario, cargando: sesionCargando } = useAuth();
  const id = p.get("viaje_id"),
    o = Number(p.get("origen_orden")),
    d = Number(p.get("destino_orden")),
    cantidad = Number(p.get("cantidad"));
  const reservaId = p.get("reserva_id");
  const [reserva, setReserva] = useState<ReservaPendiente | null>(null);
  const [confirmandoCambio, setConfirmandoCambio] = useState(false);
  const [resumenMovilAbierto, setResumenMovilAbierto] = useState(false);
  const valido =
    !!id &&
    p.has("origen_orden") &&
    p.has("destino_orden") &&
    Number.isInteger(o) &&
    o >= 0 &&
    Number.isInteger(d) &&
    d > o &&
    Number.isInteger(cantidad) &&
    cantidad >= 1 &&
    cantidad <= 10;
  const [viaje, setViaje] = useState<
      (DetalleViaje & { mapa: MapaViaje }) | null
    >(null),
    [seleccion, setSeleccion] = useState<string[]>([]),
    [cargando, setCargando] = useState(true),
    [enviando, setEnviando] = useState(false),
    [error, setError] = useState<string | null>(null),
    [version, setVersion] = useState(0);
  const cambiar = useCallback((ids: string[]) => setSeleccion(ids), []);
  useEffect(() => {
    let vigente = true;
    if (reservaId && sesionCargando) return;
    setReserva(null);
    setConfirmandoCambio(false);
    setSeleccion([]);
    setViaje(null);
    setCargando(true);
    if (version === 0) setError(null);
    if (!valido) {
      setError("Vuelve a los resultados y selecciona un viaje válido.");
      setCargando(false);
      return;
    }
    Promise.all([
      apiCompra<DetalleViaje & { mapa: MapaViaje }>(`/viajes/${encodeURIComponent(id!)}?origen_orden=${o}&destino_orden=${d}`),
      reservaId ? obtenerReserva(reservaId) : Promise.resolve(null),
    ]).then(([v, r]) => {
      if (!vigente) return;
      if (r && (r.viaje.viaje_id !== id || r.viaje.origen.orden !== o || r.viaje.destino.orden !== d || r.cantidad !== cantidad))
        throw new ErrorCompra(409, { mensaje: "La reserva no corresponde a este viaje. Vuelve a los resultados." });
      if (r && (r.estado === "VENCIDA" || r.estado === "CANCELADA" || (r.estado === "PENDIENTE" && Date.parse(r.expires_at) <= Date.now()))) {
        throw new ErrorCompra(409, { mensaje: "La retención terminó. Vuelve a los resultados para elegir nuevamente." });
      }
      setReserva(r);
      setSeleccion(r?.asientos.map(a => a.asiento_id) ?? []);
      setViaje(v);
    })
      .catch((e) => {
        if (vigente) setError(mensajeDeError(e));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [id, o, d, cantidad, valido, version, reservaId, usuario?.id, sesionCargando]);
  async function confirmar() {
    if (!id || !viaje || enviando || seleccion.length !== cantidad) return;
    if (!usuario) {
      navegar("/iniciar-sesion", { state: { from: location } });
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      if (reserva) {
        if (!reserva.asientos_editables) {
          navegar(`/pago/seguimiento?reserva_id=${reserva.reserva_id}`);
          return;
        }
        if (hayCambios && !confirmandoCambio) { setConfirmandoCambio(true); return; }
        if (hayCambios) await cambiarAsientos(reserva.reserva_id, reserva.edicion_asientos_version, seleccion);
        navegar(`/pasajeros?reserva_id=${reserva.reserva_id}`);
        return;
      }
      const r = await reservarAsientos({
        viaje_id: id,
        origen_orden: o,
        destino_orden: d,
        asiento_ids: seleccion,
      });
      // Atrás vuelve a esta reserva. Desde resultados se inicia una selección nueva.
      const regreso = new URLSearchParams(p); regreso.set("reserva_id", r.reserva_id);
      navegar(`/asientos?${regreso}`, { replace: true });
      navegar(`/pasajeros?reserva_id=${r.reserva_id}`);
    } catch (e) {
      setError(mensajeDeError(e));
      if (e instanceof ErrorCompra && e.status === 409) {
        setVersion((v) => v + 1);
        setSeleccion([]);
        setError(
          reserva ? "No se guardó el cambio. Conservamos los asientos anteriores; recuperamos la reserva y el mapa actualizado." : "La disponibilidad cambió. Consulta el mapa actualizado y selecciona nuevamente.",
        );
      }
    } finally {
      setEnviando(false);
    }
  }
  const hayCambios = !!reserva && (seleccion.length !== reserva.asientos.length || reserva.asientos.some(a => !seleccion.includes(a.asiento_id)));
  const bloqueada = !!reserva && !reserva.asientos_editables;
  // Solo los asientos de la reserva autenticada son liberados para edición visual.
  const mapaEditable: MapaViaje | null = viaje ? { ...viaje.mapa, celdas: viaje.mapa.celdas.map(c =>
    reserva?.asientos_editables && reserva.asientos.some(a => a.asiento_id === c.id) ? { ...c, estado: "DISPONIBLE" as const } : c,
  ) } : null;
  const elegidos=viaje?.mapa.celdas.filter(c=>seleccion.includes(c.id)) ?? [];
  const origen=viaje?.paradas.find(x=>x.orden===o),destino=viaje?.paradas.find(x=>x.orden===d);
  const tarifaNormalReferencia =
    viaje?.tarifas_clase?.NORMAL ?? viaje?.tarifa_desde_centavos ?? 0;
  const infoVipAsiento = (celda: { id: string; clase: string | null }) => {
    const reservado = reserva?.asientos.find((a) => a.asiento_id === celda.id);
    const codigo = String(reservado?.clase ?? celda.clase ?? "NORMAL").toUpperCase();
    const esVip = codigo === "VIP" || codigo === "EJECUTIVO";
    const precio = reservado
      ? reservado.tarifa_centavos
      : esVip
        ? (viaje?.tarifas_clase?.VIP ??
          viaje?.tarifas_clase?.EJECUTIVO ??
          viaje?.tarifa_desde_centavos ??
          0)
        : (viaje?.tarifas_clase?.NORMAL ?? viaje?.tarifa_desde_centavos ?? 0);
    const recargo =
      esVip && tarifaNormalReferencia > 0 && precio > tarifaNormalReferencia
        ? precio - tarifaNormalReferencia
        : 0;
    const baseNormal = recargo > 0 ? precio - recargo : precio;
    return { precio, esVip, recargo, baseNormal };
  };
  const totalEstimado = elegidos.reduce((acc, c) => acc + infoVipAsiento(c).precio, 0);
  const totalBaseNormal = elegidos.reduce((acc, c) => acc + infoVipAsiento(c).baseNormal, 0);
  const totalRecargoVip = elegidos.reduce((acc, c) => acc + infoVipAsiento(c).recargo, 0);
  const baseVipParaPct = elegidos.reduce((acc, c) => {
    const info = infoVipAsiento(c);
    return info.recargo > 0 ? acc + info.baseNormal : acc;
  }, 0);
  const pctRecargoVip =
    totalRecargoVip > 0 && baseVipParaPct > 0
      ? Math.round((totalRecargoVip * 100) / baseVipParaPct)
      : 0;
  const deshabilitadoContinuar =
    enviando || sesionCargando || cargando || (!bloqueada && seleccion.length !== cantidad) || confirmandoCambio;
  const textoContinuar = enviando
    ? "Guardando…"
    : bloqueada
      ? "Consultar estado"
      : hayCambios
        ? "Revisar cambio de asientos"
        : usuario
          ? "Continuar"
          : "Iniciar sesión y continuar";

  const listaAsientosElegidos = (
    <>
      {elegidos.map((c) => {
        const info = infoVipAsiento(c);
        return (
          <li key={c.id} className="flex items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-1.5">
              <strong>{c.codigo}</strong>
              {info.esVip && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                  VIP
                </span>
              )}
              {viaje && viaje.bus.pisos > 1 && (
                <small className="text-slate-500">
                  {c.piso === 1 ? "Piso inferior" : "Piso superior"}
                </small>
              )}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-semibold text-[#08035b]">
                {formatearCentavos(info.precio)}
              </span>
              <button
                type="button"
                aria-label={`Quitar asiento ${c.codigo}`}
                disabled={bloqueada || enviando || confirmandoCambio}
                onClick={() => cambiar(seleccion.filter((x) => x !== c.id))}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                <Icono nombre="papelera" className="h-4 w-4" />
              </button>
            </span>
          </li>
        );
      })}
      {!elegidos.length && (
        <li className="text-slate-500">Selecciona tus asientos en el plano.</li>
      )}
    </>
  );

  const desgloseTarifas = viaje && (
    <dl className="space-y-2.5 border-t border-indigo-100 pt-3 text-sm">
      {totalRecargoVip > 0 ? (
        <>
          <div className="flex justify-between gap-2 text-slate-600">
            <dt>Tarifa base Normal ({elegidos.length})</dt>
            <dd className="font-medium text-[#08035b]">{formatearCentavos(totalBaseNormal)}</dd>
          </div>
          <div className="flex justify-between gap-2 text-amber-700">
            <dt className="font-medium">
              Recargo VIP {pctRecargoVip > 0 ? `(+${pctRecargoVip}%)` : ""}
            </dt>
            <dd className="font-semibold">+ {formatearCentavos(totalRecargoVip)}</dd>
          </div>
        </>
      ) : (
        <div className="flex justify-between gap-2 text-slate-600">
          <dt>
            Tarifa base ({elegidos.length} × {formatearCentavos(tarifaNormalReferencia)})
          </dt>
          <dd className="font-medium text-[#08035b]">{formatearCentavos(totalEstimado)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-2 text-slate-600">
        <dt>Tarifa de servicio</dt>
        <dd className="font-medium text-[#08035b]">{formatearCentavos(0)}</dd>
      </div>
      <div className="flex justify-between rounded bg-blue-50 p-3 text-lg font-bold text-[#08035b]">
        <dt>Total estimado</dt>
        <dd>{formatearCentavos(totalEstimado)}</dd>
      </div>
    </dl>
  );

  // El enlace conserva los criterios que devuelve el detalle, sin inventar IDs de ciudades.
  const datosRuta=viaje as (typeof viaje & {origen?:{ciudad_id:string};destino?:{ciudad_id:string}});
  const resultados=datosRuta?.origen&&datosRuta.destino?`/viajes?${new URLSearchParams({origen:datosRuta.origen.ciudad_id,destino:datosRuta.destino.ciudad_id,fecha:diaEnEcuador(viaje!.salida),cantidad:String(cantidad)})}`:"/";
  return <section className="mx-auto my-5 w-[calc(100%-24px)] max-w-[1440px] rounded-lg bg-white p-4 text-[#08035b] sm:w-[calc(100%-36px)] sm:p-5">
    <BookingProgress pasoActual={3}/>
    {cargando&&<p role="status" className="p-6">Consultando disponibilidad…</p>}
    {error&&<div role="alert" className="my-4 rounded-md bg-red-50 p-4 text-red-800">{error}<button type="button" onClick={()=>setVersion(v=>v+1)} className="ml-3 underline">Volver a consultar</button></div>}
    {viaje&&<div className="mt-5 grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)_270px] xl:grid-cols-[250px_minmax(0,1fr)_290px]">
      <aside className="overflow-x-hidden rounded-lg border border-indigo-100 bg-white lg:sticky lg:top-4 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto">
        <Link to={resultados} className="flex min-h-11 items-center gap-2 rounded-t-lg bg-slate-50 px-4 text-sm text-blue-700"><Icono nombre="flechaIzquierda"/>Volver a resultados</Link>
        <div className="space-y-2.5 p-3.5">
          <h2 className="text-xl font-bold">{origen?.ciudad} → {destino?.ciudad}</h2>
          <p className="text-sm text-slate-600">{formatearFechaLarga(diaEnEcuador(viaje.salida))}<br/>{formatearHora(viaje.salida)} → {formatearHora(viaje.llegada)}</p>
          <span className="inline-block rounded-md bg-green-100 px-3 py-1 text-sm text-green-900">{nombreGrupo(viaje.bus.grupo,viaje.bus.pisos)}</span>
          <dl className="hidden space-y-2 pt-1.5 text-sm text-slate-600 lg:block">
            <div className="flex gap-2"><Icono nombre="reloj" className="mt-0.5 h-4 w-4 shrink-0"/><dt>Duración:</dt><dd>{formatearDuracion(minutosEntre(viaje.salida,viaje.llegada))}</dd></div>
            <div className="flex gap-2"><Icono nombre="ubicacion" className="mt-0.5 h-4 w-4 shrink-0"/><dt>Paradas:</dt><dd>{Math.max(0,d-o-1)}</dd></div>
            <div className="flex gap-2"><Icono nombre="bus" className="mt-0.5 h-4 w-4 shrink-0"/><dd>Unidad {viaje.bus.unidad} · Placa {viaje.bus.placa}</dd></div>
          </dl>
          <details className="text-xs text-blue-700 lg:hidden"><summary className="cursor-pointer py-2">Ver información del bus</summary><p className="leading-6">Unidad {viaje.bus.unidad} · Placa {viaje.bus.placa}</p></details>
          {viaje.bus.servicios.length>0&&<div className="border-t border-indigo-100 pt-2.5"><h3 className="font-bold">Servicios a bordo:</h3><ul className="mt-2 space-y-1.5 text-sm text-slate-600">{viaje.bus.servicios.map(s=>{const [icono,etiqueta]=infoServicioBus(s);return <li key={s} className="flex items-center gap-2.5"><Icono nombre={icono} className="h-4 w-4 shrink-0"/><span>{etiqueta}</span></li>;})}</ul></div>}
        </div>
        <BusImagen src={viaje.bus.foto_url} pisos={viaje.bus.pisos} alt="Ilustración del servicio de bus" className="hidden h-28 w-full lg:block"/>
      </aside>
      <div className="min-w-0 rounded-lg border border-indigo-100 p-3 sm:p-4">
        <h1 className="text-2xl font-bold">Selecciona tus asientos</h1>
        <p className="mb-5 mt-1 text-sm text-slate-600">Selecciona un asiento por pasajero. {cantidad===1?'Completa tu selección para continuar.':`Completa los ${cantidad} para continuar.`}</p>
        {reserva && <p role="status" className="mb-4 rounded bg-blue-50 p-3 text-sm">{bloqueada ? "Esta reserva ya no admite cambios de asientos. Consulta su estado de pago." : "Recuperamos tus asientos y los datos de pasajeros. Puedes continuar o cambiar tu selección antes de enviar el comprobante. El plazo de retención se mantiene."}</p>}
        <fieldset disabled={bloqueada || enviando || confirmandoCambio}>
          <legend className="sr-only">Selección de asientos</legend>
          <SelectorAsientos key={`${id}-${version}`} mapa={mapaEditable!} cantidad={cantidad} seleccion={seleccion} onChange={cambiar}/>
        </fieldset>
      </div>
      <aside className="hidden rounded-lg border border-indigo-100 bg-white p-4 lg:sticky lg:top-4 lg:block lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto">
        <h2 className="border-b border-indigo-100 pb-3 text-lg font-bold">
          {viaje.bus.pisos > 1 ? "Resumen de tu selección" : "Resumen de tarifas"}
        </h2>
        {viaje.bus.pisos > 1 && (
          <div className="my-3 flex items-center gap-3">
            <BusImagen src={viaje.bus.foto_url} pisos={viaje.bus.pisos} alt="Ilustración del bus seleccionado" className="h-20 w-20 rounded-md" />
            <div className="min-w-0 text-sm">
              <strong>{origen?.ciudad} → {destino?.ciudad}</strong>
              <p className="mt-1 text-slate-600">{formatearHora(viaje.salida)} → {formatearHora(viaje.llegada)}</p>
              <span className="mt-1 inline-block rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                {viaje.tipo_viaje === "DIRECTO" ? "Directo" : "Con paradas"}
              </span>
            </div>
          </div>
        )}
        <p aria-live="polite" className="mt-3 rounded bg-blue-50 p-3 text-sm font-semibold">{seleccion.length} de {cantidad} asientos seleccionados</p>
        <h3 className="mt-4 font-bold">Asientos seleccionados</h3>
        <ul className="my-3 space-y-2.5 text-sm">{listaAsientosElegidos}</ul>
        {desgloseTarifas}
        <p className="my-4 flex gap-2 rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-800"><Icono nombre="info"/>Los valores definitivos y descuentos se calculan al completar los pasajeros y cotizar en el servidor.</p>
        <button type="button" disabled={deshabilitadoContinuar} onClick={()=>void confirmar()} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md bg-[#ff0018] px-4 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{textoContinuar}<Icono nombre="flechaDerecha"/></button>
      </aside>
    </div>}
    {viaje && (
      <aside
        aria-label="Resumen móvil de asientos"
        className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-indigo-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(8,3,91,0.08)] sm:-mx-5 sm:px-5 lg:hidden"
      >
        <button
          type="button"
          aria-expanded={resumenMovilAbierto}
          onClick={() => setResumenMovilAbierto((abierto) => !abierto)}
          className="flex min-h-10 w-full items-center justify-between gap-2 text-left text-sm font-bold text-[#08035b]"
        >
          <span>{seleccion.length} de {cantidad} asientos seleccionados</span>
          <span className="flex items-center gap-2">
            <span>{formatearCentavos(totalEstimado)}</span>
            <Icono nombre={resumenMovilAbierto ? "chevronAbajo" : "chevronArriba"} className="h-4 w-4" />
          </span>
        </button>
        {resumenMovilAbierto && (
          <div className="mt-2 space-y-2 border-t border-indigo-100 pt-2">
            <ul className="space-y-2 text-sm">{listaAsientosElegidos}</ul>
            {desgloseTarifas}
          </div>
        )}
        <button
          type="button"
          disabled={deshabilitadoContinuar}
          onClick={() => void confirmar()}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-3 rounded-md bg-[#ff0018] px-4 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {textoContinuar}
          <Icono nombre="flechaDerecha" />
        </button>
      </aside>
    )}
    {confirmandoCambio && reserva && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="confirmar-asientos" onKeyDown={e => {
        if (e.key === "Escape" && !enviando) { e.preventDefault(); setConfirmandoCambio(false); }
        if (e.key === "Tab") {
          const botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
          const primero = botones[0], ultimo = botones[botones.length - 1];
          if (!primero) { e.preventDefault(); return; }
          if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
          else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
        }
      }} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 id="confirmar-asientos" className="text-xl font-bold">Confirmar cambio de asientos</h2>
        <p className="mt-4">Actuales: {reserva.asientos.map(a => a.codigo).join(", ")}</p>
        <p className="mt-2">Nueva selección: {elegidos.map(a => a.codigo).join(", ")}</p>
        <p className="mt-4 text-sm text-slate-600">Conservaremos los pasajeros y el plazo de retención. Tendrás que revisar y aceptar nuevamente el precio en el resumen. Si un asiento dejó de estar disponible, conservaremos tu reserva anterior.</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button autoFocus type="button" disabled={enviando} onClick={() => setConfirmandoCambio(false)} className="min-h-11 rounded border px-4">Seguir revisando</button>
          <button type="button" disabled={enviando} onClick={() => void confirmar()} className="min-h-11 rounded bg-red-600 px-4 text-white disabled:opacity-50">{enviando ? "Guardando…" : "Confirmar cambio"}</button>
        </div>
      </section>
    </div>}
  </section>;
}
