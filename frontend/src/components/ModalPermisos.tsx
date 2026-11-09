import React from 'react';

export default function ModalPermisos({ isOpen, onClose, userName = "Usuario" }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-blue-900 flex items-center">
            <span className="mr-2">⚙️</span> Permisos de {userName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-xl">×</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="flex items-start gap-3">
            <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-green-600" />
            <div>
              <div className="font-bold text-gray-900">Venta</div>
              <div className="text-xs text-gray-500">Puede realizar ventas de pasajes</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-green-600" />
            <div>
              <div className="font-bold text-gray-900">Revisar comprobantes</div>
              <div className="text-xs text-gray-500">Puede validar comprobantes de pago</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button onClick={onClose} className="bg-red-600 text-white font-bold py-2 px-6 rounded hover:bg-red-700">
            💾 Guardar permisos
          </button>
        </div>
      </div>
    </div>
  );
}