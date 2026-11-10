import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchOficinaReservasData } from './OficinaReservasPage.service';
import { OficinaReservasResponse, ReservaOficinaItem } from './OficinaReservasPage.types';

export const OficinaReservasPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<OficinaReservasResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [busqueda, setBusqueda] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('Todos');
  const [fechaFiltro, setFechaFiltro] = useState<string>('');
  
  // Estado para el Modal de Detalle de Reserva
  const [reservaSeleccionada, setReservaSeleccionada] = useState<ReservaOficinaItem | null>(null);

  const cargarReservas = async (filtro?: string, q?: string, fecha?: string) => {
    try {
      setLoading(true);
      const res = await fetchOficinaReservasData(filtro, q, fecha);
      setData(res);
    } catch (err) {
      console.error('Error al cargar reservas de oficina:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReservas(estadoFiltro, busqueda, fechaFiltro);
  }, [estadoFiltro, busqueda, fechaFiltro]);

  const handleNuevaVenta = () => {
    navigate('/vista-previa/oficinista/ventas');
  };

  const handleAccionReserva = (item: ReservaOficinaItem) => {
    if (item.accionTexto.toLowerCase().includes('comprobante')) {
      navigate('/vista-previa/oficinista/comprobantes');
    } else {
      // Abre el modal detallado de la reserva
      setReservaSeleccionada(item);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <p className="animate-pulse text-lg font-medium">Cargando módulo de reservas...</p>
      </div>
    );
  }

  const kpis = data?.kpis || { pendientePago: 0, enRevision: 0, confirmada: 0, vencida: 0 };
  const reservas = data?.reservas || [];

  return (
    <div className="space-y-6">
      {/* Tarjetas KPI de Estados de Reserva */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg text-xl">⏳</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Pendiente de pago</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.pendientePago}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg text-xl">🔍</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">En revisión</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.enRevision}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg text-xl">✅</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Confirmada</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.confirmada}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg text-xl">❌</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Vencida</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.vencida}</p>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros con Calendario Interactivo */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-gray-500">Buscar por código o cliente</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Ej. GC-20261010-4587, Ángel..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">Fecha de viaje</label>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">Estado de reserva</label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos</option>
              <option value="Confirmada">Confirmada</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Vencida">Vencida</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla Principal de Reservas */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
            🎫 Reservas de la oficina
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
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Ruta</th>
                <th className="py-3 px-4">Fecha de viaje</th>
                <th className="py-3 px-4">Asientos</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4">Estado reserva</th>
                <th className="py-3 px-4">Estado pago</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservas.length > 0 ? (
                reservas.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4 font-semibold text-gray-800">{item.codigo}</td>
                    <td className="py-3 px-4 text-gray-600">{item.cliente}</td>
                    <td className="py-3 px-4 text-gray-600">{item.ruta}</td>
                    <td className="py-3 px-4 text-gray-600">{item.fechaViaje}</td>
                    <td className="py-3 px-4 text-gray-600">{item.asientos}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">${item.monto.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          item.estadoReserva === 'Confirmada'
                            ? 'text-emerald-700 bg-emerald-50'
                            : item.estadoReserva === 'Pendiente'
                            ? 'text-amber-700 bg-amber-50'
                            : 'text-red-700 bg-red-50'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.estadoReserva === 'Confirmada'
                              ? 'bg-emerald-500'
                              : item.estadoReserva === 'Pendiente'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                        ></span>
                        {item.estadoReserva}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          item.estadoPago === 'Pagado'
                            ? 'text-emerald-700 bg-emerald-50'
                            : item.estadoPago === 'En revisión'
                            ? 'text-blue-700 bg-blue-50'
                            : item.estadoPago === 'Pendiente'
                            ? 'text-amber-700 bg-amber-50'
                            : 'text-red-700 bg-red-50'
                        }`}
                      >
                        {item.estadoPago}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleAccionReserva(item)}
                        className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-medium transition inline-flex items-center gap-1"
                      >
                        {item.accionTexto}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-400">
                    No se encontraron reservas con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Reserva */}
      {reservaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-indigo-950">Detalle de Reserva</h3>
              <button
                type="button"
                onClick={() => setReservaSeleccionada(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex justify-between bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-500">Código de reserva:</span>
                <span className="font-bold text-indigo-900">{reservaSeleccionada.codigo}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Cliente:</span>
                <span className="text-gray-800">{reservaSeleccionada.cliente}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Ruta del viaje:</span>
                <span className="text-gray-800">{reservaSeleccionada.ruta}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Fecha y hora:</span>
                <span className="text-gray-800">{reservaSeleccionada.fechaViaje}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Asientos asignados:</span>
                <span className="text-gray-800">{reservaSeleccionada.asientos}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Monto total:</span>
                <span className="font-bold text-emerald-600">${reservaSeleccionada.monto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Estado de reserva:</span>
                <span className="font-medium text-blue-600">{reservaSeleccionada.estadoReserva}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Estado de pago:</span>
                <span className="font-medium text-purple-600">{reservaSeleccionada.estadoPago}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setReservaSeleccionada(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition shadow"
              >
                Cerrar detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OficinaReservasPage;