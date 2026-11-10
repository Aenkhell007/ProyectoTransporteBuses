import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { fetchRevisionComprobante, enviarDecisionComprobante } from '../../features/oficina/RevisionComprobantePage.service';
import { RevisionComprobanteData } from '../../features/oficina/RevisionComprobantePage.types';

export const RevisionComprobantePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  
  const [data, setData] = useState<RevisionComprobanteData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [errorValidacion, setErrorValidacion] = useState<string>('');
  const [procesando, setProcesando] = useState<boolean>(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const resultado = await fetchRevisionComprobante(id);
        setData(resultado);
      } catch (err) {
        console.error('Error al cargar comprobante para revisión:', err);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, [id]);

  const handleAprobar = async () => {
    if (!data) return;
    try {
      setProcesando(true);
      await enviarDecisionComprobante(data.reservaId, 'aprobar');
      alert('¡Comprobante aprobado con éxito! Se ha confirmado la reserva y emitido el boleto único.');
      navigate('/vista-previa/oficinista/comprobantes');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      alert(`No se pudo aprobar: ${msg}`);
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    if (!data) return;
    if (!motivoRechazo.trim()) {
      setErrorValidacion('El motivo de rechazo es obligatorio si rechazas el comprobante[cite: 7, 8].');
      return;
    }
    setErrorValidacion('');
    try {
      setProcesando(true);
      await enviarDecisionComprobante(data.reservaId, 'rechazar', motivoRechazo);
      alert('Comprobante rechazado correctamente. Se ha notificado al cliente.');
      navigate('/vista-previa/oficinista/comprobantes');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      alert(`No se pudo rechazar: ${msg}`);
    } finally {
      setProcesando(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <p className="animate-pulse text-lg font-medium">Cargando detalles de revisión de comprobante...</p>
      </div>
    );
  }

  const montosCoinciden = data.montoReportado === data.totalEsperado;

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera Superior */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate('/vista-previa/oficinista/comprobantes')}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            ← Volver a comprobantes[cite: 7]
          </button>
          <h1 className="text-xl font-bold text-indigo-950 flex items-center gap-3">
            Revisión de comprobante
            <span className="text-xs font-semibold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
              {data.estado}[cite: 7]
            </span>
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Reserva: <strong className="text-gray-800">{data.reservaId}</strong> | {data.cliente}[cite: 7]
          </p>
        </div>
      </div>

      {/* Contenedor Principal a dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Columna Izquierda: Comprobante Recibido */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              📄 Comprobante recibido[cite: 7, 8]
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="text-gray-500">{data.comprobanteArchivo} ({data.comprobanteTamano})[cite: 7, 8]</span>
              <button type="button" className="text-blue-600 hover:underline font-medium">Q Ampliar[cite: 7, 8]</button>
              <button type="button" className="text-blue-600 hover:underline font-medium">Descargar[cite: 7, 8]</button>
            </div>
          </div>

          {/* Recibo Visual Simulado (Banco Pichincha) */}
          <div className="bg-amber-400 p-6 rounded-xl text-indigo-950 space-y-4 shadow-inner relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="bg-black text-white font-black px-3 py-1 rounded text-xs">BANCO PICHINCHA[cite: 7, 8]</div>
              <span className="text-xs font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1">
                ✓ Transferencia realizada con éxito[cite: 7, 8]
              </span>
            </div>

            <h3 className="text-base font-bold underline">Comprobante de transferencia[cite: 7, 8]</h3>
            <p className="text-xs opacity-90">Tu transacción se ha procesado correctamente[cite: 7, 8].</p>

            <div className="grid grid-cols-2 gap-2 text-xs bg-white/40 p-3 rounded-lg">
              <div>
                <p className="text-gray-700 font-semibold">Monto[cite: 7, 8]:</p>
                <p className="text-sm font-bold text-gray-900">${data.montoReportado.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-700 font-semibold">Fecha y hora[cite: 7, 8]:</p>
                <p className="text-gray-900">{data.fechaHora}</p>
              </div>
              <div>
                <p className="text-gray-700 font-semibold">Beneficiario[cite: 7, 8]:</p>
                <p className="text-gray-900">Cooperativa Gran Continental</p>
              </div>
              <div>
                <p className="text-gray-700 font-semibold">Referencia[cite: 7, 8]:</p>
                <p className="text-gray-900 font-mono">{data.referencia}</p>
              </div>
              <div>
                <p className="text-gray-700 font-semibold">Banco[cite: 7, 8]:</p>
                <p className="text-gray-900">{data.bancoEmisor}</p>
              </div>
              <div>
                <p className="text-gray-700 font-semibold">Código de transacción[cite: 7, 8]:</p>
                <p className="text-gray-900 font-mono">{data.codigoTransaccion}</p>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-[10px] font-bold tracking-widest text-indigo-900 uppercase">Banco Pichincha • Tu confianza nos mueve[cite: 7, 8]</p>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Detalle de Compra y Acciones */}
        <div className="space-y-6">
          
          {/* Detalle del Viaje y Pasajeros */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              🚌 Detalle de la compra[cite: 7, 8]
            </h2>

            {/* Ruta */}
            <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-gray-800">📍 {data.origen} → 📍 {data.destino}[cite: 7, 8]</p>
                <p className="text-gray-500">{data.fechaViaje} | Salida: {data.salida} | Llegada: {data.llegada}[cite: 7, 8]</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-700">Unidad {data.unidad} | Placa {data.placa}[cite: 7, 8]</p>
                <p className="text-gray-500">{data.piso} | {data.asientosInfo}[cite: 7, 8]</p>
              </div>
            </div>

            {/* Tabla Pasajeros */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">Nombre[cite: 7, 8]</th>
                    <th className="py-2 px-2">Asiento[cite: 7, 8]</th>
                    <th className="py-2 px-2">Tipo[cite: 7, 8]</th>
                    <th className="py-2 px-2 text-right">Tarifa[cite: 7, 8]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.pasajeros.map((p, index) => (
                    <tr key={p.id}>
                      <td className="py-2 px-2 font-bold">{index + 1}</td>
                      <td className="py-2 px-2 text-gray-800 font-medium">{p.nombre}[cite: 7, 8]</td>
                      <td className="py-2 px-2 font-mono font-bold text-blue-600">{p.asiento}[cite: 7, 8]</td>
                      <td className="py-2 px-2">{p.tipo}[cite: 7, 8]</td>
                      <td className="py-2 px-2 text-right font-bold text-gray-800">${p.tarifa.toFixed(2)}[cite: 7, 8]</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Desglose Financiero */}
            <div className="border-t pt-3 space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal base[cite: 7, 8]:</span>
                <span className="font-semibold">${data.subtotalBase.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Descuento (15%)[cite: 7, 8]:</span>
                <span>-${data.descuento.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cargo por servicio[cite: 7, 8]:</span>
                <span>${data.cargoServicio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-indigo-950 pt-2 border-t">
                <span>Total esperado[cite: 7, 8]:</span>
                <span>${data.totalEsperado.toFixed(2)}</span>
              </div>
            </div>

            {/* Comparación de Montos */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-[10px] text-gray-500 font-semibold uppercase">Monto esperado[cite: 7, 8]</p>
                <p className="text-base font-bold text-gray-800">${data.totalEsperado.toFixed(2)}</p>
              </div>
              <div className={`p-3 rounded-lg text-center border ${montosCoinciden ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                <p className="text-[10px] font-semibold uppercase">Monto del comprobante[cite: 7, 8]</p>
                <p className="text-base font-bold flex items-center justify-center gap-1">
                  ${data.montoReportado.toFixed(2)}
                  <span>{montosCoinciden ? '✓' : '⚠️'}</span>
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs bg-blue-50 p-3 rounded-lg text-blue-900">
              <span className="font-semibold">💳 Método de pago[cite: 7, 8]:</span>
              <span>Transferencia / Depósito[cite: 7, 8]</span>
            </div>
          </div>

          {/* Formulario de Decisión (Aprobar / Rechazar) */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
              ✍️ Observaciones / motivo del rechazo[cite: 7, 8]
            </h2>
            <div className="space-y-1">
              <textarea
                rows={3}
                maxLength={300}
                placeholder="Obligatorio si rechazas el comprobante[cite: 7, 8]..."
                value={motivoRechazo}
                onChange={(e) => {
                  setMotivoRechazo(e.target.value);
                  if (errorValidacion) setErrorValidacion('');
                }}
                className="w-full p-3 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>{errorValidacion && <strong className="text-red-500">{errorValidacion}</strong>}</span>
                <span>{motivoRechazo.length}/300[cite: 7, 8]</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <span className="text-amber-600 text-base">ℹ️</span>
              <p>Al aprobar, se confirma la reserva, se emite un único boleto con ambos pasajeros y se notifica al cliente[cite: 7, 8].</p>
            </div>

            {/* Botones de Acción Oficiales */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={procesando}
                onClick={handleRechazar}
                className="bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-xs font-bold transition shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                ✕ Rechazar comprobante[cite: 7, 8]
              </button>
              <button
                type="button"
                disabled={procesando}
                onClick={handleAprobar}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-xs font-bold transition shadow flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                ✓ Aprobar pago[cite: 7, 8]
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RevisionComprobantePage;