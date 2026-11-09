import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import SelectorAsientos from "../../components/flota/SelectorAsientos";
import { ProgresoCompra } from "../../components/compra/ProgresoCompra";
import { apiCompra } from "../../features/compra/cliente";
import { reservarAsientos } from "../../features/compra/reservaApi";
import { ErrorCompra, mensajeDeError } from "../../features/compra/errores";
import { useAuth } from "../../features/auth/AuthContext";
import type { MapaViaje } from "../../types/mapaViaje";
import type { DetalleViaje } from "../../types/compra/viajes";
import {
  diaEnEcuador,
  formatearFechaLarga,
  formatearHora,
} from "../../features/compra/fechas";
import { Icono } from "../../components/compra/Icono";
import { BusImagen } from "../../components/compra/BusImagen";
import { nombreGrupo, SERVICIOS_BUS } from "../../components/compra/TripCard";
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
    setSeleccion([]);
    setViaje(null);
    setCargando(true);
    if (version === 0) setError(null);
    if (!valido) {
      setError("Vuelve a los resultados y selecciona un viaje válido.");
      setCargando(false);
      return;
    }
    apiCompra<DetalleViaje & { mapa: MapaViaje }>(
      `/viajes/${encodeURIComponent(id!)}?origen_orden=${o}&destino_orden=${d}`,
    )
      .then((v) => {
        if (vigente) setViaje(v);
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
  }, [id, o, d, valido, version]);
  async function confirmar() {
    if (!id || !viaje || enviando || seleccion.length !== cantidad) return;
    if (!usuario) {
      navegar("/iniciar-sesion", { state: { from: location } });
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const r = await reservarAsientos({
        viaje_id: id,
        origen_orden: o,
        destino_orden: d,
        asiento_ids: seleccion,
      });
      navegar(`/pasajeros?reserva_id=${r.reserva_id}`);
    } catch (e) {
      setError(mensajeDeError(e));
      if (e instanceof ErrorCompra && e.status === 409) {
        setVersion((v) => v + 1);
        setSeleccion([]);
        setError(
          "La disponibilidad cambió. Consulta el mapa actualizado y selecciona nuevamente.",
        );
      }
    } finally {
      setEnviando(false);
    }
  }
  const elegidos=viaje?.mapa.celdas.filter(c=>seleccion.includes(c.id)) ?? [];
  const origen=viaje?.paradas.find(x=>x.orden===o),destino=viaje?.paradas.find(x=>x.orden===d);

  // El enlace conserva los criterios que devuelve el detalle, sin inventar IDs de ciudades.
  const datosRuta=viaje as (typeof viaje & {origen?:{ciudad_id:string};destino?:{ciudad_id:string}});
  const resultados=datosRuta?.origen&&datosRuta.destino?`/viajes?${new URLSearchParams({origen:datosRuta.origen.ciudad_id,destino:datosRuta.destino.ciudad_id,fecha:diaEnEcuador(viaje!.salida),cantidad:String(cantidad)})}`:"/";
  return <section className="mx-auto my-5 w-[calc(100%-24px)] max-w-[1440px] rounded-lg bg-white p-4 text-[#08035b] sm:w-[calc(100%-36px)] sm:p-5">
    <ProgresoCompra pasoActual={3}/>
    {cargando&&<p role="status" className="p-6">Consultando disponibilidad…</p>}
    {error&&<div role="alert" className="my-4 rounded-md bg-red-50 p-4 text-red-800">{error}<button type="button" onClick={()=>setVersion(v=>v+1)} className="ml-3 underline">Volver a consultar</button></div>}
    {viaje&&<div className="mt-5 grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)_260px] xl:grid-cols-[250px_minmax(0,1fr)_280px]">
      <aside className="overflow-hidden rounded-lg border border-indigo-100">
        <Link to={resultados} className="flex min-h-11 items-center gap-2 bg-slate-50 px-4 text-sm text-blue-700"><Icono nombre="flechaIzquierda"/>Volver a resultados</Link>
        <div className="space-y-3 p-4">
          <h2 className="text-xl font-bold">{origen?.ciudad} → {destino?.ciudad}</h2>
          <p className="text-sm text-slate-600">{formatearFechaLarga(diaEnEcuador(viaje.salida))}<br/>{formatearHora(viaje.salida)} → {formatearHora(viaje.llegada)}</p>
          <span className="inline-block rounded-md bg-green-100 px-3 py-1 text-sm text-green-900">{nombreGrupo(viaje.bus.grupo,viaje.bus.pisos)}</span>
          <dl className="hidden space-y-3 pt-2 text-sm text-slate-600 lg:block">
            <div className="flex gap-2"><Icono nombre="reloj"/><dt>Duración:</dt><dd>{formatearDuracion(minutosEntre(viaje.salida,viaje.llegada))}</dd></div>
            <div className="flex gap-2"><Icono nombre="ubicacion"/><dt>Paradas:</dt><dd>{Math.max(0,d-o-1)}</dd></div>
            <div className="flex gap-2"><Icono nombre="bus"/><dd>Unidad {viaje.bus.unidad} · Placa {viaje.bus.placa}</dd></div>
            <div className="flex gap-2"><Icono nombre="bus"/><dd>Chasis: {viaje.bus.chasis}<br/>Carrocería: {viaje.bus.carroceria}</dd></div>
          </dl>
          <details className="text-xs text-blue-700 lg:hidden"><summary className="cursor-pointer py-2">Ver información del bus</summary><p className="leading-6">Unidad {viaje.bus.unidad} · Placa {viaje.bus.placa}<br/>Chasis: {viaje.bus.chasis}<br/>Carrocería: {viaje.bus.carroceria}</p></details>
          {viaje.bus.servicios.length>0&&<div className="border-t border-indigo-100 pt-3"><h3 className="font-bold">Servicios a bordo:</h3><ul className="mt-3 space-y-3 text-sm text-slate-600">{viaje.bus.servicios.map(s=><li key={s} className="flex gap-3"><Icono nombre={SERVICIOS_BUS[s]?.[0]??"bus"}/>{SERVICIOS_BUS[s]?.[1]??s}</li>)}</ul></div>}
        </div>
        <BusImagen src={viaje.bus.foto_url} pisos={viaje.bus.pisos} alt="Ilustración del servicio de bus" className="hidden h-40 w-full lg:block"/>
      </aside>
      <div className="min-w-0 rounded-lg border border-indigo-100 p-3 sm:p-4">
        <h1 className="text-2xl font-bold">Selecciona tus asientos</h1>
        <p className="mb-5 mt-1 text-sm text-slate-600">Selecciona un asiento por pasajero. {cantidad===1?'Completa tu selección para continuar.':`Completa los ${cantidad} para continuar.`}</p>
        <SelectorAsientos key={`${id}-${version}`} mapa={viaje.mapa} cantidad={cantidad} seleccion={seleccion} onChange={cambiar}/>
      </div>
      <aside className="rounded-lg border border-indigo-100 bg-white p-4 lg:sticky lg:top-4">
        <h2 className="border-b border-indigo-100 pb-3 text-lg font-bold">Resumen de tu selección</h2>
        <div className="my-3 flex items-center gap-3"><BusImagen src={viaje.bus.foto_url} pisos={viaje.bus.pisos} alt="Ilustración del bus seleccionado" className="h-20 w-20 rounded-md"/><div className="min-w-0 text-sm"><strong>{origen?.ciudad} → {destino?.ciudad}</strong><p className="mt-1 text-slate-600">{formatearHora(viaje.salida)} → {formatearHora(viaje.llegada)}</p></div></div>
        <p aria-live="polite" className="rounded bg-blue-50 p-3 text-sm font-semibold">{seleccion.length} de {cantidad} asientos seleccionados</p>
        <h3 className="mt-5 font-bold">Asientos seleccionados</h3>
        <ul className="my-3 space-y-3 text-sm">{elegidos.map(c=><li key={c.id} className="flex items-center justify-between gap-2"><span><strong>{c.codigo}</strong><small className="ml-2 text-slate-500">{c.piso===1?'Piso inferior':'Piso superior'}</small></span><button type="button" aria-label={`Quitar asiento ${c.codigo}`} onClick={()=>cambiar(seleccion.filter(x=>x!==c.id))} className="min-h-10 min-w-10 text-red-600">✕</button></li>)}{!elegidos.length&&<li className="text-slate-500">Selecciona tus asientos en el plano.</li>}</ul>
        <dl className="space-y-3 border-t border-indigo-100 pt-4 text-sm"><div className="flex justify-between gap-2"><dt>Tarifa desde</dt><dd>{formatearCentavos(viaje.tarifa_desde_centavos)} / asiento</dd></div><div className="flex justify-between rounded bg-blue-50 p-3 text-lg font-bold"><dt>Estimado desde</dt><dd>{formatearCentavos(viaje.tarifa_desde_centavos*seleccion.length)}</dd></div></dl>
        <p className="my-4 flex gap-2 rounded-md bg-blue-50 p-3 text-xs leading-5 text-blue-800"><Icono nombre="info"/>Los valores definitivos y descuentos se calculan al completar los pasajeros y cotizar en el servidor.</p>
        <button type="button" disabled={enviando||sesionCargando||seleccion.length!==cantidad} onClick={()=>void confirmar()} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md bg-[#ff0018] px-4 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{enviando?'Reservando…':usuario?'Continuar':'Iniciar sesión y continuar'}<Icono nombre="flechaDerecha"/></button>
      </aside>
    </div>}
  </section>;
}
