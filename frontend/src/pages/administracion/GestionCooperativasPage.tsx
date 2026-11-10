import React, { useState } from 'react';
import ModalPermisos, { Permisos } from '../../components/ModalPermisos';

export default function GestionCooperativasPage() {
  const [formData, setFormData] = useState({
    nombreComercial: 'Gran Continental', razonSocial: 'Cooperativa Gran Continental', ruc: '1790012345001',
    correoContacto: 'contacto@example.com', telefono: '022345678', estadoCoop: 'Activa',
    nombres: 'Ana', apellidos: 'Torres', cedula: '1712345678', correoUser: 'ana.torres@example.com',
    telefonoUser: '991112233', rol: 'Cooperativa', estadoUser: 'Activo'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [permisosUsuario, setPermisosUsuario] = useState<Permisos | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const rucRegex = /^\d{13}$/;
    const cedulaRegex = /^\d{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!rucRegex.test(formData.ruc)) newErrors.ruc = 'El RUC debe tener 13 dígitos numéricos.';
    if (!emailRegex.test(formData.correoContacto)) newErrors.correoContacto = 'Correo de contacto inválido.';
    if (!cedulaRegex.test(formData.cedula)) newErrors.cedula = 'La cédula debe tener exactamente 10 dígitos.';
    if (!emailRegex.test(formData.correoUser)) newErrors.correoUser = 'Correo de usuario inválido.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    // Simulación asíncrona local (sin consola ni guardado en BD real todavía)
    setTimeout(() => {
      setIsLoading(false);
      alert('¡Validación exitosa! (Prueba local: los datos no se han registrado en la base de datos todavía).');
    }, 1500);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-blue-900 mb-6">Cooperativas, usuarios y roles</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
            <h2 className="text-xl font-bold text-blue-900 flex items-center mb-4"><span className="mr-2">🏢</span> Datos de la cooperativa</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nombreComercial">Nombre comercial *</label>
                <input type="text" id="nombreComercial" name="nombreComercial" value={formData.nombreComercial} onChange={handleChange} disabled={isLoading} className="w-full border rounded p-2 disabled:bg-gray-100" required />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="razonSocial">Razón social *</label>
                <input type="text" id="razonSocial" name="razonSocial" value={formData.razonSocial} onChange={handleChange} disabled={isLoading} className="w-full border rounded p-2 disabled:bg-gray-100" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ruc">RUC *</label>
                <input type="text" id="ruc" name="ruc" value={formData.ruc} onChange={handleChange} disabled={isLoading} className={`w-full border rounded p-2 disabled:bg-gray-100 ${errors.ruc ? 'border-red-500 bg-red-50' : ''}`} required />
                {errors.ruc && <p className="text-xs text-red-600 mt-1">{errors.ruc}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="correoContacto">Correo de contacto *</label>
                <input type="email" id="correoContacto" name="correoContacto" value={formData.correoContacto} onChange={handleChange} disabled={isLoading} className={`w-full border rounded p-2 disabled:bg-gray-100 ${errors.correoContacto ? 'border-red-500 bg-red-50' : ''}`} required />
                {errors.correoContacto && <p className="text-xs text-red-600 mt-1">{errors.correoContacto}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
            <h2 className="text-xl font-bold text-blue-900 flex items-center mb-4"><span className="mr-2">👤</span> Usuario responsable</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nombres">Nombres *</label>
                <input type="text" id="nombres" name="nombres" value={formData.nombres} onChange={handleChange} disabled={isLoading} className="w-full border rounded p-2 disabled:bg-gray-100" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="apellidos">Apellidos *</label>
                <input type="text" id="apellidos" name="apellidos" value={formData.apellidos} onChange={handleChange} disabled={isLoading} className="w-full border rounded p-2 disabled:bg-gray-100" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cedula">Cédula (10 dígitos) *</label>
                <input type="text" id="cedula" name="cedula" value={formData.cedula} onChange={handleChange} disabled={isLoading} className={`w-full border rounded p-2 disabled:bg-gray-100 ${errors.cedula ? 'border-red-500 bg-red-50' : ''}`} required />
                {errors.cedula && <p className="text-xs text-red-600 mt-1">{errors.cedula}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="correoUser">Correo electrónico *</label>
                <input type="email" id="correoUser" name="correoUser" value={formData.correoUser} onChange={handleChange} disabled={isLoading} className={`w-full border rounded p-2 disabled:bg-gray-100 ${errors.correoUser ? 'border-red-500 bg-red-50' : ''}`} required />
                {errors.correoUser && <p className="text-xs text-red-600 mt-1">{errors.correoUser}</p>}
              </div>

              <div className="col-span-2 p-4 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center mt-2">
                <div>
                  <p className="font-bold text-blue-900">Accesos del sistema</p>
                  <p className="text-sm text-blue-700">{permisosUsuario ? 'Permisos configurados' : 'Sin configurar'}</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(true)} disabled={isLoading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-bold disabled:opacity-50">
                  ⚙️ Configurar permisos
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full mt-4 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 disabled:bg-red-400 flex justify-center items-center">
              {isLoading ? '⏳ Procesando...' : '👤 Guardar usuario y validar'}
            </button>
          </div>
        </form>

        <ModalPermisos
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userName={`${formData.nombres} ${formData.apellidos}`}
          initialPermisos={permisosUsuario}
          onSave={(permisos: Permisos) => setPermisosUsuario(permisos)}
        />
      </div>
    </div>
  );
}
