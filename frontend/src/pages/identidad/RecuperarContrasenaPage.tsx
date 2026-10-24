import { useState } from 'react';
import { Link } from 'react-router';

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Solicitando recuperación para:', email);
    // POST /api/auth/password/forgot
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Columna izquierda (oculta en móvil, visible en escritorio) */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-center px-16 bg-blue-50">
        <h1 className="text-5xl font-bold text-blue-900 mb-4 leading-tight">
          Vuelve a viajar<br />con nosotros
        </h1>
        <div className="flex space-x-4 text-sm font-medium text-blue-800 mb-8">
          <span className="flex items-center">✓ Compra tus pasajes</span>
          <span className="flex items-center">✓ Consulta tus viajes</span>
          <span className="flex items-center">✓ Guarda tus datos</span>
        </div>
      </div>

      {/* Columna derecha (Formulario) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-2">Recuperar contraseña</h2>
          <p className="text-center text-gray-600 mb-6 text-sm">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border rounded-md p-2" 
                placeholder="nombre@correo.com" 
                required
              />
            </div>
            <button type="submit" className="w-full bg-red-600 text-white p-2 rounded-md font-bold hover:bg-red-700">
              Enviar enlace
            </button>
          </form>

          <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-md flex items-start">
            <span className="mr-2">ℹ️</span>
            Por seguridad, si el correo está registrado, recibirás instrucciones para recuperar tu acceso.
          </div>

          <div className="mt-8 flex flex-col space-y-4 text-center text-sm">
            <Link to="/iniciar-sesion" className="text-gray-600 hover:text-gray-900 hover:underline">← Volver a iniciar sesión</Link>
            <span className="text-gray-600">¿No tienes una cuenta? <Link to="/registrarse" className="text-red-600 font-bold hover:underline">Regístrate</Link></span>
          </div>
        </div>
      </div>
    </div>
  );
}