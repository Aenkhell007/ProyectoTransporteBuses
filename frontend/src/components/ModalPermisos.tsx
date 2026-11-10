import React, { useState, useEffect } from 'react';

export interface Permisos {
  venta: boolean;
  revisarComprobantes: boolean;
  publicarViajes: boolean;
  administrarCooperativas: boolean;
}

interface ModalPermisosProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  initialPermisos?: Permisos;
  onSave: (permisos: Permisos) => void;
}

const defaultPermisos: Permisos = {
  venta: false,
  revisarComprobantes: false,
  publicarViajes: false,
  administrarCooperativas: false
};

export default function ModalPermisos({ isOpen, onClose, userName = "Usuario", initialPermisos, onSave }: ModalPermisosProps) {
  const [permisos, setPermisos] = useState<Permisos>(defaultPermisos);

  useEffect(() => {
    if (isOpen) {
      setPermisos(initialPermisos || defaultPermisos);
    }
  }, [isOpen, initialPermisos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggle = (permiso: keyof Permisos) => {
    setPermisos(prev => ({ ...prev, [permiso]: !prev[permiso] }));
  };

  const handleSave = () => {
    onSave(permisos);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="modal-title" className="text-xl font-bold text-blue-900 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Permisos de {userName}
          </h2>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-800 font-bold text-xl"
            aria-label="Cerrar modal" 
          >
            ×
          </button>
        </div>
        
        {/* Checkboxes asociados correctamente con elementos label */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              id="chk-venta"
              checked={permisos.venta} 
              onChange={() => handleToggle('venta')} 
              className="mt-1 w-4 h-4 text-green-600 cursor-pointer" 
            />
            <label htmlFor="chk-venta" className="cursor-pointer">
              <span className="block font-bold text-gray-900">Venta</span>
              <span className="block text-xs text-gray-500">Puede realizar ventas de pasajes</span>
            </label>
          </div>

          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              id="chk-revisar"
              checked={permisos.revisarComprobantes} 
              onChange={() => handleToggle('revisarComprobantes')} 
              className="mt-1 w-4 h-4 text-green-600 cursor-pointer" 
            />
            <label htmlFor="chk-revisar" className="cursor-pointer">
              <span className="block font-bold text-gray-900">Revisar comprobantes</span>
              <span className="block text-xs text-gray-500">Puede validar comprobantes de pago</span>
            </label>
          </div>

          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              id="chk-publicar"
              checked={permisos.publicarViajes} 
              onChange={() => handleToggle('publicarViajes')} 
              className="mt-1 w-4 h-4 text-green-600 cursor-pointer" 
            />
            <label htmlFor="chk-publicar" className="cursor-pointer">
              <span className="block font-bold text-gray-900">Publicar viajes</span>
              <span className="block text-xs text-gray-500">Puede publicar y gestionar viajes</span>
            </label>
          </div>

          <div className="flex items-start gap-3">
            <input 
              type="checkbox" 
              id="chk-admin"
              checked={permisos.administrarCooperativas} 
              onChange={() => handleToggle('administrarCooperativas')} 
              className="mt-1 w-4 h-4 text-green-600 cursor-pointer" 
            />
            <label htmlFor="chk-admin" className="cursor-pointer">
              <span className="block font-bold text-gray-900">Administrar cooperativas</span>
              <span className="block text-xs text-gray-500">Puede gestionar configuraciones</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button type="button" onClick={handleSave} className="bg-red-600 text-white font-bold py-2 px-6 rounded hover:bg-red-700 transition-colors flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Guardar permisos
          </button>
        </div>
      </div>
    </div>
  );
}