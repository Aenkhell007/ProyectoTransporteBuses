import React, { useState } from 'react';

export default function IniciarSesionPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí integraremos la llamada a la API POST /api/auth/login
  };

  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-2">Iniciar sesión</h2>
        <p className="text-gray-600 text-center mb-6">Accede a tu cuenta para gestionar tus viajes.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-red-500 focus:border-red-500"
              required 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-red-500 focus:border-red-500"
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500 mr-2" />
              Recordarme
            </label>
            <a href="/recuperar-contrasena" className="text-blue-600 hover:underline">¿Olvidaste tu contraseña?</a>
          </div>

          <button type="submit" className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 transition-colors">
            Iniciar sesión
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p>¿Aún no tienes una cuenta? <a href="/registrarse" className="text-red-600 font-bold hover:underline">Regístrate</a></p>
          <a href="/" className="block mt-4 text-gray-600 hover:underline">← Volver al inicio</a>
        </div>
      </div>
    </div>
  );
}