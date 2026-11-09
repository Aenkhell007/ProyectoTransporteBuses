import React, { useState } from 'react';

export default function ModalPermisos({ isOpen, onClose, userName = "Usuario", onSave }: any) {
  // 1. Estado reactivo para los permisos (Día 4)
  const [permisos, setPermisos] = useState({
    venta: true,
    revisarComprobantes: true,
    publicarViajes: false,
    administrarCooperativas: false
  });

  if (!isOpen) return null;

  // 2. Lógica de selección múltiple
  const handleToggle = (permiso: keyof typeof permisos) => {
    setPermisos(prev => ({ ...prev, [permiso]: !prev[permiso] }));
  };

  // 3. Conexión del botón guardar
  const handleSave = () => {
    console.log("Guardando permisos para", userName, permisos);
    if (onSave) onSave(permisos);
    onClose();
    alert("Permisos actualizados correctamente en el estado local.");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-blue-900 flex items-center">
            <span className="mr-2">⚙️</span> Permisos de {userName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-xl">×</button>
        </div>
        
        {/* Matriz de accesos responsiva */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              checked={permisos.venta} 
              onChange={() => handleToggle('venta')}
              className="mt-1 w-4 h-4 text-green-600 cursor-pointer" 
            />
            <div>
              <div className="font-bold text-gray-900">Venta</div>
              <div className="text-xs text-gray-500">Puede realizar ventas de pasajes</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              checked={permisos.revisarComprobantes} 
              onChange={() => handleToggle('revisarComprobantes')}
              className="mt-1 w-4 h-4 text-green-600 cursor-pointer" 
            />
            <div>
              <div className="font-bold text-gray-900">Revisar comprobantes</div>
              <div className="text-xs text-gray-500">Puede validar comprobantes de pago</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              checked={permisos.publicarViajes} 
              onChange={() => handleToggle('publicarViajes')}
              className="mt-1 w-4 h-4 text-green-600 cursor-pointer" 
            />
            <div>
              <div className="font-bold text-gray-900">Publicar viajes</div>
              <div className="text-xs text-gray-500">Puede publicar y gestionar viajes</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              checked={permisos.administrarCooperativas} 
              onChange={() => handleToggle('administrarCooperativas')}
              className="mt-1 w-4 h-4 text-green-600 cursor-pointer" 
            />
            <div>
              <div className="font-bold text-gray-900">Administrar cooperativas</div>
              <div className="text-xs text-gray-500">Puede gestionar configuraciones</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button onClick={handleSave} className="bg-red-600 text-white font-bold py-2 px-6 rounded hover:bg-red-700 transition-colors">
            💾 Guardar permisos
          </button>
        </div>
      </div>
    </div>
  );
}