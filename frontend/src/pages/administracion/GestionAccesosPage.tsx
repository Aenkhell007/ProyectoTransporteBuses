export default function GestionAccesosPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Cooperativas, usuarios y roles</h1>
          <p className="text-gray-600">Registra cooperativas y asigna responsables con el acceso adecuado.</p>
        </div>
        <div className="space-x-3">
          <button className="bg-white border border-red-600 text-red-600 px-4 py-2 rounded font-medium hover:bg-red-50">+ Nueva cooperativa</button>
          <button className="bg-white border border-blue-600 text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50">+ Nuevo usuario</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 shadow rounded-lg border-t-4 border-blue-900">
          <h2 className="text-lg font-bold mb-4">Datos de la cooperativa</h2>
          <p className="text-sm text-gray-500">Selecciona una cooperativa del menú para ver o editar sus detalles.</p>
        </div>
        <div className="bg-white p-6 shadow rounded-lg border-t-4 border-blue-900">
          <h2 className="text-lg font-bold mb-4">Usuario responsable</h2>
          <p className="text-sm text-gray-500">Selecciona un usuario para gestionar sus accesos y estado.</p>
        </div>
      </div>
    </div>
  );
}
