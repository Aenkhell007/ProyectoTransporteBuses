export default function AdminUsuariosPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-900 mb-2">Usuarios y roles</h1>
      <p className="text-gray-600 mb-6">Gestiona usuarios, roles y permisos del sistema.</p>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between mb-4">
          <input type="text" placeholder="Buscar por nombre o correo..." className="border p-2 rounded w-1/3" />
          <button className="bg-red-600 text-white px-4 py-2 rounded font-bold">+ Nuevo usuario</button>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 border-b">
              <th className="p-3">Usuario</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Cooperativa</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-3">
                <div className="font-bold">Ana Torres</div>
                <div className="text-sm text-gray-500">ana.torres@example.com</div>
              </td>
              <td className="p-3">Cooperativa</td>
              <td className="p-3">Gran Continental</td>
              <td className="p-3 text-green-600 font-medium">● Activo</td>
              <td className="p-3 space-x-2">
                <button className="text-blue-600 border border-blue-600 px-2 py-1 rounded text-sm">Editar</button>
                <button className="text-blue-600 border border-blue-600 px-2 py-1 rounded text-sm">Permisos</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
