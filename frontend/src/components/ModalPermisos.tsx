import {IconoBiblioteca} from './ui/IconoBiblioteca';
import { useState, useEffect } from 'react';

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
  const [permisos, setPermisos] = useState<Permisos>(initialPermisos ?? defaultPermisos);

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
            <IconoBiblioteca nombre="configuracion" className="mr-2 h-6 w-6 text-blue-900"/>
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
            <IconoBiblioteca nombre="guardar" className="mr-2 h-5 w-5"/>
            Guardar permisos
          </button>
        </div>
      </div>
    </div>
  );
}
