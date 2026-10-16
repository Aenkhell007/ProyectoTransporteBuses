import React from 'react';

export const BandejaComprobantes = () => {
  const comprobantesMock = [
    { id: 'RES-001', cliente: 'Mikel Guzman', monto: 15.50, estado: 'PENDING_PROOF', fecha: '2026-10-13' },
    { id: 'RES-002', cliente: 'Benjamin Basurto', monto: 22.00, estado: 'UNDER_REVIEW', fecha: '2026-10-13' }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Bandeja de Comprobantes - Oficina</h1>
      
      {/* overflow-x-auto permite el desplazamiento horizontal en dispositivos móviles */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">ID Reserva</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Cliente</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Monto</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {comprobantesMock.map((comp) => {
              // Condición solicitada por Ángel: si el estado es PENDING_PROOF se deshabilitan los botones
              const isDisabled = comp.estado === 'PENDING_PROOF';

              return (
                <tr key={comp.id}>
                  <td className="px-6 py-4 text-sm text-gray-800">{comp.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{comp.cliente}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">${comp.monto.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-yellow-600 font-medium">{comp.estado}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button 
                      disabled={isDisabled}
                      className={`px-3 py-1 rounded transition text-white ${
                        isDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      Aprobar
                    </button>
                    <button 
                      disabled={isDisabled}
                      className={`px-3 py-1 rounded transition text-white ${
                        isDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      Rechazar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};