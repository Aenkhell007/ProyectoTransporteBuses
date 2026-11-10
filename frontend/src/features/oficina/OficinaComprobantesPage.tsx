import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchOficinaComprobantesData } from './OficinaComprobantesPage.service';
import { OficinaComprobantesResponse, ComprobanteItem } from './OficinaComprobantesPage.types';

export const OficinaComprobantesPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<OficinaComprobantesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filtros
  const [tabEstado, setTabEstado] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [bancoFiltro, setBancoFiltro] = useState<string>('Todos');
  const [desdeFiltro, setDesdeFiltro] = useState<string>('2026-10-15');
  const [hastaFiltro, setHastaFiltro] = useState<string>('2026-10-16');

  // Modal de detalle/revisión
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<ComprobanteItem | null>(null);

  const cargarComprobantes = async (estado?: string, q?: string, banco?: string, desde?: string, hasta?: string) => {
    try {
      setLoading(true);
      const res = await fetchOficinaComprobantesData(estado, q, banco, desde, hasta);
      setData(res);
    } catch (err) {
      console.error('Error al cargar comprobantes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarComprobantes(tabEstado, busqueda, bancoFiltro, desdeFiltro, hastaFiltro);
  }, [tabEstado, busqueda, bancoFiltro, desdeFiltro, hastaFiltro]);

  const handleAccion = (item: ComprobanteItem) => {
    setComprobanteSeleccionado(item);
  };

  // Función para aprobar o rechazar y guardar en sessionStorage
  const handleCambiarEstado = (nuevoEstado: 'Aprobados' | 'Rechazados') => {
    if (!comprobanteSeleccionado) return;

    // Obtener lista completa actual desde sessionStorage o usar la inicial
    const guardados = sessionStorage.getItem('gc_comprobantes_oficina');
    let listaActual = guardados ? JSON.parse(guardados) : [
      { id: 1, reserva: 'GC-20261010-4587', cliente: 'Ángel Matías Galarza', banco: 'Pichincha', recibido: '16 oct 2026 09:30', monto: 47.60, estado: 'Aprobados', reembolso: 'Sin solicitud', accionTexto: 'Ver detalle' },
      { id: 2, reserva: 'GC-20261012-4621', cliente: 'María López', banco: 'Guayaquil', recibido: '16 oct 2026 10:00', monto: 20.00, estado: 'En revisión', reembolso: 'No aplica', accionTexto: 'Revisar' },
      { id: 3, reserva: 'GC-20261012-4622', cliente: 'Juan Pérez', banco: 'Produbanco', recibido: '16 oct 2026 10:15', monto: 12.00, estado: 'Rechazados', reembolso: 'No aplica', accionTexto: 'Ver motivo' },
      { id: 4, reserva: 'GC-20261009-4400', cliente: 'Luis Vera', banco: 'Pichincha', recibido: '15 oct 2026 12:00', monto: 47.60, estado: 'Aprobados', reembolso: 'Completado $23.80', accionTexto: 'Ver detalle' },
    ];

    const actualizados = listaActual.map((c: any) => {
      if (c.id === comprobanteSeleccionado.id) {
        return {
          ...c,
          estado: nuevoEstado,
          accionTexto: nuevoEstado === 'Aprobados' ? 'Ver detalle' : 'Ver motivo',
        };
      }
      return c;
    });

    // Guardar en sessionStorage para persistencia ante recargas
    sessionStorage.setItem('gc_comprobantes_oficina', JSON.stringify(actualizados));

    setComprobanteSeleccionado(null);
    // Recargar vista con filtros actuales
    cargarComprobantes(tabEstado, busqueda, bancoFiltro, desdeFiltro, hastaFiltro);
  };

  const handleIrReembolsos = () => {
    navigate('/vista-previa/oficinista/reembolsos');
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <p className="animate-pulse text-lg font-medium">Cargando bandeja de comprobantes...</p>
      </div>
    );
  }

  const kpis = data?.kpis || { total: 0, enRevision: 0, aprobados: 0, rechazados: 0 };
  const comprobantes = data?.comprobantes || [];

  return (
    <div className="space-y-6">
      {/* Tarjetas KPI de Comprobantes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg text-xl">📄</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total comprobantes</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg text-xl">⏳</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">En revisión</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.enRevision}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg text-xl">✅</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Aprobados</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.aprobados}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg text-xl">❌</div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Rechazados</p>
            <p className="text-2xl font-bold text-gray-800">{kpis.rechazados}</p>
          </div>
        </div>
      </div>

      {/* Pestañas de Estado (Filtro Rápido) */}
      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-2">
        {[
          { label: 'Todos', value: 'Todos' },
          { label: 'En revisión', value: 'En revisión' },
          { label: 'Aprobados', value: 'Aprobados' },
          { label: 'Rechazados', value: 'Rechazados' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setTabEstado(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tabEstado === tab.value
                ? 'bg-red-500 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Barra de Filtros Avanzados */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-gray-500">Buscar por reserva, cliente o referencia</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Ej. GC-4587, Ángel..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">Banco</label>
            <select
              value={bancoFiltro}
              onChange={(e) => setBancoFiltro(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todos">Todos</option>
              <option value="Pichincha">Pichincha</option>
              <option value="Guayaquil">Guayaquil</option>
              <option value="Produbanco">Produbanco</option>
            </select>
          </div>

          <div className="space-y-1 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500">Desde</label>
              <input
                type="date"
                value={desdeFiltro}
                onChange={(e) => setDesdeFiltro(e.target.value)}
                className="w-full px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Hasta</label>
              <input
                type="date"
                value={hastaFiltro}
                onChange={(e) => setHastaFiltro(e.target.value)}
                className="w-full px-2 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Principal de Comprobantes */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-indigo-950 flex items-center gap-2">
          📄 Bandeja de comprobantes
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Reserva</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Banco</th>
                <th className="py-3 px-4">Recibido</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Reembolso</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {comprobantes.length > 0 ? (
                comprobantes.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4 font-semibold text-gray-800">{item.reserva}</td>
                    <td className="py-3 px-4 text-gray-600">{item.cliente}</td>
                    <td className="py-3 px-4 text-gray-600">{item.banco}</td>
                    <td className="py-3 px-4 text-gray-600">{item.recibido}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">${item.monto.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          item.estado === 'Aprobados'
                            ? 'text-emerald-700 bg-emerald-50'
                            : item.estado === 'En revisión'
                            ? 'text-amber-700 bg-amber-50'
                            : 'text-red-700 bg-red-50'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.estado === 'Aprobados'
                              ? 'bg-emerald-500'
                              : item.estado === 'En revisión'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                        ></span>
                        {item.estado === 'Aprobados' ? 'Aprobado' : item.estado === 'Rechazados' ? 'Rechazado' : item.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-gray-500">{item.reembolso}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleAccion(item)}
                        className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-medium transition inline-flex items-center gap-1"
                      >
                        {item.accionTexto}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-gray-400">
                    No se encontraron comprobantes con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aviso Inferior Oficial sobre Reembolsos */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl flex justify-between items-center flex-wrap gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-amber-600 text-2xl">💡</span>
          <div>
            <p className="font-semibold text-sm">La aprobación del comprobante y la devolución son procesos diferentes.</p>
            <p className="text-xs text-amber-700">Un comprobante puede estar aprobado aunque ya se haya realizado un reembolso total o parcial.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleIrReembolsos}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow flex items-center gap-1"
        >
          Gestionar reembolsos →
        </button>
      </div>

      {/* Modal de Revisión / Detalle */}
      {comprobanteSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-indigo-950">Gestión de Comprobante: {comprobanteSeleccionado.reserva}</h3>
              <button
                type="button"
                onClick={() => setComprobanteSeleccionado(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex justify-between bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-500">Cliente:</span>
                <span className="font-bold text-indigo-900">{comprobanteSeleccionado.cliente}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Banco emisor:</span>
                <span className="text-gray-800">{comprobanteSeleccionado.banco}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Fecha de recepción:</span>
                <span className="text-gray-800">{comprobanteSeleccionado.recibido}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Monto depositado:</span>
                <span className="font-bold text-emerald-600">${comprobanteSeleccionado.monto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Estado actual:</span>
                <span className="font-medium text-blue-600">{comprobanteSeleccionado.estado}</span>
              </div>
              <div className="flex justify-between px-2">
                <span className="font-semibold text-gray-500">Estado de reembolso:</span>
                <span className="text-gray-800">{comprobanteSeleccionado.reembolso}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setComprobanteSeleccionado(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Cerrar
              </button>
              {comprobanteSeleccionado.estado === 'En revisión' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCambiarEstado('Rechazados')}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCambiarEstado('Aprobados')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Aprobar comprobante
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OficinaComprobantesPage;