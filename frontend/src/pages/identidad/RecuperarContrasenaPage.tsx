import { Link } from 'react-router';

export default function RecuperarContrasenaPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-full flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border-t-4 border-red-600">
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-2">Recuperar contraseña</h2>
          <p className="text-center text-gray-600 mb-6 text-sm">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
              <input type="email" className="mt-1 w-full border rounded-md p-2" placeholder="nombre@correo.com" />
            </div>
            <button type="submit" className="w-full bg-red-600 text-white p-2 rounded-md font-bold hover:bg-red-700">
              Enviar enlace
            </button>
          </form>
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-md text-center">
            Por seguridad, si el correo está registrado, recibirás instrucciones para recuperar tu acceso.
          </div>
          <div className="mt-6 flex flex-col space-y-2 text-center text-sm text-gray-600">
            <Link to="/iniciar-sesion" className="hover:underline">← Volver a iniciar sesión</Link>
            <span>¿No tienes una cuenta? <Link to="/registrarse" className="text-red-600 font-bold hover:underline">Regístrate</Link></span>
          </div>
        </div>
      </div>
    </div>
  );
}
