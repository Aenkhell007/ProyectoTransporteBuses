import React, { useEffect, useState } from 'react';
import { fetchAdminResumenData } from './AdminResumenPage.service';
import { AdminResumenResponse } from './AdminResumenPage.types';

export const AdminResumenPage: React.FC = () => {
  const [data, setData] = useState<AdminResumenResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchAdminResumenData();
        setData(res);
      } catch (err: any) {
        // Si la API no existe aún (404) o falla la conexión, 
        // asignamos un objeto vacío real en lugar de lanzar la pantalla de error
        setData({
          kpis: {
            cooperativasActivas: 0,
            usuariosRegistrados: 0,
            oficinistas: 0,
            busesRegistrados: 0,
          },
          tendenciaUsuarios: [],
          cooperativas: [],
          usuariosPorRol: [],
        });
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <p className="animate-pulse text-lg font-medium">Cargando panel de administración...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300" role="alert">
        <span className="font-bold">Error:</span> {error}
      </div>
    );
  }

  // Datos reales o valores por defecto en cero si la API no devuelve contenido aún
  const kpis = data?.kpis || {
    cooperativasActivas: 0,
    usuariosRegistrados: 0,
    oficinistas: 0,
    busesRegistrados: 0,
  };

  const cooperativas = data?.cooperativas || [];
  const usuariosPorRol = data?.usuariosPorRol || [];

  return (
    <div className="space-y-6">
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
            <p className="z-2xl font-bold text-gray-800">{kpis.busesRegistrados}</p>
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
        <button className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow">
          👥 Ver cooperativas
        </button>
      </div>

      {/* Sección Gráficos y Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tendencia de Usuarios */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
            📊 Usuarios registrados · últimos 7 días
          </h2>
          <div className="h-44 bg-emerald-50/50 rounded-lg border border-dashed border-emerald-200 flex items-center justify-center text-xs text-emerald-700 font-medium">
            [ Gráfico de Tendencia de Registros ]
          </div>
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
            {usuariosPorRol.length > 0 ? (
              usuariosPorRol.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium w-24">{item.rol}</span>
                  <span className="font-bold text-gray-800 w-8">{item.cantidad}</span>
                  <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden ml-2">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (item.cantidad / (kpis.usuariosRegistrados || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No hay registros de roles disponibles.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Cooperativas Registradas */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
            👥 Cooperativas registradas
          </h2>
          <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2">
            <span>+</span> Nueva cooperativa
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
              {cooperativas.length > 0 ? (
                cooperativas.map((coop) => (
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
                      <button className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-medium transition">
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400 text-xs italic">
                    No hay cooperativas registradas actualmente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 italic">ℹ️ Asigna un usuario responsable a cada cooperativa.</p>
      </div>
    </div>
  );
};

export default AdminResumenPage;