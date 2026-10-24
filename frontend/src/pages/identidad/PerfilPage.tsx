import React, { useState } from 'react';
import { Link } from 'react-router';

export default function PerfilPage() {
  const [formData, setFormData] = useState({
    nombres: 'Ángel Matías',
    apellidos: 'Galarza',
    cedula: '1723456789',
    email: 'angel.galarza@example.com',
    telefono: '99 123 4567'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Guardando perfil:', formData);
    // PATCH /api/me
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Mi perfil</h1>
        <p className="text-gray-600 mb-8">Consulta y actualiza tus datos personales y de contacto.</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Menú lateral con Avatar */}
          <aside className="col-span-1 bg-white shadow-sm border rounded-lg p-6 flex flex-col items-center h-fit">
            <div className="w-24 h-24 bg-blue-900 rounded-full flex items-center justify-center text-white text-4xl mb-4">
              👤
            </div>
            <h2 className="text-lg font-bold text-center text-blue-900">{formData.nombres} {formData.apellidos}</h2>
            <p className="text-gray-500 text-xs text-center mb-3">{formData.email}</p>
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full mb-6 flex items-center">
              ✓ Cuenta activa
            </span>

            <nav className="w-full flex flex-col space-y-2">
              <Link to="/perfil" className="text-left px-4 py-2 bg-red-50 text-red-600 font-medium rounded-md">👤 Mis datos</Link>
              <Link to="/seguridad" className="text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md">🛡️ Seguridad</Link>
              <Link to="/mis-viajes" className="text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-md">🚌 Mis viajes</Link>
            </nav>
            
            <div className="w-full mt-6 pt-4 border-t">
              <button className="flex items-center text-red-600 hover:underline w-full px-2 text-sm font-medium">
                <span className="mr-2">🚪</span> Cerrar sesión
              </button>
            </div>
          </aside>

          {/* Área Principal */}
          <main className="col-span-1 md:col-span-3 space-y-6">
            <form onSubmit={handleSubmit} className="bg-white shadow-sm border rounded-lg p-6">
              <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">👤 Datos personales</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nombres</label>
                  <input type="text" name="nombres" value={formData.nombres} onChange={handleChange} className="w-full border rounded p-2" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Apellidos</label>
                  <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full border rounded p-2" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Cédula</label>
                  <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} className="w-full border rounded p-2" required />
                </div>
              </div>

              <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">📞 Datos de contacto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Correo electrónico</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border rounded p-2" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Teléfono / WhatsApp</label>
                  <div className="flex">
                    <span className="bg-gray-50 border border-r-0 rounded-l p-2 text-gray-600">+593</span>
                    <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full border rounded-r p-2" required />
                  </div>
                </div>
              </div>
              <div className="mb-6 p-3 bg-blue-50 text-blue-800 text-sm rounded-md flex items-start">
                <span className="mr-2">ℹ️</span> Usaremos estos datos para enviarte tus boletos y avisos del viaje.
              </div>

              <div className="flex justify-start space-x-4 border-t pt-6">
                <button type="submit" className="bg-red-600 text-white font-bold py-2 px-6 rounded hover:bg-red-700">
                  💾 Guardar cambios
                </button>
                <button type="button" className="border border-gray-300 text-gray-700 font-bold py-2 px-6 rounded hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </form>

            <div className="bg-white shadow-sm border rounded-lg p-6 flex flex-col md:flex-row justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-blue-900 flex items-center">🔒 Contraseña</h2>
                <p className="text-gray-600 text-sm mt-1">Actualiza tu contraseña para proteger tu cuenta.</p>
              </div>
              <button type="button" className="mt-4 md:mt-0 border border-gray-300 text-blue-900 font-bold py-2 px-6 rounded hover:bg-gray-50 flex items-center">
                🔒 Cambiar contraseña
              </button>
            </div>

            <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-md flex items-start">
              <span className="mr-2">ℹ️</span> Tus datos se usarán para completar tus próximas compras.
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}