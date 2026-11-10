export default function AltaUsuarioForm() {
  return (
    <div className="p-6 max-w-3xl mx-auto bg-white shadow rounded-lg mt-6 border-t-4 border-blue-900">
      <h1 className="text-2xl font-bold text-blue-900 mb-2">Nuevo usuario</h1>
      <p className="text-gray-600 mb-6">Crea un usuario para una cooperativa existente y asigna sus permisos.</p>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <input type="text" placeholder="Nombres" className="border p-2 rounded bg-gray-50" />
        <input type="text" placeholder="Apellidos" className="border p-2 rounded bg-gray-50" />
        <input type="text" placeholder="Cédula" className="border p-2 rounded bg-gray-50" />
        <input type="email" placeholder="Correo electrónico" className="border p-2 rounded bg-gray-50" />
        <select className="border p-2 rounded col-span-2 bg-gray-50">
          <option>Seleccionar Rol (Ej. Oficinista)</option>
        </select>
      </div>

      <h3 className="font-bold text-blue-900 mb-4 border-b pb-2">Permisos del usuario</h3>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <label className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 text-green-600" /> 
          <span className="text-sm font-medium">Vender boletos</span>
        </label>
        <label className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 text-green-600" /> 
          <span className="text-sm font-medium">Revisar comprobantes</span>
        </label>
      </div>

      <div className="flex justify-end space-x-4 border-t pt-4">
        <button className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">Cancelar</button>
        <button className="px-6 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Crear usuario y enviar invitación</button>
      </div>
    </div>
  );
}
