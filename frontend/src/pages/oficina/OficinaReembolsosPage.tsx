import React, { useEffect, useState, useMemo } from 'react';
import { fetchReembolsosData, procesarDecisionReembolso } from '../../features/oficina/OficinaReembolsosPage.service';
import { ReembolsosResumenData, SolicitudReembolso } from '../../features/oficina/OficinaReembolsosPage.types';

export const OficinaReembolsosPage: React.FC = () => {
  const [data, setData] = useState<ReembolsosResumenData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros de búsqueda y estados
  const [busqueda, setBusqueda] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('Todas');
  const [filtroPorcentaje, setFiltroPorcentaje] = useState<string>('Todos');
  const [filtroFecha, setFiltroFecha] = useState<string>('Todas');

  // Solicitud seleccionada para el panel de detalles (por defecto la primera)
  const [seleccionada, setSeleccionada] = useState<SolicitudReembolso | null>(null);
  const [notaEditando, setNotaEditando] = useState<string>('');
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [mostrarModalMotivo, setMostrarModalMotivo] = useState<boolean>(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const res = await fetchReembolsosData();
      setData(res);
      if (res.lista.length > 0) {
        setSeleccionada(res.lista[0]);
        setNotaEditando(res.lista[0].notaInterna || '');
      }
    } catch (err) {
      console.error('Error al cargar solicitudes de reembolso:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Filtrado interactivo avanzado
  const listaFiltrada = useMemo(() => {
    if (!data) return [];
    return data.lista.filter((item) => {
      const matchTexto = 
        item.reservaId.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.cliente.toLowerCase().includes(busqueda.toLowerCase());
      
      const matchEstado = filtroEstado === 'Todas' || item.estado === filtroEstado;
      const matchPorcentaje = filtroPorcentaje === 'Todos' || `${item.porcentajeDevolucion}%` === filtroPorcentaje;
      
      return matchTexto && matchEstado && matchPorcentaje;
    });
  }, [data, busqueda, filtroEstado, filtroPorcentaje]);

  const handleSeleccionar = (item: SolicitudReembolso) => {
    setSeleccionada(item);
    setNotaEditando(item.notaInterna || '');
  };

  const handleAprobar = async () => {
    if (!seleccionada) return;
    try {
      await procesarDecisionReembolso(seleccionada.id, 'aprobar');
      alert(`Reembolso para la reserva ${seleccionada.reservaId} aprobado correctamente.`);
      await cargarDatos();
    } catch (err) {
      alert('Error al aprobar el reembolso.');
    }
  };

  const handleRechazarAccion = async () => {
    if (!seleccionada) return;
    if (!motivoRechazo.trim()) {
      alert('Debe ingresar un motivo para rechazar la solicitud.');
      return;
    }
    try {
      await procesarDecisionReembolso(seleccionada.id, 'rechazar', motivoRechazo);
      alert(`Reembolso rechazado. Motivo registrado.`);
      setMostrarModalMotivo(false);
      setMotivoRechazo('');
      await cargarDatos();
    } catch (err) {
      alert('Error al rechazar el reembolso.');
    }
  };

  const handleRegistrarAbono = () => {
    if (!seleccionada) return;
    alert(`[Simulación] Abono/respaldo de devolución registrado con éxito por $${seleccionada.montoDevolver.toFixed(2)} para ${seleccionada.cliente}.`);
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <p className="animate-pulse text-lg font-medium">Cargando solicitudes de reembolso...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Alerta de Propuesta en Revisión */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl flex items-center gap-3 shadow-sm">
        <span className="text-amber-600 text-2xl">⚠️</span>
        <div>
          <p className="font-bold text-sm">Propuesta en revisión</p>
          <p className="text-xs text-amber-700">Algunas solicitudes requieren revisión manual antes de procesar la devolución[cite: 35, 36].</p>
        </div>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg text-xl">📄</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Solicitudes de hoy[cite: 35]</p>
            <p className="text-2xl font-bold text-gray-800">{data?.solicitudesHoy || 0}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg text-xl">⏳</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Solicitada[cite: 35]</p>
            <p className="text-2xl font-bold text-gray-800">{data?.solicitada || 0}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg text-xl">✅</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Completadas[cite: 35]</p>
            <p className="text-2xl font-bold text-gray-800">{data?.completadas || 0}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg text-xl">❌</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Rechazadas[cite: 35]</p>
            <p className="text-2xl font-bold text-gray-800">{data?.rechazadas || 0}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Interactivos */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">Buscar por reserva o cliente</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Ej. GC-4587, Ángel..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">Fecha de viaje</label>
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="Todas">Todas las fechas</option>
              <option value="hoy">Hoy</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="Todas">Todos los estados</option>
              <option value="Solicitado">Solicitado</option>
              <option value="Completado">Completado</option>
              <option value="Rechazado">Rechazado</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">Porcentaje de devolución</label>
            <select
              value={filtroPorcentaje}
              onChange={(e) => setFiltroPorcentaje(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white"
            >
              <option value="Todos">Todos</option>
              <option value="50%">50%</option>
              <option value="100%">100%</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Principal: Tabla izquierda y Panel de Detalles derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Tabla de Solicitudes (2 span) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
              📋 Solicitudes de reembolso[cite: 35]
            </h2>
            <button
              type="button"
              onClick={() => alert('Abriendo formulario de nueva solicitud de reembolso manual...')}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow"
            >
              + Nueva solicitud de reembolso[cite: 35]
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Reserva[cite: 35]</th>
                  <th className="py-3 px-3">Cliente[cite: 35]</th>
                  <th className="py-3 px-3">Pagado[cite: 35]</th>
                  <th className="py-3 px-3">Porcentaje[cite: 35]</th>
                  <th className="py-3 px-3">A devolver[cite: 35]</th>
                  <th className="py-3 px-3">Estado[cite: 35]</th>
                  <th className="py-3 px-3 text-center">Acción[cite: 35]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listaFiltrada.length > 0 ? (
                  listaFiltrada.map((item) => {
                    const esSeleccionado = seleccionada?.id === item.id;
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => handleSeleccionar(item)}
                        className={`cursor-pointer transition ${esSeleccionado ? 'bg-blue-50/70 font-medium' : 'hover:bg-gray-50'}`}
                      >
                        <td className="py-3 px-3 font-semibold text-gray-800">{item.reservaId}</td>
                        <td className="py-3 px-3 text-gray-700">{item.cliente}</td>
                        <td className="py-3 px-3 font-bold">${item.montoPagado.toFixed(2)}</td>
                        <td className="py-3 px-3">{item.porcentajeDevolucion}%</td>
                        <td className="py-3 px-3 font-bold text-emerald-600">${item.montoDevolver.toFixed(2)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            item.estado === 'Completado' ? 'bg-emerald-50 text-emerald-700' :
                            item.estado === 'Solicitado' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {item.estado}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSeleccionar(item);
                            }}
                            className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded text-xs font-medium"
                          >
                            {item.estado === 'Solicitado' ? 'Revisar' : item.estado === 'Completado' ? 'Ver respaldo' : 'Ver motivo'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">
                      No se encontraron solicitudes con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Historial de la Solicitud Seleccionada */}
          {seleccionada && seleccionada.historial && seleccionada.historial.length > 0 && (
            <div className="pt-4 border-t space-y-2">
              <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                🕒 Historial de la solicitud[cite: 35]
              </h3>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-xs">
                {seleccionada.historial.map((h) => (
                  <div key={h.id} className="flex justify-between items-start border-b pb-1 last:border-none">
                    <div>
                      <p className="font-semibold text-gray-800">{h.accion}</p>
                      <p className="text-gray-500">{h.descripcion}</p>
                    </div>
                    <span className="text-[10px] text-gray-400">{h.fechaHora}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha: Detalle de Solicitud y Resolución */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 flex justify-between items-center">
            <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              📑 Detalle de solicitud[cite: 35, 36]
            </h2>
            <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
              Ref: {seleccionada?.reservaId || 'N/A'}
            </span>
          </div>

          {seleccionada ? (
            <div className="space-y-4 text-xs text-gray-600">
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Reserva:</span>
                  <span className="font-bold text-indigo-950">{seleccionada.reservaId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Cliente:</span>
                  <span className="font-medium text-gray-800">{seleccionada.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Anticipación:</span>
                  <span className="text-amber-700 font-medium">{seleccionada.anticipacion}[cite: 35, 36]</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Versión de política:</span>
                  <span className="font-mono text-gray-800">{seleccionada.versionPolitica}[cite: 35, 36]</span>
                </div>
              </div>

              <div className="space-y-1.5 border-t pt-3">
                <div className="flex justify-between">
                  <span>Monto pagado:</span>
                  <span className="font-bold text-gray-800">${seleccionada.montoPagado.toFixed(2)}[cite: 35, 36]</span>
                </div>
                <div className="flex justify-between">
                  <span>Porcentaje de devolución:</span>
                  <span className="font-bold text-blue-600">{seleccionada.porcentajeDevolucion}%[cite: 35, 36]</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-indigo-950 pt-2 border-t">
                  <span>Monto a devolver:</span>
                  <span className="text-emerald-600">${seleccionada.montoDevolver.toFixed(2)}[cite: 35, 36]</span>
                </div>
              </div>

              {/* Nota Interna */}
              <div className="space-y-1 pt-2">
                <label className="font-semibold text-gray-500">Nota interna[cite: 35, 36]:</label>
                <input
                  type="text"
                  value={notaEditando}
                  onChange={(e) => setNotaEditando(e.target.value)}
                  placeholder="Escribe una nota interna..."
                  className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                />
              </div>

              {/* Botones de Resolución Interactivos */}
              {seleccionada.estado === 'Solicitado' && (
                <div className="space-y-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={handleAprobar}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-bold transition shadow cursor-pointer text-xs"
                  >
                    ✓ Aprobar devolución[cite: 35, 36]
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarModalMotivo(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold transition shadow cursor-pointer text-xs"
                  >
                    ✕ Rechazar solicitud[cite: 35, 36]
                  </button>
                </div>
              )}

              {seleccionada.estado === 'Completado' && (
                <div className="pt-3 border-t space-y-2">
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-emerald-900 text-[11px]">
                    <p className="font-semibold">✓ Reembolso procesado y abonado.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegistrarAbono}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition shadow text-xs"
                  >
                    Ver comprobante de abono[cite: 35, 36]
                  </button>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-[11px] text-blue-900 space-y-1">
                <p className="font-semibold">ℹ️ Nota operativa:</p>
                <p>Aprobado no significa abonado. Completar requiere respaldo de devolución[cite: 35, 36].</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-6 text-xs">Selecciona una solicitud para ver sus detalles.</p>
          )}
        </div>

      </div>

      {/* Modal para ingresar motivo de rechazo */}
      {mostrarModalMotivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-indigo-950">Motivo de rechazo del reembolso</h3>
            <p className="text-xs text-gray-500">Especifica por qué se rechaza la solicitud de devolución para la reserva <strong className="text-gray-800">{seleccionada?.reservaId}</strong>.</p>
            
            <textarea
              rows={3}
              placeholder="Escribe el motivo..."
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              className="w-full p-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setMostrarModalMotivo(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRechazarAccion}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OficinaReembolsosPage;