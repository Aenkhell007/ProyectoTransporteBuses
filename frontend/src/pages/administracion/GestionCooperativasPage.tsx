import React, { useState } from 'react';

export default function GestionCooperativasPage() {
  const [formData, setFormData] = useState({
    nombreComercial: 'Gran Continental', razonSocial: 'Cooperativa Gran Continental', ruc: '1790012345001',
    correoContacto: 'contacto@example.com', telefono: '022345678', estadoCoop: 'Activa',
    nombres: 'Ana', apellidos: 'Torres', cedula: '1712345678', correoUser: 'ana.torres@example.com',
    telefonoUser: '991112233', rol: 'Cooperativa', estadoUser: 'Activo'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const rucRegex = /^\d{13}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!rucRegex.test(formData.ruc)) newErrors.ruc = 'El RUC debe tener 13 dígitos numéricos.';
    if (!emailRegex.test(formData.correoContacto)) newErrors.correoContacto = 'Correo inválido.';
    if (!emailRegex.test(formData.correoUser)) newErrors.correoUser = 'Correo inválido.';
    if (formData.cedula.length < 10) newErrors.cedula = 'Cédula incompleta.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; 
    }

    console.log('Guardando cooperativa y responsable:', formData);
    alert('Validación exitosa. Datos listos para el backend.');
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre comercial *</label>
                <input type="text" name="nombreComercial" value={formData.nombreComercial} onChange={handleChange} className="w-full border rounded p-2" required />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón social *</label>
                <input type="text" name="razonSocial" value={formData.razonSocial} onChange={handleChange} className="w-full border rounded p-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUC *</label>
                <input type="text" name="ruc" value={formData.ruc} onChange={handleChange} className={`w-full border rounded p-2 ${errors.ruc ? 'border-red-500 bg-red-50' : ''}`} required />
                {errors.ruc && <p className="text-xs text-red-600 mt-1">{errors.ruc}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo de contacto *</label>
                <input type="email" name="correoContacto" value={formData.correoContacto} onChange={handleChange} className={`w-full border rounded p-2 ${errors.correoContacto ? 'border-red-500 bg-red-50' : ''}`} required />
                {errors.correoContacto && <p className="text-xs text-red-600 mt-1">{errors.correoContacto}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
            <h2 className="text-xl font-bold text-blue-900 flex items-center mb-4"><span className="mr-2">👤</span> Usuario responsable</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} className="w-full border rounded p-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full border rounded p-2" required />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula *</label>
                <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} className={`w-full border rounded p-2 ${errors.cedula ? 'border-red-500 bg-red-50' : ''}`} required />
                {errors.cedula && <p className="text-xs text-red-600 mt-1">{errors.cedula}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo *</label>
                <input type="email" name="correoUser" value={formData.correoUser} onChange={handleChange} className={`w-full border rounded p-2 ${errors.correoUser ? 'border-red-500 bg-red-50' : ''}`} required />
                {errors.correoUser && <p className="text-xs text-red-600 mt-1">{errors.correoUser}</p>}
              </div>
            </div>
            <button type="submit" className="w-full mt-4 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700">
              👤 Guardar usuario y validar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}