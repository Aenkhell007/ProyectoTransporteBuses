import React, { useState } from 'react';

export default function RegistroPage() {
  const [formData, setFormData] = useState({
    nombres: '', apellidos: '', cedula: '', email: '',
    telefono: '', password: '', confirmPassword: '', aceptaTerminos: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center mb-2">Crear cuenta</h2>
        <p className="text-gray-600 text-center mb-8">Completa tus datos para registrarte en Gran Continental.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
              <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} className="w-full border rounded-md p-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
              <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full border rounded-md p-2" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
            <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} className="w-full border rounded-md p-2" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border rounded-md p-2" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-gray-50">+593</span>
              <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="flex-1 w-full p-2 border rounded-r-md" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full border rounded-md p-2" required minLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full border rounded-md p-2" required minLength={8} />
            </div>
          </div>

          <div className="flex items-center mt-4">
            <input type="checkbox" name="aceptaTerminos" checked={formData.aceptaTerminos} onChange={handleChange} className="w-4 h-4 text-red-600 rounded" required />
            <label className="ml-2 text-sm text-gray-700">Acepto los términos y condiciones y la política de privacidad.</label>
          </div>

          <button type="submit" className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 mt-6">
            Crear cuenta
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <p>¿Ya tienes una cuenta? <a href="/iniciar-sesion" className="text-red-600 font-bold hover:underline">Inicia sesión</a></p>
          <a href="/" className="block mt-4 text-gray-600 hover:underline">← Volver al inicio</a>
        </div>
      </div>
    </div>
  );
}