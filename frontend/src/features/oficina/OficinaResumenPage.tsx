import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchOficinaResumenData } from './OficinaResumenPage.service';
import { OficinaResumenResponse } from './OficinaResumenPage.types';

export const OficinaResumenPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<OficinaResumenResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const res = await fetchOficinaResumenData();
        setData(res);
      } catch (err) {
        console.error('Error al cargar resumen de oficina:', err);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <p className="animate-pulse text-lg font-medium">Cargando panel del oficinista...</p>
      </div>
    );
  }

  const { kpis, comprobantesPendientes, proximasSalidas } = data;

  // Manejadores de navegación basados en el flujo de la Vista 12
  const handleRevisarComprobantes = () => {
    navigate('/vista-previa/oficinista/comprobantes');
  };

  const handleNuevaVenta = () => {
    navigate('/vista-previa/oficinista/ventas');
  };

  const handleVerComprobante = (_reserva: string) => {
    navigate('/vista-previa/oficinista/comprobantes');
  };

  const handleVerDetallesSalida = (_ruta: string) => {
    navigate('/vista-previa/oficinista/reservas');
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg text-xl">💵</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Ventas de hoy</p>
            <p className="text-2xl font-bold text-gray-800">${kpis.ventasHoy.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg text-xl">💺</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Asientos vendidos</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.asientosVendidos}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg text-xl">📄</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Comprobantes pendientes</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.comprobantesPendientes}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg text-xl">🎫</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Reservas confirmadas</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.reservasConfirmadas}</p>
          </div>
        </div>
      </div>

      {/* Alerta de Comprobantes Pendientes */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl flex justify-between items-center flex-wrap gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-amber-600 text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-sm">{kpis.comprobantesPendientes} comprobantes esperan revisión.</p>
            <p className="text-xs text-amber-700">Revisa y valida los comprobantes pendientes de la oficina.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRevisarComprobantes}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow"
        >
          Revisar comprobantes
        </button>
      </div>

      {/* Tabla de Comprobantes Pendientes */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
            📄 Comprobantes pendientes
          </h2>
          <button
            type="button"
            onClick={handleNuevaVenta}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow flex items-center gap-2 transition"
          >
            <span>+</span> Nueva venta en oficina
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Reserva</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Viaje</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comprobantesPendientes.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition">
                  <td className="py-3 px-4 font-semibold text-gray-800">{item.reserva}</td>
                  <td className="py-3 px-4 text-gray-600">{item.cliente}</td>
                  <td className="py-3 px-4 text-gray-600">{item.viaje}</td>
                  <td className="py-3 px-4 font-bold text-gray-800">${item.monto.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      item.estado === 'En verificación' ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.estado === 'En verificación' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}></span>
                      {item.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleVerComprobante(item.reserva)}
                      className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-medium transition inline-flex items-center gap-1"
                    >
                      📄 Ver comprobante
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de Próximas Salidas */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
          🚌 Próximas salidas
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Ruta</th>
                <th className="py-3 px-4">Hora</th>
                <th className="py-3 px-4">Unidad</th>
                <th className="py-3 px-4">Asientos vendidos</th>
                <th className="py-3 px-4">Capacidad</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {proximasSalidas.map((salida) => (
                <tr key={salida.id} className="hover:bg-gray-50/50 transition">
                  <td className="py-3 px-4 font-semibold text-gray-800">{salida.ruta}</td>
                  <td className="py-3 px-4 text-gray-600">{salida.hora}</td>
                  <td className="py-3 px-4 text-gray-600">{salida.unidad}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">{salida.asientosVendidos}</td>
                  <td className="py-3 px-4 text-gray-600">{salida.capacidad}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleVerDetallesSalida(salida.ruta)}
                      className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-medium transition inline-flex items-center gap-1"
                    >
                      Ver detalles
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

export default OficinaResumenPage;