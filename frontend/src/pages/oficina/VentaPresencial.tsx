import React from 'react';

export const VentaPresencial = () => {
  const viajesDisponibles = [
    { id: 1, ruta: 'Ambato - Loja', hora: '07:00', asientosLibres: 12 },
    { id: 2, ruta: 'Ambato - Cuenca', hora: '12:00', asientosLibres: 4 },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Venta Presencial - Boletería</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">1. Seleccionar Viaje</h2>
          <div className="space-y-3">
            {viajesDisponibles.map((viaje) => (
              <div key={viaje.id} className="p-4 border rounded cursor-pointer hover:bg-blue-50 transition border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">{viaje.ruta}</span>
                  <span className="text-blue-600 font-bold">{viaje.hora}</span>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Asientos disponibles: {viaje.asientosLibres}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">2. Datos del Pasajero</h2>
          <form className="space-y-4">
            {/* Asociación solicitada por Ángel: htmlFor con id */}
            <div>
              <label htmlFor="cedula" className="block text-sm font-medium text-gray-700 mb-1">
                Cédula
              </label>
              <input 
                id="cedula" 
                type="text" 
                className="w-full border border-gray-300 rounded p-2" 
                placeholder="Ej: 1801234567" 
              />
            </div>
            <div>
              <label htmlFor="nombreCompleto" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo
              </label>
              <input 
                id="nombreCompleto" 
                type="text" 
                className="w-full border border-gray-300 rounded p-2" 
                placeholder="Nombre del pasajero" 
              />
            </div>
            <div>
              <label htmlFor="asientoAsignado" className="block text-sm font-medium text-gray-700 mb-1">
                Asiento Asignado
              </label>
              <input 
                id="asientoAsignado" 
                type="text" 
                className="w-full border border-gray-300 rounded p-2 bg-gray-100" 
                placeholder="Seleccione en el mapa..." 
                disabled 
              />
            </div>
            <button type="button" className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition mt-4">
              Confirmar Venta y Emitir Boleto
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};