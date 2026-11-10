import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fetchVentaOficinaData, procesarCobroVenta } from '../../features/oficina/VentaOficinaPage.service';
import { VentaOficinaData } from '../../features/oficina/VentaOficinaPage.types';

export const VentaOficinaPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<VentaOficinaData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Estados del formulario de cobro
  const [metodoPago, setMetodoPago] = useState<string>('Efectivo');
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>('50.00');
  const [enviarNotificacion, setEnviarNotificacion] = useState<boolean>(true);
  const [procesando, setProcesando] = useState<boolean>(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const res = await fetchVentaOficinaData();
        setData(res);
      } catch (err) {
        console.error('Error al cargar datos de venta en oficina:', err);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <p className="animate-pulse text-lg font-medium">Cargando módulo de Venta en Oficina...</p>
      </div>
    );
  }

  const recibidoNum = parseFloat(efectivoRecibido) || 0;
  const cambio = metodoPago === 'Efectivo' ? Math.max(0, recibidoNum - data.totalPagar) : 0;

  const handleCobrarEmitir = async () => {
    if (metodoPago === 'Efectivo' && recibidoNum < data.totalPagar) {
      alert('El efectivo recibido no puede ser menor al total a pagar.');
      return;
    }

    try {
      setProcesando(true);
      await procesarCobroVenta(metodoPago, recibidoNum, data.totalPagar);
      alert('¡Cobro registrado y boleto emitido con éxito!');
      navigate('/vista-previa/oficinista');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      alert(`Error en el cobro: ${msg}`);
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelar = () => {
    if (window.confirm('¿Deseas cancelar esta venta y liberar la retención?')) {
      navigate('/vista-previa/oficinista');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold text-indigo-950">Venta en oficina</h1>
          <p className="text-xs text-gray-500">Registra la venta de boletos en la oficina.</p>
        </div>

        {/* Pasos del Proceso */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">✓</span>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-800">1. Viaje</p>
              <p className="text-xs text-emerald-600 font-medium">Completado</p>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">✓</span>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-800">2. Asientos</p>
              <p className="text-xs text-emerald-600 font-medium">Completado</p>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">✓</span>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-800">3. Pasajeros</p>
              <p className="text-xs text-emerald-600 font-medium">Completado</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center">4</span>
            <div>
              <p className="text-[10px] uppercase font-bold text-red-800">4. Cobro</p>
              <p className="text-xs text-red-600 font-medium">En proceso</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido a Dos Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Columna Izquierda: Información de Viaje, Pasajeros y Comprador */}
        <div className="space-y-6">
          
          {/* Viaje Seleccionado */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                🚌 Viaje seleccionado
              </h2>
              <button type="button" className="text-xs text-blue-600 hover:underline font-medium">Editar viaje</button>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-gray-800">📍 {data.origen} → 📍 {data.destino}</p>
                <p className="text-gray-500">{data.fechaViaje} | Salida: {data.salida} | Llegada: {data.llegada}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-700">Unidad {data.unidad} | Placa {data.placa}</p>
                <p className="text-gray-500">{data.tipoBus} | {data.piso}</p>
              </div>
            </div>
          </div>

          {/* Pasajeros y Asientos */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                👥 Pasajeros y asientos
              </h2>
              <button type="button" className="text-xs text-blue-600 hover:underline font-medium">Editar pasajeros</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Nombre completo</th>
                    <th className="py-2 px-2">Cédula</th>
                    <th className="py-2 px-2">Asiento</th>
                    <th className="py-2 px-2">Tipo</th>
                    <th className="py-2 px-2 text-right">Tarifa</th>
                    <th className="py-2 px-2 text-right">Desc.</th>
                    <th className="py-2 px-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.pasajeros.map((p, idx) => (
                    <tr key={p.id}>
                      <td className="py-2 px-2 font-bold">{idx + 1}</td>
                      <td className="py-2 px-2 text-gray-800 font-medium">{p.nombre}</td>
                      <td className="py-2 px-2 font-mono">{p.cedula}</td>
                      <td className="py-2 px-2 font-mono font-bold text-blue-600">{p.asiento}</td>
                      <td className="py-2 px-2">{p.tipo}</td>
                      <td className="py-2 px-2 text-right">${p.tarifa.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right text-emerald-600">-${p.descuento.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-bold text-gray-800">${p.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Datos del Comprador */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                👤 Datos del comprador
              </h2>
              <button type="button" className="text-xs text-blue-600 hover:underline font-medium">Editar</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg">
                <span>✉️</span>
                <span className="font-medium text-gray-800">{data.compradorEmail}</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg">
                <span>📞</span>
                <span className="font-medium text-gray-800">{data.compradorTelefono}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Columna Derecha: Método de pago, Totales y Ejecución de Cobro */}
        <div className="space-y-6">
          
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              💲 Cobro en oficina
            </h2>

            {/* Selector de Método de Pago */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Método de pago</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoPago('Efectivo')}
                  className={`p-2.5 rounded-lg text-xs font-semibold border transition ${metodoPago === 'Efectivo' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  💵 Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPago('Tarjeta')}
                  className={`p-2.5 rounded-lg text-xs font-semibold border transition ${metodoPago === 'Tarjeta' ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-gray-200 text-gray-400'}`}
                >
                  💳 Tarjeta <span className="block text-[9px] font-normal text-amber-600">Próximamente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPago('Transferencia')}
                  className={`p-2.5 rounded-lg text-xs font-semibold border transition ${metodoPago === 'Transferencia' ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  🏦 Transferencia
                </button>
              </div>
            </div>

            {/* Resumen Financiero */}
            <div className="border-t pt-3 space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal base:</span>
                <span className="font-semibold">${data.subtotalBase.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Descuento total:</span>
                <span>-${data.descuentoTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cargo por servicio:</span>
                <span>${data.cargoServicio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (0%):</span>
                <span>${data.iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-indigo-950 pt-2 border-t">
                <span>Total a pagar:</span>
                <span>${data.totalPagar.toFixed(2)}</span>
              </div>
            </div>

            {/* Entradas condicionales para pago en efectivo */}
            {metodoPago === 'Efectivo' && (
              <div className="bg-gray-50 p-4 rounded-xl space-y-3 border">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Efectivo recibido</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={efectivoRecibido}
                      onChange={(e) => setEfectivoRecibido(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm font-bold border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-emerald-900 font-bold">
                  <span className="text-xs uppercase">Cambio a devolver:</span>
                  <span className="text-lg">${cambio.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-900 flex items-start gap-2">
              <span className="text-blue-600 text-base">ℹ️</span>
              <p>Al registrar el cobro, se confirma la compra y se emite un boleto con los dos pasajeros.</p>
            </div>

            {/* Checkbox de Envío */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="enviarNotif"
                checked={enviarNotificacion}
                onChange={(e) => setEnviarNotificacion(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="enviarNotif" className="text-xs text-gray-700">
                <strong className="block text-gray-900">Enviar boleto por correo y WhatsApp</strong>
                Se enviará el boleto al correo y número del comprador registrado.
              </label>
            </div>

            {/* Botones de Acción */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t">
              <button
                type="button"
                disabled={procesando}
                onClick={handleCancelar}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-lg text-xs font-bold transition shadow cursor-pointer disabled:opacity-50"
              >
                Cancelar venta
              </button>
              <button
                type="button"
                disabled={procesando}
                onClick={handleCobrarEmitir}
                className="bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-xs font-bold transition shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                ✓ Cobrar y emitir boleto
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default VentaOficinaPage;