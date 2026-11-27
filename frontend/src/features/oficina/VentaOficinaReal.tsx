import { Icono, type NombreIcono } from "../../components/compra/Icono";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { http } from "../../services/http";
import { apiCompra } from "../compra/cliente";
import {
  obtenerReserva,
  obtenerBeneficios,
  guardarPasajeros,
  cotizarReserva,
  cancelarReserva,
} from "../compra/reservaApi";
import {
  fichaVacia,
  pasajeroAFicha,
  fichaAPasajero,
  validarFichas,
  type FichaPasajero,
  type ErroresFicha,
} from "../compra/pasajeros";
import { hoyEnEcuador, diaEnEcuador } from "../compra/fechas";
import { PassengerForm } from "../../components/compra/PassengerForm";
import { ComboBusqueda } from "../../components/ui/ComboBusqueda";

import SelectorAsientos from "../../components/flota/SelectorAsientos";
import type {
  ReservaPendiente,
  BeneficioVigente,
} from "../../types/compra/reserva";
import type { ViajeResultado, DetalleViaje } from "../../types/compra/viajes";
import type { MapaViaje } from "../../types/mapaViaje";
import {
  Tarjeta,
  Aviso,
  boton,
  primario,
  campo,
  dinero,
  fechaHora,
  useConsulta,
  ConsultaEstado,
  Dialogo,
} from "./ui";
function PanelVenta({titulo,icono,accion,children}:{titulo:string;icono:NombreIcono;accion?:ReactNode;children:ReactNode}) {return <section className="min-w-0 rounded-lg border border-blue-100 bg-white p-3 sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-blue-50/40 p-2"><h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#1002b4]"><Icono nombre={icono} className="size-7"/>{titulo}</h2>{accion}</div>{children}</section>}
const diaVenta=(v:string)=>new Date(v).toLocaleDateString("es-EC",{timeZone:"America/Guayaquil",weekday:"short",day:"2-digit",month:"short",year:"numeric"});
const horaVenta=(v:string)=>new Date(v).toLocaleTimeString("es-EC",{timeZone:"America/Guayaquil",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
type Oficina = {
  id: string;
  nombre: string;
  cooperativa_id: string;
  cooperativa: string;
};
interface CobroConfirmado {
  reserva_id: string;
  total_centavos: number;
  recibido_centavos: number;
  cambio_centavos: number;
}

export function VentaOficinaReal() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams(),
    rid = params.get("reserva_id");
  const contexto = useConsulta<{ oficinas: Oficina[] }>("/oficina/contexto"),
    ciudades = useConsulta<{ data: { id: string; nombre: string; provincia?: string }[] }>(
      "/catalogos/ciudades",
    );
  const [oficina, setOficina] = useState(""),
    [origen, setOrigen] = useState(""),
    [destino, setDestino] = useState(""),
    [fecha, setFecha] = useState(hoyEnEcuador()),
    [cantidad, setCantidad] = useState(1);
  useEffect(() => {
    const primera = contexto.datos?.oficinas[0]?.id;
    if (primera && !oficina) setOficina(primera);
  }, [contexto.datos, oficina]);
  const [viajes, setViajes] = useState<ViajeResultado[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [buscado, setBuscado] = useState(false),
    [viaje, setViaje] = useState<ViajeResultado | null>(null),
    [detalle, setDetalle] = useState<
      (DetalleViaje & { mapa: MapaViaje }) | null
    >(null),
    [seleccion, setSeleccion] = useState<string[]>([]);
  const [reserva, setReserva] = useState<ReservaPendiente | null>(null),
    [beneficios, setBeneficios] = useState<BeneficioVigente[]>([]),
    [fichas, setFichas] = useState<FichaPasajero[]>([]),
    [errores, setErrores] = useState<ErroresFicha[]>([]),
    [paso, setPaso] = useState(1),
    [recibido, setRecibido] = useState(""),
    [clave, setClave] = useState(() => crypto.randomUUID());
  const claveReserva = useRef({ firma: "", clave: crypto.randomUUID() });
  const [ocupado, setOcupado] = useState(false),
    [error, setError] = useState(""),
    [resultado, setResultado] = useState(false);
  const [cobro, setCobro] = useState<CobroConfirmado | null>(null);
  const [plegados, setPlegados] = useState<Record<string, boolean>>({});
  const [confirmacion, setConfirmacion] = useState<"cobrar" | "cancelar" | null>(null);
  const bloqueo = useRef(false),
    peticion = useRef(0);
  async function trabajar(fn: () => Promise<void>) {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la operación.",
      );
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }
  useEffect(() => {
    let vivo = true;
    if (!rid) {
      setReserva(null);
      setResultado(false);
      return;
    }
    Promise.all([obtenerReserva(rid), obtenerBeneficios(rid)])
      .then(([r, b]) => {
        if (!vivo) return;
        setReserva(r);
        setBeneficios(b);
        setFichas(
          r.asientos.map((a) => {
            const p = r.pasajeros.find(
              (p) => p.reserva_asiento_id === a.reserva_asiento_id,
            );
            const f = p ? pasajeroAFicha(p) : fichaVacia(a.reserva_asiento_id);
            return {
              ...f,
              ...(a === r.asientos[0] && r.contacto
                ? { email: r.contacto.email, telefono: r.contacto.telefono }
                : {}),
            };
          }),
        );
        setPaso(r.cotizacion ? 4 : 3);
        setResultado(r.estado === "CONFIRMADA");
      })
      .catch((e) => {
        if (vivo) setError(e.message);
      });
    return () => {
      vivo = false;
    };
  }, [rid]);
  async function buscar(mas = false) {
    await trabajar(async () => {
      if (!oficina)
        throw new Error("Tu cuenta no tiene una oficina activa asignada.");
      if (!origen || !destino || origen === destino)
        throw new Error("Selecciona un origen y un destino diferentes.");
      const p = new URLSearchParams({
        origen_ciudad_id: origen,
        destino_ciudad_id: destino,
        fecha,
        cantidad: String(cantidad),
      });
      if (mas && cursor) p.set("cursor", cursor);
      const d = await apiCompra<{
        data: ViajeResultado[];
        next_cursor: string | null;
      }>("/viajes?" + p);
      setViajes((v) => (mas ? [...v, ...d.data] : d.data));
      setCursor(d.next_cursor);
      setBuscado(true);
    });
  }
  async function elegir(v: ViajeResultado) {
    const n = ++peticion.current;
    await trabajar(async () => {
      const d = await apiCompra<DetalleViaje & { mapa: MapaViaje }>(
        "/viajes/" +
          v.viaje_id +
          "?origen_orden=" +
          v.origen_orden +
          "&destino_orden=" +
          v.destino_orden,
      );
      if (n !== peticion.current) return;
      setViaje(v);
      setDetalle(d);
      setSeleccion([]);
      setPaso(2);
    });
  }
  async function reservar() {
    await trabajar(async () => {
      if (!viaje || seleccion.length !== cantidad) return;
      const firma = JSON.stringify([
        oficina,
        viaje.viaje_id,
        viaje.origen_orden,
        viaje.destino_orden,
        [...seleccion].sort(),
      ]);
      if (claveReserva.current.firma !== firma)
        claveReserva.current = { firma, clave: crypto.randomUUID() };
      const r = await http<ReservaPendiente>("/oficina/ventas/reservas", {
        method: "POST",
        body: JSON.stringify({
          oficina_id: oficina,
          viaje_id: viaje.viaje_id,
          origen_orden: viaje.origen_orden,
          destino_orden: viaje.destino_orden,
          asiento_ids: seleccion,
          clave: claveReserva.current.clave,
        }),
      });
      setParams({ reserva_id: r.reserva_id });
    });
  }
  async function guardar() {
    if (!reserva) return;
    const v = validarFichas(
      fichas,
      reserva.asientos.map((a) => a.reserva_asiento_id),
      hoyEnEcuador(),
      beneficios,
    );
    setErrores(v.porFicha);
    if (v.general || v.porFicha.some((e) => Object.keys(e).length)) {
      setError(v.general ?? "Revisa los campos de los pasajeros.");
      return;
    }
    await trabajar(async () => {
      await guardarPasajeros(reserva.reserva_id, {
        contacto: {
          email: fichas[0].email.trim(),
          telefono: fichas[0].telefono.trim(),
        },
        pasajeros: fichas.map(fichaAPasajero),
      });
      await cotizarReserva(reserva.reserva_id);
      setReserva(await obtenerReserva(reserva.reserva_id));
      setPaso(4);
      setClave(crypto.randomUUID());
      claveReserva.current = { firma: "", clave: crypto.randomUUID() };
      setSeleccion([]);
      setViaje(null);
      setRecibido("");
    });
  }
  async function transferir() {
    if (!reserva?.cotizacion) return;
    await trabajar(async () => {
      await apiCompra("/reservas/"+reserva.reserva_id+"/aceptar-cotizacion", {method:"POST",body:JSON.stringify({version:reserva.cotizacion!.version})});
      navigate("/pago?reserva_id="+reserva.reserva_id);
    });
  }
  async function cobrar(confirmado = false) {
    if (!reserva?.cotizacion) return;
    const centavos = Math.round(Number(recibido) * 100);
    if (
      !/^\d+(\.\d{1,2})?$/.test(recibido) ||
      !Number.isSafeInteger(centavos) ||
      centavos < reserva.cotizacion.total_centavos
    ) {
      setError(
        "El efectivo recibido debe cubrir el total y tener hasta dos decimales.",
      );
      return;
    }
    if (!confirmado) { setConfirmacion("cobrar"); return; }
    setConfirmacion(null);
    await trabajar(async () => {
      await apiCompra(
        "/reservas/" + reserva.reserva_id + "/aceptar-cotizacion",
        {
          method: "POST",
          body: JSON.stringify({ version: reserva.cotizacion!.version }),
        },
      );
      const confirmado = await http<CobroConfirmado>("/oficina/ventas/" + reserva.reserva_id + "/cobro", {
        method: "POST",
        body: JSON.stringify({ recibidoCentavos: centavos, clave }),
      });
      setCobro(confirmado);
      setResultado(true);
      setReserva(await obtenerReserva(reserva.reserva_id));
    });
  }
  async function cancelar(confirmado = false) {
    if (!reserva) {
      setPaso(1);
      setViaje(null);
      return;
    }
    if (!confirmado) { setConfirmacion("cancelar"); return; }
    setConfirmacion(null);
    await trabajar(async () => {
      await cancelarReserva(reserva.reserva_id);
      setParams({});
      setReserva(null);
      setFichas([]);
      setPaso(1);
      setClave(crypto.randomUUID());
      claveReserva.current = { firma: "", clave: crypto.randomUUID() };
      setSeleccion([]);
      setViaje(null);
      setRecibido("");
    });
  }
  return (
    <div className="of-vista of-VentaOficinaReal space-y-4 pb-2">
      <header>
        <h1 className="text-2xl font-bold text-[#08035b] sm:text-3xl">
          Venta en oficina
        </h1>
        <p className="mt-1 text-sm text-blue-800 sm:text-base">Registra la venta de boletos en la oficina.</p>
      </header>
      <ol className="grid grid-cols-4 gap-2 rounded-lg border border-blue-100 bg-white px-2 py-4 sm:p-4" aria-label="Pasos de venta">
        {["Viaje","Asientos","Pasajeros","Cobro"].map((n,i)=><li key={n} aria-current={paso===i+1?"step":undefined} className="relative flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:text-left"><span className={"grid size-9 shrink-0 place-items-center rounded-full text-xl font-bold text-white sm:size-10 "+(paso>i+1?"bg-green-700":paso===i+1?"bg-[#ff0018]":"bg-slate-300")}>{paso>i+1?<Icono nombre="check" className="size-6"/>:i+1}</span><span className="text-xs font-semibold text-blue-800 sm:text-sm">{i+1}. {n}<span className={"hidden text-xs font-normal sm:block "+(paso>i+1?"text-green-700":paso===i+1?"text-red-600":"text-slate-500")}>{paso>i+1?"Completado":paso===i+1?"En proceso":"Pendiente"}</span></span></li>)}
      </ol>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {ocupado && <p role="status">Procesando…</p>}
      {resultado && reserva ? (
        <Tarjeta titulo="Venta confirmada">
          <Aviso>
            El pago está registrado. Consulta el boleto para imprimirlo o
            descargarlo. No se confirma el envío de avisos externos.
          </Aviso>
          {cobro?.reserva_id === reserva.reserva_id && (
            <dl className="mt-4 grid grid-cols-1 gap-3 rounded-md bg-blue-50 p-4 sm:grid-cols-3">
              <div><dt>Total pagado</dt><dd className="font-semibold">{dinero(cobro.total_centavos / 100)}</dd></div>
              <div><dt>Efectivo recibido</dt><dd className="font-semibold">{dinero(cobro.recibido_centavos / 100)}</dd></div>
              <div><dt>Cambio entregado</dt><dd className="font-semibold">{dinero(cobro.cambio_centavos / 100)}</dd></div>
            </dl>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className={primario}
              to={"/pago/confirmacion?reserva_id=" + reserva.reserva_id}
            >
              Ver boleto
            </Link>
            <button
              className={boton}
              onClick={() => {
                setParams({});
                setPaso(1);
                setReserva(null);
                setCobro(null);
                setResultado(false);
                setCobro(null);
                setClave(crypto.randomUUID());
                claveReserva.current = {
                  firma: "",
                  clave: crypto.randomUUID(),
                };
                setSeleccion([]);
                setViaje(null);
                setRecibido("");
              }}
            >
              Nueva venta
            </button>
          </div>
        </Tarjeta>
      ) : (
        <>
          {paso === 1 && (
            <>
              <Tarjeta titulo="Seleccionar viaje">
                <ConsultaEstado {...contexto} />
                <ConsultaEstado {...ciudades} />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void buscar();
                  }}
                  className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5"
                >
                  {[
                    {
                      texto: "Origen",
                      valor: origen,
                      cambiar: setOrigen,
                    },
                    {
                      texto: "Destino",
                      valor: destino,
                      cambiar: setDestino,
                    },
                  ].map((c) => (
                    <label key={c.texto}>
                      {c.texto}
                      <ComboBusqueda
                        value={c.valor}
                        onChange={(val) => {
                          c.cambiar(val);
                          setViajes([]);
                          setBuscado(false);
                        }}
                        opciones={(ciudades.datos?.data ?? []).map((o) => ({
                          valor: o.id,
                          etiqueta: o.provincia
                            ? `${o.nombre} (${o.provincia})`
                            : o.nombre,
                          subtitulo: o.provincia,
                        }))}
                        placeholder="Cantón o provincia…"
                        className={campo}
                      />
                    </label>
                  ))}
                  <label>
                    Fecha
                    <input
                      type="date"
                      required
                      min={hoyEnEcuador()}
                      className={campo}
                      value={fecha}
                      onChange={(e) => {
                        setFecha(e.target.value);
                        setViajes([]);
                        setBuscado(false);
                      }}
                    />
                  </label>
                  <label>
                    Pasajeros
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      className={campo}
                      value={cantidad}
                      onChange={(e) => {
                        setCantidad(Number(e.target.value));
                        setViajes([]);
                        setBuscado(false);
                      }}
                    />
                  </label>
                  <button disabled={ocupado} className={primario + " min-h-11 self-end lg:justify-self-end"}>
                    <Icono nombre="lupa" className="size-4"/>Buscar viajes
                  </button>
                </form>
              </Tarjeta>
              {buscado && viajes.length === 0 && (
                <Aviso>No hay viajes para esta búsqueda.</Aviso>
              )}
              {viajes.map((v) => (
                <Tarjeta
                  key={v.viaje_id}
                  titulo={v.origen.ciudad + " → " + v.destino.ciudad}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p>
                        {v.cooperativa} · {v.bus.grupo}
                      </p>
                      <p>
                        {fechaHora(v.salida)} · {v.plazas_disponibles}{" "}
                        disponibles
                      </p>
                      <p>
                        Desde {dinero(v.tarifa_desde_centavos / 100)} por
                        pasajero
                      </p>
                    </div>
                    <button
                      disabled={ocupado}
                      className={primario}
                      onClick={() => void elegir(v)}
                    >
                      Seleccionar
                    </button>
                  </div>
                </Tarjeta>
              ))}
              {cursor && (
                <button
                  disabled={ocupado}
                  className={boton}
                  onClick={() => void buscar(true)}
                >
                  Cargar más viajes
                </button>
              )}
            </>
          )}
          {paso === 2 && detalle && viaje && (
            <Tarjeta
              titulo={viaje.origen.ciudad + " → " + viaje.destino.ciudad}
            >
              <SelectorAsientos
                mapa={detalle.mapa}
                cantidad={cantidad}
                seleccion={seleccion}
                onChange={setSeleccion}
              />
              <div className="mt-5 flex justify-between gap-3">
                <button
                  className={boton}
                  disabled={ocupado}
                  onClick={() => setPaso(1)}
                >
                  Volver a viajes
                </button>
                <button
                  className={primario}
                  disabled={ocupado || seleccion.length !== cantidad}
                  onClick={() => void reservar()}
                >
                  Reservar {seleccion.length} de {cantidad} y continuar
                </button>
              </div>
            </Tarjeta>
          )}
          {reserva && (
            <Aviso>
              Retención activa hasta {fechaHora(reserva.expires_at)}. Los datos
              se guardan al continuar; el cobro requiere confirmación.
            </Aviso>
          )}
          {paso === 3 && reserva && (
            <>
              <div className="space-y-4">
                {fichas.map((f, i) => (
                  <PassengerForm
                    key={f.reserva_asiento_id}
                    reservaId={reserva.reserva_id}
                    indice={i}
                    asiento={reserva.asientos[i]}
                    pisosBus={reserva.bus.pisos}
                    ficha={f}
                    errores={errores[i] ?? {}}
                    onCambiar={(f) =>
                      setFichas((v) => v.map((x, j) => (i === j ? f : x)))
                    }
                    beneficios={beneficios}
                    fechaSalida={diaEnEcuador(reserva.viaje.salida)}
                    hoy={hoyEnEcuador()}
                    abierta={!plegados[f.reserva_asiento_id]}
                    onAlternar={() => setPlegados(v => ({...v, [f.reserva_asiento_id]: !v[f.reserva_asiento_id]}))}
                  />
                ))}
              </div>
              <div className="flex justify-between gap-3">
                <button
                  disabled={ocupado}
                  className={boton}
                  onClick={() => void cancelar()}
                >
                  Cancelar venta
                </button>
                <button
                  className={primario}
                  disabled={ocupado}
                  onClick={() => void guardar()}
                >
                  Calcular total y continuar
                </button>
              </div>
            </>
          )}
          {paso === 4 && reserva?.cotizacion && (
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
              <div className="space-y-4">
                <PanelVenta titulo="Viaje seleccionado" icono="bus" accion={<button className="inline-flex min-h-9 items-center gap-2 text-sm text-blue-700 hover:underline" disabled={ocupado} onClick={()=>void cancelar()}><Icono nombre="editar" className="size-4"/>Cambiar viaje</button>}>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md border border-blue-100 bg-blue-50/50 p-4 text-blue-900"><div><strong className="text-xl">{reserva.viaje.origen.ciudad}</strong><p className="mt-1 text-sm">{diaVenta(reserva.viaje.salida)}</p><strong className="mt-1 block text-2xl">{horaVenta(reserva.viaje.salida)}</strong></div><Icono nombre="flechaDerecha" className="size-7 text-blue-700"/><div><strong className="text-xl">{reserva.viaje.destino.ciudad}</strong><p className="mt-1 text-sm">{diaVenta(reserva.viaje.llegada)}</p><strong className="mt-1 block text-2xl">{horaVenta(reserva.viaje.llegada)}</strong></div></div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-blue-800 sm:grid-cols-4"><div className="flex gap-2"><Icono nombre="bus"/><p>Unidad<strong className="block wrap-anywhere">{reserva.bus.unidad}</strong></p></div><div className="flex gap-2"><Icono nombre="documento"/><p>Placa<strong className="block wrap-anywhere">{reserva.bus.placa}</strong></p></div><div className="flex gap-2"><Icono nombre="asiento"/><p>Servicio<strong className="block">{reserva.bus.grupo}</strong></p></div><div className="flex gap-2"><Icono nombre="asiento"/><p>Piso<strong className="block">{[...new Set(reserva.asientos.map(a=>a.piso))].join(" / ")}</strong></p></div></div>
                </PanelVenta>
                <PanelVenta titulo="Pasajeros y asientos" icono="personas" accion={<button className="inline-flex min-h-9 items-center gap-2 text-sm text-blue-700 hover:underline" disabled={ocupado} onClick={()=>setPaso(3)}><Icono nombre="editar" className="size-4"/>Editar pasajeros</button>}>
                  <div className="hidden lg:block"><table className="w-full table-fixed text-left text-xs [&_td]:px-1.5! [&_th]:px-1.5!"><colgroup><col className="w-[5%]"/><col className="w-[25%]"/><col className="w-[17%]"/><col className="w-[10%]"/><col className="w-[12%]"/><col className="w-[10%]"/><col className="w-[10%]"/><col className="w-[11%]"/></colgroup><thead><tr>{["#","Nombre completo","Documento","Asiento","Tipo","Tarifa","Desc.","Subtotal"].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{reserva.pasajeros.map((p,i)=>{const asiento=reserva.asientos.find(a=>a.reserva_asiento_id===p.reserva_asiento_id);const linea=reserva.cotizacion!.lineas.find(l=>l.reserva_asiento_id===p.reserva_asiento_id);return <tr key={p.reserva_asiento_id}><td>{i+1}</td><td className="wrap-break-word">{p.nombres} {p.apellidos}</td><td className="wrap-anywhere">{p.documento}</td><td className="font-bold">{asiento?.codigo}</td><td className="wrap-break-word">{({ADULTO:"Adulto",NINO:"Niño",TERCERA_EDAD:"Tercera edad",DISCAPACIDAD:"Discapacidad"})[p.tipo_pasajero??"ADULTO"]}</td><td className="whitespace-nowrap">{linea?dinero(linea.base_centavos/100):"—"}</td><td className="whitespace-nowrap text-green-700">{linea?dinero(linea.descuento_centavos/100):"—"}</td><td className="font-bold whitespace-nowrap">{linea?dinero(linea.total_centavos/100):"—"}</td></tr>})}</tbody></table></div>
                  <div className="space-y-2 lg:hidden">{reserva.pasajeros.map((p,i)=>{const a=reserva.asientos.find(a=>a.reserva_asiento_id===p.reserva_asiento_id);const l=reserva.cotizacion!.lineas.find(l=>l.reserva_asiento_id===p.reserva_asiento_id);return <div key={p.reserva_asiento_id} className="flex items-center gap-3 rounded-md border border-blue-100 p-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-blue-50">{i+1}</span><div className="min-w-0 flex-1"><p>{p.nombres} {p.apellidos}</p><small className="text-blue-700">{a?.codigo} · {p.tipo_pasajero}</small></div><strong>{l?dinero(l.total_centavos/100):"—"}</strong></div>})}</div>
                </PanelVenta>
                <PanelVenta titulo="Datos del comprador" icono="persona" accion={<button className="inline-flex min-h-9 items-center gap-2 text-sm text-blue-700 hover:underline" disabled={ocupado} onClick={()=>setPaso(3)}><Icono nombre="editar" className="size-4"/>Editar</button>}><div className="grid gap-3 text-sm text-blue-800 sm:grid-cols-2"><p className="flex min-w-0 items-center gap-2"><Icono nombre="correo"/><span className="wrap-anywhere">{reserva.contacto?.email}</span></p><p className="flex items-center gap-2"><Icono nombre="soporte"/>{reserva.contacto?.telefono}</p></div></PanelVenta>
              </div>
              <PanelVenta titulo="Cobro en efectivo" icono="dinero">

                <div className="mb-4 flex flex-wrap gap-2 text-sm"><span className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-800">● Efectivo</span><span className="rounded-md border border-slate-100 px-3 py-2 text-slate-400">Tarjeta · Próximamente</span><button className={boton} disabled={ocupado} onClick={()=>void transferir()}>Transferencia</button></div>
                <dl className="of-cobro-desglose space-y-2 rounded-md border border-blue-100 p-3">
                  <div className="flex justify-between gap-3"><dt>Subtotal base</dt><dd>{dinero(reserva.cotizacion.base_centavos/100)}</dd></div>
                  <div className="flex justify-between gap-3 text-green-700"><dt>Descuento total</dt><dd>− {dinero(reserva.cotizacion.descuento_centavos/100)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>Cargo por servicio</dt><dd>{dinero(reserva.cotizacion.servicio_centavos/100)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>IVA ({reserva.cotizacion.impuesto_bp/100}%)</dt><dd>{dinero(reserva.cotizacion.iva_centavos/100)}</dd></div>
                  <div className="flex justify-between gap-3 border-t border-blue-100 pt-2 text-lg font-bold"><dt>Total a pagar</dt><dd>{dinero(reserva.cotizacion.total_centavos/100)}</dd></div>
                </dl>
                <label className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  Efectivo recibido (USD)
                  <input
                    inputMode="decimal"
                    className={campo + " sm:max-w-36"}
                    value={recibido}
                    onChange={(e) => { setRecibido(e.target.value); setError(""); }}
                    disabled={ocupado}
                  />
                </label>
                <p className="my-4 rounded-md bg-green-50 p-3 text-xl font-bold text-green-700">
                  Cambio:{" "}
                  {dinero(
                    Math.max(
                      0,
                      (Number.isFinite(Number(recibido))
                        ? Math.round(Number(recibido || 0) * 100)
                        : 0) - reserva.cotizacion.total_centavos,
                    ) / 100,
                  )}
                </p>
                <Aviso>
                  Se confirma la compra y se emite un boleto consolidado. El
                  envío automático de correo y WhatsApp depende de que los servicios estén configurados.
                </Aviso>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className={boton}
                    disabled={ocupado}
                    onClick={() => void cancelar()}
                  >
                    Cancelar venta
                  </button>
                  <button
                    className={primario}
                    disabled={ocupado}
                    onClick={() => void cobrar()}
                  >
                    <Icono nombre="boleto" className="size-5"/>Cobrar y emitir boleto
                  </button>
                </div>
              </PanelVenta>
            </div>
          )}
        </>
      )}
      {confirmacion && <Dialogo titulo={confirmacion === "cobrar" ? "Confirmar cobro en efectivo" : "Cancelar venta"} cerrar={()=>setConfirmacion(null)}><p>{confirmacion === "cobrar" ? "Confirma que recibiste " + dinero(Number(recibido)) + " en efectivo. Se registrará el pago y se emitirá el boleto." : "Se cancelará esta reserva pendiente y se liberarán sus asientos."}</p><div className="mt-5 flex flex-wrap justify-end gap-3"><button className={boton} onClick={()=>setConfirmacion(null)}>Volver</button><button className={primario} disabled={ocupado} onClick={()=>void (confirmacion === "cobrar" ? cobrar(true) : cancelar(true))}>{confirmacion === "cobrar" ? "Confirmar cobro" : "Confirmar cancelación"}</button></div></Dialogo>}
    </div>
  );
}
