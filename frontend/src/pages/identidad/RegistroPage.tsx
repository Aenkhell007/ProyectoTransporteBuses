import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router';
import { authApi } from '../../services/authApi';

// Vista original de Matías (feature/frontend-identidad), conectada al servicio de registro.
const estadoInicial = {
  nombres: '', apellidos: '', cedula: '', email: '',
  telefono: '', password: '', confirmPassword: '', aceptaTerminos: false,
};

export default function RegistroPage() {
  const [formData, setFormData] = useState(estadoInicial);
  const [enviando, setEnviando] = useState(false);
  const ocupado = useRef(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (ocupado.current) return;
    setError('');
    setMensaje('');
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    let nacional = formData.telefono.replace(/[\s()-]/g, '');
    if (nacional.startsWith('+593')) nacional = nacional.slice(4);
    if (nacional.startsWith('0')) nacional = nacional.slice(1);
    if (!/^9\d{8}$/.test(nacional)) {
      setError('Ingresa un número celular ecuatoriano válido.');
      return;
    }
    ocupado.current = true;
    setEnviando(true);
    try {
      const resultado = await authApi.register({
        nombres: formData.nombres, apellidos: formData.apellidos,
        tipoDocumento: 'CEDULA', documento: formData.cedula,
        email: formData.email, telefono: '+593' + nacional,
        password: formData.password, aceptaTerminos: formData.aceptaTerminos,
      });
      setFormData({ ...estadoInicial });
      setMensaje(resultado.mensaje);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo crear la cuenta. Inténtalo de nuevo.');
    } finally {
      ocupado.current = false;
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center mb-2">Crear cuenta</h2>
        <p className="text-gray-600 text-center mb-8">Completa tus datos para registrarte en Gran Continental.</p>

        {mensaje ? <div role="status" className="rounded-md bg-green-50 p-4 text-green-900"><p>{mensaje}</p><Link to="/iniciar-sesion" className="mt-3 inline-block font-semibold underline">Ir a iniciar sesión</Link></div> : <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={enviando} className="space-y-4 disabled:opacity-70">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="registro-nombres" className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
              <input type="text" id="registro-nombres" name="nombres" maxLength={100} autoComplete="given-name" value={formData.nombres} onChange={handleChange} className="w-full border rounded-md p-2" required />
            </div>
            <div>
              <label htmlFor="registro-apellidos" className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
              <input type="text" id="registro-apellidos" name="apellidos" maxLength={100} autoComplete="family-name" value={formData.apellidos} onChange={handleChange} className="w-full border rounded-md p-2" required />
            </div>
          </div>

          <div>
            <label htmlFor="registro-cedula" className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
            <input type="text" id="registro-cedula" name="cedula" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} title="Ingresa los 10 dígitos de tu cédula." value={formData.cedula} onChange={handleChange} className="w-full border rounded-md p-2" required />
          </div>

          <div>
            <label htmlFor="registro-email" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input type="email" id="registro-email" name="email" maxLength={254} autoComplete="email" value={formData.email} onChange={handleChange} className="w-full border rounded-md p-2" required />
          </div>

          <div>
            <label htmlFor="registro-telefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-gray-50">+593</span>
              <input type="tel" id="registro-telefono" name="telefono" maxLength={20} autoComplete="tel-national" value={formData.telefono} onChange={handleChange} className="flex-1 w-full p-2 border rounded-r-md" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="registro-password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" id="registro-password" name="password" maxLength={128} autoComplete="new-password" value={formData.password} onChange={handleChange} className="w-full border rounded-md p-2" required minLength={8} />
            </div>
            <div>
              <label htmlFor="registro-confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <input type="password" id="registro-confirmPassword" name="confirmPassword" maxLength={128} autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} className="w-full border rounded-md p-2" required minLength={8} />
            </div>
          </div>

          <div className="flex items-center mt-4">
            <input type="checkbox" id="registro-aceptaTerminos" name="aceptaTerminos" checked={formData.aceptaTerminos} onChange={handleChange} className="w-4 h-4 text-red-600 rounded" required />
            <label htmlFor="registro-aceptaTerminos" className="ml-2 text-sm text-gray-700">Acepto los términos y condiciones y la política de privacidad.</label>
          </div>

          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button type="submit" disabled={enviando} className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 mt-6">
            {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </fieldset>
        </form>}
        
        <div className="mt-6 text-center text-sm">
          <p>¿Ya tienes una cuenta? <Link to="/iniciar-sesion" className="text-red-600 font-bold hover:underline">Inicia sesión</Link></p>
          <Link to="/" className="block mt-4 text-gray-600 hover:underline">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}