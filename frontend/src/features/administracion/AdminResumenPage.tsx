import { useEffect, useState } from "react";
import { resumenDemo } from "./AdminResumenPage.demo";
import { fetchAdminResumenData, mensajeErrorResumen } from "./AdminResumenPage.service";
import type { AdminResumenResponse } from "./AdminResumenPage.types";

type EstadoResumen =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "listo"; datos: AdminResumenResponse };

export function AdminResumenPage() {
  const [estado, setEstado] = useState<EstadoResumen>({ tipo: "cargando" });
  const [intento, setIntento] = useState(0);
  const [demostracion, setDemostracion] = useState(false);

  useEffect(() => {
    const consulta = new AbortController();
    fetchAdminResumenData(undefined, undefined, consulta.signal)
      .then((datos) => {
        if (!consulta.signal.aborted) setEstado({ tipo: "listo", datos });
      })
      .catch((error: unknown) => {
        if (!consulta.signal.aborted) {
          setEstado({ tipo: "error", mensaje: mensajeErrorResumen(error) });
        }
      });
    return () => consulta.abort();
  }, [intento]);

  if (!demostracion && estado.tipo === "cargando") {
    return <p role="status" className="p-4">Cargando panel de administración…</p>;
  }

  if (!demostracion && estado.tipo === "error") {
    return (
      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <p role="alert">{estado.mensaje}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md border border-blue-700 px-3 py-2 text-blue-900"
            onClick={() => {
              setEstado({ tipo: "cargando" });
              setIntento((anterior) => anterior + 1);
            }}
          >
            Reintentar
          </button>
          {import.meta.env.DEV && (
            <button
              type="button"
              className="rounded-md border border-blue-700 px-3 py-2 text-blue-900"
              onClick={() => setDemostracion(true)}
            >
              Ver datos de ejemplo
            </button>
          )}
        </div>
      </div>
    );
  }

  const datos = demostracion ? resumenDemo : estado.tipo === "listo" ? estado.datos : null;
  if (!datos) return null;

  const { kpis, cooperativas, usuariosPorRol, tendenciaUsuarios } = datos;
  const maxRegistros = Math.max(1, ...tendenciaUsuarios.map(({ registros }) => registros));
  const puntos = tendenciaUsuarios.map(({ fecha, registros }, indice) => ({
    fecha,
    registros,
    x: tendenciaUsuarios.length === 1 ? 250 : 20 + indice * 460 / (tendenciaUsuarios.length - 1),
    y: 110 - registros / maxRegistros * 90,
  }));
  const linea = puntos.map(({ x, y }) => [x, y].join(",")).join(" ");
  const area = puntos.length > 1 ? [puntos[0].x + ",110", linea, puntos.at(-1)!.x + ",110"].join(" ") : "";

  return (
    <div className="space-y-6">
      {demostracion && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-4 text-amber-900">
          <p role="status">Vista previa con datos de ejemplo.</p>
          <button type="button" className="underline" onClick={() => setDemostracion(false)}>
            Volver al estado de la consulta
          </button>
        </div>
      )}
      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg text-xl">👥</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Cooperativas activas</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.cooperativasActivas}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg text-xl">👤</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Usuarios registrados</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.usuariosRegistrados}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg text-xl">👩‍💻</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Oficinistas</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.oficinistas}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-indigo-600 rounded-lg text-xl">🚌</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Buses registrados</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.busesRegistrados}</p>
          </div>
        </div>
      </div>

      {/* Banner Informativo Azul */}
      <div className="bg-blue-600 text-white p-4 rounded-xl flex justify-between items-center flex-wrap gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <span className="bg-white text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">i</span>
          <div>
            <p className="font-semibold text-sm">Cada cooperativa gestiona sus buses y frecuencias.</p>
            <p className="text-xs text-blue-100">Los oficinistas validan los comprobantes de pago.</p>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          👥 Ver cooperativas (pendiente)
        </button>
      </div>

      {/* Sección Gráficos y Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico SVG */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
            📊 Usuarios registrados · últimos 7 días
          </h2>
          {puntos.length === 0 ? (
            <p className="text-sm text-slate-600">No hay registros en este período.</p>
          ) : (
            <svg className="h-44 w-full" viewBox="0 0 500 140" role="img">
              <title>{puntos.map(({ fecha, registros }) => fecha + ": " + registros).join("; ")}</title>
              {area && <polygon fill="#d1fae5" points={area} />}
              <polyline fill="none" stroke="#10b981" strokeWidth="3" points={linea} />
              {puntos.map(({ fecha, x, y }) => (
                <g key={fecha}>
                  <circle cx={x} cy={y} r="5" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                  <text x={x} y="132" fontSize="11" textAnchor="middle" fill="#6b7280">{fecha}</text>
                </g>
              ))}
            </svg>
          )}
        </div>

        {/* Desglose por Rol */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
              👤 Usuarios por rol
            </h2>
            <span className="text-xs text-gray-400 font-medium">Total: {kpis.usuariosRegistrados}</span>
          </div>
          <div className="space-y-3">
            {usuariosPorRol.length === 0 && (
              <p className="text-sm text-slate-600">No hay registros de roles.</p>
            )}
            {usuariosPorRol.map((item) => (
              <div key={item.rol} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium w-24">{item.rol}</span>
                <span className="font-bold text-gray-800 w-8">{item.cantidad}</span>
                <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden ml-2">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, (item.cantidad / (kpis.usuariosRegistrados || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Cooperativas Registradas */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
            👥 Cooperativas registradas
          </h2>
          <button
            type="button"
            disabled
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>+</span> Nueva cooperativa (pendiente)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Cooperativa</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4">Buses</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cooperativas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3">No hay cooperativas registradas.</td>
                </tr>
              )}
              {cooperativas.map((coop) => (
                <tr key={coop.id} className="hover:bg-gray-50/50 transition">
                  <td className="py-3 px-4 font-semibold text-gray-800 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    {coop.nombre}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{coop.responsable}</td>
                  <td className="py-3 px-4 font-medium text-gray-700">{coop.buses}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {coop.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      disabled
                      className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Ver detalle (pendiente)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminResumenPage;