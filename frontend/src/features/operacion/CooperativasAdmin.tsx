import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { AMBITOS_OPERACION, etiquetaAmbitoOperacion } from "../../constants/ecuador";
import { identidadApi, type Contexto, type Cooperativa } from "../identidad/api";
import { LogoCooperativa } from "../identidad/Visual";
import { http, leerHttpCache } from "../../services/http";
import { CargaSeccion, useMostrarCarga } from "../../components/ui/CargaSeccion";
import { Dialogo } from "../oficina/ui";
import { guardarOperacion } from "./api";
import {
  Titulo,
  Campo,
  Kpis,
  Estado,
  Aviso,
  Icono,
  Interruptor,
  Confirmacion,
  campo,
  boton,
  primario,
} from "./ui";

export default function CooperativasAdmin() {
  const [d, setD] = useState<Contexto | null>(() =>
    leerHttpCache<Contexto>("/identidad/administracion"),
  );
  const [filas, setFilas] = useState<
    { id: string; responsable: string; buses: number }[]
  >(
    () =>
      leerHttpCache<{
        cooperativas: { id: string; responsable: string; buses: number }[];
      }>("/admin/resumen")?.cooperativas ?? [],
  );
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState("");
  const [ambitoFiltro, setAmbitoFiltro] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmacion, setConfirmacion] = useState<Cooperativa | null>(null);
  const [detalle, setDetalle] = useState<Cooperativa | null>(null);
  const bloqueo = useRef(false);
  const mostrarCarga = useMostrarCarga(!d && !error, 250);

  async function cargar() {
    try {
      const [datos, r] = await Promise.all([
        identidadApi.contexto(),
        http<{
          cooperativas: { id: string; responsable: string; buses: number }[];
        }>("/admin/resumen"),
      ]);
      setD(datos);
      setFilas(r.cooperativas);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar.");
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function cambiarEstado() {
    if (!confirmacion || bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError("");
    setMensaje("");
    try {
      const actualizado = await guardarOperacion<{
        cooperativa: { id: string; activa: boolean; version: number };
        mensaje: string;
      }>("cooperativas/" + confirmacion.id + "/estado", "", {
        activa: !confirmacion.activa,
        version: confirmacion.version,
      });
      setD((anterior) =>
        anterior
          ? {
              ...anterior,
              cooperativas: anterior.cooperativas.map((c) =>
                c.id === actualizado.cooperativa.id
                  ? { ...c, ...actualizado.cooperativa }
                  : c,
              ),
            }
          : anterior,
      );
      setMensaje(
        "La cooperativa «" +
          confirmacion.nombre +
          "» se ha " +
          (confirmacion.activa ? "desactivado" : "activado") +
          " correctamente.",
      );
      setConfirmacion(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cambiar el estado.",
      );
      setConfirmacion(null);
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  const lista =
    d?.cooperativas.filter(
      (c) =>
        (c.nombre + " " + c.ruc + " " + (c.provincia ?? "")).toLowerCase().includes(buscar.toLowerCase()) &&
        (!estado || String(c.activa) === estado) &&
        (!ambitoFiltro || (c.ambito_operacion ?? "INTERPROVINCIAL") === ambitoFiltro),
    ) ?? [];

  function estadoControl(c: Cooperativa) {
    return (
      <div
        className={
          "inline-flex items-center gap-3 rounded-lg p-2 " +
          (c.activa ? "bg-green-50" : "bg-red-50")
        }
      >
        <Estado valor={c.activa ? "Activa" : "Inactiva"} />
        <Interruptor
          nombre={"Estado de " + c.nombre}
          valor={c.activa}
          disabled={ocupado}
          cambiar={() => setConfirmacion(c)}
        />
      </div>
    );
  }

  const infoDetalle = detalle ? filas.find((v) => v.id === detalle.id) : null;

  return (
    <section className="space-y-5 py-4 text-blue-900">
      <Titulo
        titulo="Cooperativas"
        descripcion="Administra las entidades y sus responsables."
      />
      {error && (
        <Aviso tipo="error">
          {error}
          <button onClick={() => void cargar()} className="ml-3 underline">
            Actualizar datos
          </button>
        </Aviso>
      )}
      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      {mostrarCarga && <CargaSeccion />}
      {d && (
        <>
          <Kpis
            items={[
              {
                nombre: "Activas",
                valor: d.cooperativas.filter((c) => c.activa).length,
                icono: "personas",
                color: "bg-green-50 text-green-700",
              },
              {
                nombre: "Inactivas",
                valor: d.cooperativas.filter((c) => !c.activa).length,
                icono: "personas",
                color: "bg-red-50 text-red-600",
              },
              {
                nombre: "Total",
                valor: d.cooperativas.length,
                icono: "personas",
              },
            ]}
          />
          <div className="grid items-end gap-4 py-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <Campo nombre="Buscar por nombre, RUC o provincia">
              <div className="relative">
                <Icono
                  nombre="lupa"
                  className="absolute top-3 left-3 size-5 text-blue-700"
                />
                <input
                  className={campo + " pl-10"}
                  placeholder="Buscar por nombre, RUC o provincia…"
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                />
              </div>
            </Campo>
            <Campo nombre="Ámbito">
              <select
                className={campo}
                value={ambitoFiltro}
                onChange={(e) => setAmbitoFiltro(e.target.value)}
              >
                <option value="">Todos</option>
                {AMBITOS_OPERACION.map((op) => (
                  <option key={op.codigo} value={op.codigo}>
                    {op.etiqueta}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo nombre="Estado">
              <select
                className={campo}
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Activas</option>
                <option value="false">Inactivas</option>
              </select>
            </Campo>
            <Link className={primario} to="/panel/cooperativas/nueva">
              <Icono nombre="mas" />
              Nueva cooperativa
            </Link>
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-blue-100 lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gradient-to-r from-sky-50 to-blue-100">
                <tr>
                  {[
                    "Cooperativa",
                    "Ámbito / Provincia",
                    "Responsable",
                    "Buses",
                    "Estado",
                    "Acciones",
                  ].map((n) => (
                    <th key={n} className="p-3">
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const amb = c.ambito_operacion ?? "INTERPROVINCIAL";
                  const badgeClase =
                    amb === "URBANA"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : amb === "RURAL"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-blue-50 text-blue-800 border-blue-200";
                  return (
                    <tr key={c.id} className="border-b border-blue-100">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="block w-20 shrink-0 [&_img]:h-12 [&_span]:h-12 [&_span]:w-20">
                            <LogoCooperativa
                              nombre={c.nombre}
                              logoArchivoId={c.logo_archivo_id}
                            />
                          </span>
                          <b>{c.nombre}</b>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClase}`}>
                          {etiquetaAmbitoOperacion(c.ambito_operacion, c.provincia)}
                        </span>
                      </td>
                      <td className="p-3">
                        {filas.find((v) => v.id === c.id)?.responsable ??
                          "Sin responsable asignado"}
                      </td>
                      <td className="p-3">
                        {filas.find((v) => v.id === c.id)?.buses ?? 0}
                      </td>
                      <td className="p-3">{estadoControl(c)}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={boton}
                            onClick={() => setDetalle(c)}
                          >
                            <Icono nombre="documento" className="size-4" />
                            Ver detalle
                          </button>
                          <Link
                            className={boton}
                            to={"/panel/accesos?cooperativa=" + c.id}
                          >
                            <Icono nombre="editar" className="size-4" />
                            Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">
            {lista.map((c) => (
              <article key={c.id} className="rounded-lg border border-blue-100 p-3">
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 [&_img]:h-10 [&_span]:h-10 [&_span]:w-16">
                    <LogoCooperativa
                      nombre={c.nombre}
                      logoArchivoId={c.logo_archivo_id}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="block">{c.nombre}</b>
                    <small className="block text-xs text-blue-700">
                      {etiquetaAmbitoOperacion(c.ambito_operacion, c.provincia)}
                    </small>
                    <small>
                      {filas.find((v) => v.id === c.id)?.responsable ??
                        "Sin responsable asignado"}{" "}
                      · {filas.find((v) => v.id === c.id)?.buses ?? 0} buses
                    </small>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {estadoControl(c)}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={boton}
                      onClick={() => setDetalle(c)}
                    >
                      <Icono nombre="documento" className="size-4" />
                      Ver detalle
                    </button>
                    <Link
                      className={boton}
                      to={"/panel/accesos?cooperativa=" + c.id}
                    >
                      <Icono nombre="editar" className="size-4" />
                      Editar
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!lista.length && (
            <Aviso>No hay cooperativas que coincidan con los filtros.</Aviso>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Aviso>
              Asigna un responsable a cada cooperativa. Los cambios de estado
              conservan su historial.
            </Aviso>
            <span className="text-sm">
              {lista.length ? "1" : "0"}–{lista.length} de{" "}
              {d.cooperativas.length}
            </span>
          </div>
        </>
      )}

      {detalle && (
        <Dialogo
          titulo="Detalle de cooperativa"
          cerrar={() => setDetalle(null)}
        >
          <dl className="space-y-3 text-sm text-blue-950">
            <div>
              <dt className="font-bold">Cooperativa</dt>
              <dd>{detalle.nombre}</dd>
            </div>
            <div>
              <dt className="font-bold">Ámbito de operación</dt>
              <dd>{etiquetaAmbitoOperacion(detalle.ambito_operacion, detalle.provincia)}</dd>
            </div>
            {detalle.provincia && (
              <div>
                <dt className="font-bold">Provincia</dt>
                <dd>{detalle.provincia}</dd>
              </div>
            )}
            <div>
              <dt className="font-bold">Razón social</dt>
              <dd>{detalle.razon_social}</dd>
            </div>
            <div>
              <dt className="font-bold">RUC</dt>
              <dd>{detalle.ruc}</dd>
            </div>
            <div>
              <dt className="font-bold">Responsable</dt>
              <dd>{infoDetalle?.responsable ?? "Sin responsable asignado"}</dd>
            </div>
            <div>
              <dt className="font-bold">Buses registrados</dt>
              <dd>{infoDetalle?.buses ?? 0}</dd>
            </div>
            <div>
              <dt className="font-bold">Correo de soporte</dt>
              <dd>{detalle.soporte_email || "No registrado"}</dd>
            </div>
            <div>
              <dt className="font-bold">Teléfono</dt>
              <dd>{detalle.telefono || "No registrado"}</dd>
            </div>
            <div>
              <dt className="font-bold">Estado</dt>
              <dd>{detalle.activa ? "Activa" : "Inactiva"}</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-blue-100 pt-4">
            <Link
              className={boton}
              to={`/panel/accesos?cooperativa=${detalle.id}`}
            >
              Editar accesos y responsables →
            </Link>
          </div>
        </Dialogo>
      )}

      {confirmacion && (
        <Confirmacion
          titulo={
            confirmacion.activa
              ? "Desactivar cooperativa"
              : "Activar cooperativa"
          }
          accion={confirmacion.activa ? "Sí, desactivar" : "Sí, activar"}
          ocupado={ocupado}
          cerrar={() => setConfirmacion(null)}
          confirmar={() => void cambiarEstado()}
        >
          <p>
            ¿Estás seguro de que deseas{" "}
            <strong>
              {confirmacion.activa ? "desactivar" : "activar"}
            </strong>{" "}
            la cooperativa <strong>{confirmacion.nombre}</strong>?
          </p>
          <p className="mt-2 text-slate-600">
            {confirmacion.activa
              ? "Se deshabilitará su operación. Sus datos y su historial se conservarán."
              : "La cooperativa volverá a estar habilitada para operar."}
          </p>
        </Confirmacion>
      )}
    </section>
  );
}
