import React, { useState } from 'react';

export default function AltaCooperativaResponsableForm() {
  const [formData, setFormData] = useState({
    nombreComercial: '',
    razonSocial: '',
    ruc: '',
    correoContacto: '',
    nombres: '',
    apellidos: '',
    cedula: '',
    correoResponsable: '',
    rol: 'COOPERATIVA'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const rucRegex = /^\d{13}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // VALIDACIÓN ESTRICTA DE CÉDULA SOLICITADA EN EL PR: Exactamente 10 dígitos numéricos
    const cedulaRegex = /^[0-9]{10}$/;

    if (!rucRegex.test(formData.ruc)) {
      newErrors.ruc = 'El RUC debe tener 13 dígitos numéricos.';
    }
    if (!emailRegex.test(formData.correoContacto)) {
      newErrors.correoContacto = 'Correo inválido.';
    }
    if (!emailRegex.test(formData.correoResponsable)) {
      newErrors.correoResponsable = 'Correo inválido.';
    }
    // Aquí se aplica la validación exacta que pidieron Ángel, Kevin y Pablo
    if (!cedulaRegex.test(formData.cedula)) {
      newErrors.cedula = 'La cédula debe tener exactamente 10 dígitos numéricos.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; 
    }

    console.log('Guardando cooperativa y responsable:', formData);
    alert('Validación exitosa. Datos listos para el backend.');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">Nueva cooperativa y responsable</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 shadow rounded-lg">
            <h2 className="font-bold text-blue-900 mb-4 border-b pb-2">Datos de la cooperativa</h2>
            <div className="space-y-4">
              <div>
                <input 
                  type="text" 
                  name="nombreComercial" 
                  value={formData.nombreComercial} 
                  onChange={handleChange} 
                  placeholder="Nombre comercial" 
                  className="w-full border p-2 rounded bg-gray-50" 
                  required 
                />
              </div>
              <div>
                <input 
                  type="text" 
                  name="razonSocial" 
                  value={formData.razonSocial} 
                  onChange={handleChange} 
                  placeholder="Razón social" 
                  className="w-full border p-2 rounded bg-gray-50" 
                  required 
                />
              </div>
              <div>
                <input 
                  type="text" 
                  name="ruc" 
                  value={formData.ruc} 
                  onChange={handleChange} 
                  placeholder="RUC" 
                  className={`w-full border p-2 rounded bg-gray-50 ${errors.ruc ? 'border-red-500 bg-red-50' : ''}`} 
                  required 
                />
                {errors.ruc && <p className="text-xs text-red-600 mt-1">{errors.ruc}</p>}
              </div>
              <div>
                <input 
                  type="email" 
                  name="correoContacto" 
                  value={formData.correoContacto} 
                  onChange={handleChange} 
                  placeholder="Correo de contacto" 
                  className={`w-full border p-2 rounded bg-gray-50 ${errors.correoContacto ? 'border-red-500 bg-red-50' : ''}`} 
                  required 
                />
                {errors.correoContacto && <p className="text-xs text-red-600 mt-1">{errors.correoContacto}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 shadow rounded-lg">
            <h2 className="font-bold text-blue-900 mb-4 border-b pb-2">Usuario responsable</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  name="nombres" 
                  value={formData.nombres} 
                  onChange={handleChange} 
                  placeholder="Nombres" 
                  className="w-full border p-2 rounded bg-gray-50" 
                  required 
                />
                <input 
                  type="text" 
                  name="apellidos" 
                  value={formData.apellidos} 
                  onChange={handleChange} 
                  placeholder="Apellidos" 
                  className="w-full border p-2 rounded bg-gray-50" 
                  required 
                />
              </div>
              <div>
                <input 
                  type="text" 
                  name="cedula" 
                  value={formData.cedula} 
                  onChange={handleChange} 
                  placeholder="Cédula (10 dígitos)" 
                  className={`w-full border p-2 rounded bg-gray-50 ${errors.cedula ? 'border-red-500 bg-red-50' : ''}`} 
                  required 
                />
                {errors.cedula && <p className="text-xs text-red-600 mt-1">{errors.cedula}</p>}
              </div>
              <div>
                <input 
                  type="email" 
                  name="correoResponsable" 
                  value={formData.correoResponsable} 
                  onChange={handleChange} 
                  placeholder="Correo" 
                  className={`w-full border p-2 rounded bg-gray-50 ${errors.correoResponsable ? 'border-red-500 bg-red-50' : ''}`} 
                  required 
                />
                {errors.correoResponsable && <p className="text-xs text-red-600 mt-1">{errors.correoResponsable}</p>}
              </div>
              <select name="rol" value={formData.rol} onChange={handleChange} className="w-full border p-2 rounded bg-gray-50 text-gray-600">
                <option value="COOPERATIVA">Rol: Cooperativa</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button type="button" className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700">Crear cooperativa y responsable</button>
        </div>
      </form>
    </div>
  );
}