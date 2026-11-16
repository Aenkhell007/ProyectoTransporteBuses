import { useEffect, useRef, useState } from "react";
import { http } from "../../services/http";
import { Icono } from "../../components/compra/Icono";
import {
  Aviso,
  Dialogo,
  boton,
  campo,
  ConsultaEstado,
  dinero,
  Estado,
  etiquetaEstado,
  fechaHora,
  Indicadores,
  primario,
  Tarjeta,
  useConsulta,
} from "./ui";
import type { ReactNode } from "react";
function BloqueReembolso({titulo,children,accion}:{titulo:string;children:ReactNode;accion?:ReactNode}) { return <section className="min-w-0 rounded-lg border border-blue-100 bg-white p-3 sm:p-4"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-xl font-bold tracking-tight text-[#1002b4] sm:text-2xl"><Icono nombre={/Historial/.test(titulo)?"reloj":"documento"} className="size-8"/>{titulo}</h2>{accion}</div>{children}</section> }
const anticipacion=(x:{salida:string;created_at:string})=>{const minutos=Math.floor((new Date(x.salida).getTime()-new Date(x.created_at).getTime())/60000);return minutos<0?"Después de la salida":minutos<60?minutos+" min antes de la salida":Math.floor(minutos/60)+" h antes de la salida";};
import type { ReservaOficina } from "./datos";
interface Solicitud {
  id: string;
  compra_id: string;
  codigo: string;
  cliente: string;
  cooperativa: string;
  salida: string;
  estado: string;
  motivo: string;
  decision_motivo: string | null;
  created_at: string;
  decidido_at: string | null;
  ejecutado_at: string | null;
  referencia_externa: string | null;
  total_pagado_centavos: number;
  porcentaje_bp: number;
  monto_centavos: number;
  politica_version: number;
  politica_estado: string;
  base_centavos?: number;
  pasajeros_solicitados?: {id:string;nombre:string;codigo:string;piso:number}[];
}
interface Elegibilidad {
  elegible: boolean;
  motivo?: string;
  porcentajeBp?: number;
  montoCentavos?: number;
}
export function ReembolsosReal() {
  const c = useConsulta<{ solicitudes: Solicitud[] }>("/oficina/reembolsos");
  const compras = useConsulta<{ reservas: ReservaOficina[] }>(
    "/oficina/reservas",
  );
  const [id, seleccionar] = useState(""),
    [busqueda, B] = useState(""),
    [estado, S] = useState(""),
    [fecha, F] = useState(""),
    [porcentaje, cambiarPorcentaje] = useState(""),
    [cooperativa, cambiarCooperativa] = useState(""),
    [motivo, M] = useState("");
  const [error, E] = useState(""),
    [mensaje, G] = useState(""),
    [ocupado, O] = useState(false),
    [nuevo, N] = useState(false),
    [compra, C] = useState(""),
    [elegible, L] = useState<Elegibilidad | null>(null);
  const consultaElegibilidad = useRef(0);
  const [archivo, A] = useState<File | null>(null),
    [referencia, R] = useState("");
  const [clave, K] = useState(() => crypto.randomUUID());
  const [confirmacion, confirmar] = useState<"aprobar"|"rechazar"|"abonar"|null>(null);
  const solicitudes = c.datos?.solicitudes ?? [];
  const filtradas = solicitudes.filter(
    (x) =>
      (!estado || x.estado === estado) &&
      (!porcentaje || Number(x.porcentaje_bp) === Number(porcentaje)) &&
      (!cooperativa || x.cooperativa === cooperativa) &&
      (!fecha ||
        new Date(x.salida).toLocaleDateString("en-CA", {
          timeZone: "America/Guayaquil",
        }) === fecha) &&
      (x.codigo + " " + x.cliente)
        .toLowerCase()
        .includes(busqueda.trim().toLowerCase()),
  );
  const d=filtradas.find(x=>x.id===id) ?? (!id?filtradas[0]:undefined);
  useEffect(()=>{M(""); A(null); R(""); confirmar(null); K(crypto.randomUUID());},[d?.id]);
  const hoy=new Date().toLocaleDateString("en-CA",{timeZone:"America/Guayaquil"});
  async function accion(fn: () => Promise<unknown>, exito: string) {
    if (ocupado) return;
    O(true);
    E("");
    G("");
    try {
      await fn();
      G(exito);
      if(nuevo){N(false);C("");L(null);consultaElegibilidad.current+=1;}
      M("");
      A(null);
      R("");
      K(crypto.randomUUID());
      c.recargar();
    } catch (e) {
      E((e as Error).message);
    } finally {
      O(false);
    }
  }
  async function elegirCompra(v: string) {
    const n = ++consultaElegibilidad.current;
    C(v);
    L(null);
    E("");
    K(crypto.randomUUID());
    if (!v) return;
    try {
      const r = await http<Elegibilidad>(
        "/oficina/reembolsos/elegibilidad/" + v,
      );
      if (n === consultaElegibilidad.current) L(r);
    } catch (e) {
      if (n === consultaElegibilidad.current) E((e as Error).message);
    }
  }
  function decidir(aprobar: boolean, confirmado = false) {
    if (ocupado || c.cargando) return;
    if (d?.politica_estado === "BORRADOR") { E("La política todavía está en borrador."); return; }
    if (!d || !motivo.trim()) {
      E("Escribe el motivo de la decisión.");
      return;
    }
    if(!confirmado){confirmar(aprobar ? "aprobar" : "rechazar");return;}
    confirmar(null);
    void accion(
      () =>
        http("/oficina/reembolsos/" + d.id + "/decision", {
          method: "POST",
          body: JSON.stringify({ aprobar, motivo }),
        }),
      aprobar
        ? "Solicitud aprobada. Falta registrar el abono real."
        : "Solicitud rechazada.",
    );
  }
  function abonar(confirmado = false) {
    if (ocupado || c.cargando) return;
    if (!d || !archivo || !referencia.trim()) {
      E("Adjunta el respaldo e indica la referencia del abono.");
      return;
    }
    if(!confirmado){confirmar("abonar");return;}
    confirmar(null);
    void accion(
      () =>
        http(
          "/oficina/reembolsos/" +
            d.id +
            "/abono?clave=" +
            clave +
            "&referencia=" +
            encodeURIComponent(referencia),
          {
            method: "POST",
            headers: {
              "Content-Type": archivo.type,
              "X-File-Name": encodeURIComponent(archivo.name),
            },
            body: archivo,
          },
        ),
      "Abono registrado con su respaldo.",
    );
  }
  const base = (
    (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"
  ).replace(/\/$/, "");
  return (
    <div className="of-vista of-ReembolsosReal space-y-4 pb-2">
      <header><h1 className="text-3xl font-bold tracking-tight text-[#1002b4]">Solicitudes de reembolso</h1><p className="mt-1 text-sm text-blue-800 sm:text-base">Gestiona las solicitudes de devolución de pasajes.</p></header>
      <ConsultaEstado {...c} />
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}
      {mensaje && <Aviso>{mensaje}</Aviso>}
      <Indicadores
        items={[
          { nombre: "Solicitudes de hoy", color: "azul", valor: solicitudes.filter(x=>new Date(x.created_at).toLocaleDateString("en-CA",{timeZone:"America/Guayaquil"})===hoy).length },
          {
            nombre: "Solicitadas",
            valor: solicitudes.filter((x) => x.estado === "SOLICITADO").length,
          },
          {
            nombre: "Completadas",
            valor: solicitudes.filter((x) => x.estado === "EJECUTADO").length,
          },
          {
            nombre: "Rechazadas",
            valor: solicitudes.filter((x) => x.estado === "RECHAZADO").length,
          },
        ]}
      />
      <Tarjeta>
        <div className="of-filtros-reembolsos grid grid-cols-2 items-end gap-3 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <label>
            Reserva / cliente
            <span className="relative block"><Icono nombre="lupa" className="pointer-events-none absolute top-4 left-3 size-5 text-indigo-500"/>
            <input
              className={campo+" pl-10"}
              value={busqueda}
              onChange={(e) => B(e.target.value)}
              placeholder="Buscar por reserva o cliente"
            /></span>
          </label>
          <label>
            Fecha de viaje
            <input
              type="date"
              className={campo}
              value={fecha}
              onChange={(e) => F(e.target.value)}
            />
          </label>
          <label>
            Estado
            <select
              className={campo}
              value={estado}
              onChange={(e) => S(e.target.value)}
            >
              <option value="">Todos</option>
              {["SOLICITADO", "APROBADO", "EJECUTADO", "RECHAZADO"].map((x) => (
                <option key={x} value={x}>{etiquetaEstado(x)}</option>
              ))}
            </select>
          </label>
          <label>Porcentaje de devolución<select className={campo} value={porcentaje} onChange={e=>cambiarPorcentaje(e.target.value)}><option value="">Todos</option>{[...new Set(solicitudes.map(x=>Number(x.porcentaje_bp)))].sort((a,b)=>a-b).map(p=><option key={p} value={p}>{p/100}%</option>)}</select></label>
          <label>Cooperativa<select className={campo} value={cooperativa} onChange={e=>cambiarCooperativa(e.target.value)}><option value="">Todas</option>{[...new Set(solicitudes.map(x=>x.cooperativa))].map(p=><option key={p}>{p}</option>)}</select></label>
        </div>
      </Tarjeta>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-4">
          {solicitudes.some(x => x.politica_estado !== "PUBLICADA") && <div className="of-alerta"><Icono nombre="alerta" /><div><strong>Propuesta en revisión</strong><p>Algunas solicitudes requieren revisión de su política antes de procesar la devolución.</p></div></div>}
          <BloqueReembolso titulo="Solicitudes de reembolso" accion={<button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#ff0018] px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" disabled={ocupado} onClick={()=>{N(!nuevo);E("");M("");C("");L(null);consultaElegibilidad.current+=1;K(crypto.randomUUID());}}><span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-white text-lg leading-none text-red-600">+</span>{nuevo?"Cerrar formulario":"Nueva solicitud de reembolso"}</button>}>
            {nuevo && (
              <form
                className="mb-5 space-y-3 rounded border border-blue-100 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void accion(
                    () =>
                      http("/oficina/reembolsos", {
                        method: "POST",
                        body: JSON.stringify({
                          compraId: compra,
                          motivo,
                          clave,
                        }),
                      }),
                    "Solicitud registrada.",
                  );
                }}
              >
                <label className="block">
                  Compra
                  <select
                    required
                    className={campo}
                    value={compra}
                    onChange={(e) => void elegirCompra(e.target.value)}
                  >
                    <option value="">Selecciona una compra</option>
                    {(compras.datos?.reservas ?? [])
                      .filter(
                        (x) => x.compra_id && x.estado_actual === "CONFIRMADA",
                      )
                      .map((x) => (
                        <option key={x.id} value={x.compra_id!}>
                          {x.compra_codigo} · {x.cliente}
                        </option>
                      ))}
                  </select>
                </label>
                <ConsultaEstado {...compras} />
                {elegible && (
                  <Aviso>
                    {elegible.elegible
                      ? "Devolución calculada por el servidor: " +
                        dinero(Number(elegible.montoCentavos) / 100)
                      : (elegible.motivo ?? "La compra no es elegible.")}
                  </Aviso>
                )}
                <label className="block">
                  Motivo
                  <textarea
                    required
                    maxLength={500}
                    className={campo}
                    value={motivo}
                    onChange={(e) => M(e.target.value)}
                  />
                </label>
                <button
                  disabled={ocupado || !elegible?.elegible}
                  className={primario}
                >
                  Registrar solicitud
                </button>
              </form>
            )}
            <div className="space-y-3 lg:hidden">
              {filtradas.map((x) => (
                <button
                  type="button"
                  key={x.id}
                  className={
                    "w-full rounded-lg border p-4 text-left " +
                    (d?.id === x.id
                      ? "border-amber-300 bg-amber-50"
                      : "border-blue-100")
                  }
                  onClick={() => {
                    seleccionar(x.id);
                    M("");
                    E("");
                    N(false);
                    A(null);
                    R("");
                    K(crypto.randomUUID());
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="min-w-0 truncate" title={x.codigo}>{x.codigo}</strong>
                    <Estado valor={x.estado} />
                  </div>
                  <p className="mt-2">{x.cliente}</p>
                  <p className="mt-2 text-sm">
                    Pagado: {dinero(Number(x.total_pagado_centavos) / 100)} ·{" "}
                    {Number(x.porcentaje_bp) / 100}% · A devolver:{" "}
                    <strong>{dinero(Number(x.monto_centavos) / 100)}</strong>
                  </p>
                  <span className="mt-2 block text-sm underline">
                    Ver detalle de solicitud
                  </span>
                </button>
              ))}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full table-fixed text-left text-sm">
                <colgroup><col className="w-[17%]"/><col className="w-[17%]"/><col className="w-[12%]"/><col className="w-[12%]"/><col className="w-[14%]"/><col className="w-[14%]"/><col className="w-[14%]"/></colgroup>
                <thead className="bg-blue-50">
                  <tr>
                    {[
                      "Reserva",
                      "Cliente",
                      "Pagado",
                      "Porcentaje",
                      "A devolver",
                      "Estado",
                      "Acción",
                    ].map((x) => (
                      <th className="p-3" key={x}>
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((x) => (
                    <tr
                      key={x.id}
                      className={
                        "border-b border-blue-100 " +
                        (d?.id === x.id ? "bg-amber-50" : "")
                      }
                    >
                      <td className="p-3"><span className="block truncate" title={x.codigo}>{x.codigo}</span></td>
                      <td className="p-3 wrap-break-word">{x.cliente}</td>
                      <td className="p-3">
                        {dinero(Number(x.total_pagado_centavos) / 100)}
                      </td>
                      <td className="p-3"><span className="inline-block rounded-md bg-blue-100 px-2 py-2 text-blue-700">{Number(x.porcentaje_bp) / 100}%</span></td>
                      <td className="p-3 font-bold">
                        {dinero(Number(x.monto_centavos) / 100)}
                      </td>
                      <td className="p-3">
                        <Estado valor={x.estado} />
                      </td>
                      <td className="p-3">
                        <button
                          className={boton+" w-full px-2"}
                          onClick={() => {
                            seleccionar(x.id);
                            M("");
                            E("");
                            N(false);
                            A(null);
                            R("");
                            K(crypto.randomUUID());
                          }}
                        >
                          <Icono nombre="documento" className="size-4"/>{x.estado === "EJECUTADO" ? "Ver respaldo" : x.estado === "RECHAZADO" ? "Ver motivo" : "Revisar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!c.cargando && !filtradas.length && (
              <p className="p-4">No hay solicitudes con estos filtros.</p>
            )}
          </BloqueReembolso>
          {d && (
            <BloqueReembolso titulo="Historial de la solicitud">
              <div className="of-timeline">
              <p><strong className="block text-sm text-blue-800">Solicitud de reembolso creada</strong><span className="block text-sm text-blue-700">El cliente solicitó la devolución del pasaje.</span><time className="mt-1 block text-xs text-slate-500" dateTime={d.created_at}>{fechaHora(d.created_at)}</time></p>
              {d.decidido_at && (
                <p>
                  Decisión: {d.estado} · {fechaHora(d.decidido_at)}
                </p>
              )}
              {d.ejecutado_at && (
                <p>Abono registrado · {fechaHora(d.ejecutado_at)}</p>
              )}
              </div>
            </BloqueReembolso>
          )}
        </div>
        <BloqueReembolso titulo="Detalle de solicitud">
          {!d ? (
            <p>Selecciona una solicitud.</p>
          ) : (
            <div className="space-y-4">
              <div><p className="text-xs text-blue-800">Reserva</p><p className="mt-1 truncate text-lg font-bold text-blue-900" title={d.codigo}>{d.codigo}</p></div>
              <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-blue-800">Cliente</p><p>{d.cliente}</p></div><div><p className="text-xs text-blue-800">Anticipación al solicitar</p><p className="text-red-600">{anticipacion(d)}</p></div></div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Política · versión {d.politica_version}</span><span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{d.politica_estado === "BORRADOR" ? "Borrador" : d.politica_estado === "PUBLICADA" ? "Publicada" : d.politica_estado}</span></div><Estado valor={d.estado}/>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><strong className="block text-amber-700">Motivo de la solicitud</strong><p className="mt-1 wrap-anywhere text-blue-900">{d.motivo}</p></div>
              <section className="rounded bg-blue-50 p-3 text-sm"><h3 className="font-bold">Pasajeros incluidos en la solicitud</h3>{d.pasajeros_solicitados?.length?<ul>{d.pasajeros_solicitados.map(p=><li key={p.id} className="mt-1">{p.nombre} · Asiento {p.codigo} · Piso {p.piso}</li>)}</ul>:<p>Consulta los pasajeros de la compra antes de decidir.</p>}</section><dl className="space-y-3"><div className="flex justify-between gap-3"><dt>Base de esta solicitud</dt><dd className="font-bold">{dinero(Number(d.base_centavos??d.total_pagado_centavos)/100)}</dd></div><div className="flex justify-between gap-3"><dt>Monto pagado</dt><dd className="font-bold">{dinero(Number(d.total_pagado_centavos) / 100)}</dd></div><div className="flex justify-between gap-3"><dt>Porcentaje de devolución</dt><dd className="font-bold">{Number(d.porcentaje_bp) / 100}%</dd></div><div className="flex justify-between gap-3 border-t border-blue-100 pt-3"><dt>Monto a devolver</dt><dd className="text-2xl font-bold">{dinero(Number(d.monto_centavos) / 100)}</dd></div></dl>
              {d.decision_motivo && <Aviso>{d.decision_motivo}</Aviso>}
              {d.estado === "SOLICITADO" && (
                <>
                  <label className="block">
                    Motivo de la decisión
                    <textarea
                      maxLength={500}
                      className={campo}
                      value={motivo}
                      onChange={(e) => M(e.target.value)}
                    />
                  </label>
                  <button
                    disabled={ocupado || c.cargando || d.politica_estado === "BORRADOR"}
                    className={primario + " w-full"}
                    onClick={() => decidir(true)}
                  >
                    <Icono nombre="checkCirculo"/>Aprobar devolución
                  </button>
                  <button
                    disabled={ocupado || c.cargando || d.politica_estado === "BORRADOR"}
                    className={boton + " w-full text-red-700"}
                    onClick={() => decidir(false)}
                  >
                    <Icono nombre="xCirculo"/>Rechazar solicitud
                  </button>
                </>
              )}
              {d.estado === "APROBADO" && (
                <>
                  <Aviso>
                    Aprobado no significa abonado. Registra únicamente una
                    devolución ya realizada.
                  </Aviso>
                  <label className="block">
                    Referencia del abono
                    <input
                      maxLength={200}
                      className={campo}
                      value={referencia}
                      onChange={(e) => R(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    Respaldo (JPG, PNG o PDF, máximo 5 MB)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (
                          f &&
                          (f.size > 5242880 ||
                            ![
                              "image/jpeg",
                              "image/png",
                              "application/pdf",
                            ].includes(f.type))
                        ) {
                          E("Archivo no permitido o mayor a 5 MB.");
                          e.target.value = "";
                          A(null);
                        } else A(f);
                      }}
                    />
                  </label>
                  <button
                    disabled={ocupado || c.cargando}
                    className={primario}
                    onClick={()=>abonar()}
                  >
                    Registrar abono
                  </button>
                </>
              )}
              {d.estado === "EJECUTADO" && (
                <>
                  <p>Referencia: {d.referencia_externa}</p>
                  <a
                    className={boton}
                    href={base + "/oficina/reembolsos/" + d.id + "/respaldo"}
                  >
                    Descargar respaldo
                  </a>
                </>
              )}
              {d.politica_estado === "BORRADOR" && <p className="text-xs text-slate-500">Política pendiente de publicación. La decisión permanece deshabilitada.</p>}
              <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"><Icono nombre="info"/><p><strong>Aprobado no significa abonado.</strong> Completar requiere registrar el respaldo de la devolución.</p></div>
            </div>
          )}
        </BloqueReembolso>
      </div>
      {confirmacion && d && <Dialogo titulo={confirmacion === "abonar" ? "Registrar abono realizado" : confirmacion === "aprobar" ? "Aprobar devolución" : "Rechazar solicitud"} cerrar={()=>confirmar(null)}><p>{confirmacion === "abonar" ? "Confirma que ya realizaste la devolución de " + dinero(Number(d.monto_centavos)/100) + ". Se guardará el respaldo; esta acción no transfiere dinero." : confirmacion === "aprobar" ? "Se cancelará la compra y se liberarán los asientos. El abono se registra por separado con su respaldo." : "Se rechazará la solicitud con el motivo indicado."}</p><div className="mt-4 flex justify-end gap-3"><button className={boton} onClick={()=>confirmar(null)}>Volver</button><button className={primario} disabled={ocupado} onClick={()=>confirmacion === "abonar" ? abonar(true) : decidir(confirmacion === "aprobar",true)}>Confirmar</button></div></Dialogo>}
    </div>
  );
}
