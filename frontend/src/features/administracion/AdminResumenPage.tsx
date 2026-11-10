import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchAdminResumenData } from './AdminResumenPage.service';
import { AdminResumenResponse } from './AdminResumenPage.types';

export const AdminResumenPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminResumenResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const res = await fetchAdminResumenData();
        setData(res);
      } catch (err) {
        console.error('Error al cargar datos:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <p className="animate-pulse text-lg font-medium">Cargando panel de administración...</p>
      </div>
    );
  }

  const { kpis, cooperativas, usuariosPorRol, tendenciaUsuarios } = data;

  // Manejadores para los botones
  const handleVerCooperativas = () => {
    // Redirige a la subruta dentro del layout del admin
    navigate('/vista-previa/panel/cooperativas');
  };

  const handleNuevaCooperativa = () => {
    alert('Acción "Nueva cooperativa": abre el formulario de registro.');
  };

  const handleVerDetalle = (nombre: string) => {
    alert(`Ver detalle de la cooperativa: ${nombre}`);
  };

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
          onClick={handleVerCooperativas}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow"
        >
          👥 Ver cooperativas
        </button>
      </div>

      {/* Sección Gráficos y Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico SVG */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
            📊 Usuarios registrados · últimos 7 días
          </h2>
          <div className="h-52 flex flex-col justify-end pt-2 relative">
            <svg className="w-full h-36 overflow-visible z-10" viewBox="0 0 500 120" preserveAspectRatio="none">
              <polygon
                fill="#d1fae5"
                fillOpacity="0.6"
                points={`0,120 ${tendenciaUsuarios
                  .map((item: any, index: number) => {
                    const x = (index / (tendenciaUsuarios.length - 1 || 1)) * 480 + 10;
                    const y = 110 - (item.cantidad / 50) * 100;
                    return `${x},${y}`;
                  })
                  .join(' ')} 480,120`}
              />
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                points={tendenciaUsuarios
                  .map((item: any, index: number) => {
                    const x = (index / (tendenciaUsuarios.length - 1 || 1)) * 480 + 10;
                    const y = 110 - (item.cantidad / 50) * 100;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
              {tendenciaUsuarios.map((item: any, index: number) => {
                const x = (index / (tendenciaUsuarios.length - 1 || 1)) * 480 + 10;
                const y = 110 - (item.cantidad / 50) * 100;
                return (
                  <g key={index}>
                    <circle cx={x} cy={y} r="5" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                    <text x={x} y="132" fontSize="11" textAnchor="middle" fill="#6b7280">
                      {item.fecha}
                    </text>
                  </g>
                );
              })}
            </svg>
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
            {usuariosPorRol.map((item: any, idx: number) => (
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
            onClick={handleNuevaCooperativa}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2 transition"
          >
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
              {cooperativas.map((coop: any) => (
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
                      onClick={() => handleVerDetalle(coop.nombre)}
                      className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-medium transition"
                    >
                      Ver detalle
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
};

export default AdminResumenPage;