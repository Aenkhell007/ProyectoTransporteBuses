export default function AltaCooperativaResponsableForm() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">Nueva cooperativa y responsable</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 shadow rounded-lg">
          <h2 className="font-bold text-blue-900 mb-4 border-b pb-2">Datos de la cooperativa</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Nombre comercial" className="w-full border p-2 rounded bg-gray-50" />
            <input type="text" placeholder="Razón social" className="w-full border p-2 rounded bg-gray-50" />
            <input type="text" placeholder="RUC" className="w-full border p-2 rounded bg-gray-50" />
            <input type="email" placeholder="Correo de contacto" className="w-full border p-2 rounded bg-gray-50" />
          </div>
        </div>

        <div className="bg-white p-6 shadow rounded-lg">
          <h2 className="font-bold text-blue-900 mb-4 border-b pb-2">Usuario responsable</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Nombres" className="w-full border p-2 rounded bg-gray-50" />
              <input type="text" placeholder="Apellidos" className="w-full border p-2 rounded bg-gray-50" />
            </div>
            <input type="text" placeholder="Cédula" className="w-full border p-2 rounded bg-gray-50" />
            <input type="email" placeholder="Correo" className="w-full border p-2 rounded bg-gray-50" />
            <select className="w-full border p-2 rounded bg-gray-50 text-gray-600">
              <option>Rol: Cooperativa</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-4">
        <button className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-100">Cancelar</button>
        <button className="px-6 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700">Crear cooperativa y responsable</button>
      </div>
    </div>
  );
}
