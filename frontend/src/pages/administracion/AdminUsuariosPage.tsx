import React, { useState } from 'react';

export default function AdminUsuariosPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const usuarios = [
    { id: 1, nombre: 'Ana Torres', email: 'ana.torres@example.com', rol: 'Cooperativa', cooperativa: 'Gran Continental', estado: 'Activo' },
    { id: 2, nombre: 'Carlos Ruiz', email: 'carlos.ruiz@example.com', rol: 'Oficinista', cooperativa: 'Gran Continental', estado: 'Activo' },
    { id: 3, nombre: 'Ángel Matías', email: 'angel.matias@example.com', rol: 'Cliente', cooperativa: 'Sin asignación', estado: 'Activo' },
    { id: 4, nombre: 'Luis Vera', email: 'luis.vera@example.com', rol: 'Cooperativa', cooperativa: 'Amazonas', estado: 'Inactivo' },
  ];

  const openModal = (user: any) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-blue-900">Usuarios y roles</h1>
            <p className="text-gray-600">Gestiona usuarios, roles y permisos del sistema.</p>
          </div>
          <button className="bg-red-600 text-white px-4 py-2 rounded-md font-bold hover:bg-red-700 flex items-center">
            <span className="mr-2">+</span> Nuevo usuario
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm text-gray-600 mb-1">Buscar por nombre o correo</label>
            <input type="text" placeholder="🔍 Nombre o correo electrónico..." className="w-full border rounded p-2" />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm text-gray-600 mb-1">Rol</label>
            <select className="w-full border rounded p-2"><option>Todos</option></select>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm text-gray-600 mb-1">Cooperativa</label>
            <select className="w-full border rounded p-2"><option>Todas</option></select>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm text-gray-600 mb-1">Estado</label>
            <select className="w-full border rounded p-2"><option>Todos</option></select>
          </div>
        </div>

        {/* Tabla principal */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-blue-50 text-blue-900">
              <tr>
                <th className="p-4 font-bold">Usuario</th>
                <th className="p-4 font-bold">Rol</th>
                <th className="p-4 font-bold">Cooperativa</th>
                <th className="p-4 font-bold">Estado</th>
                <th className="p-4 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{u.nombre}</div>
                    <div className="text-gray-500 text-xs">{u.email}</div>
                  </td>
                  <td className="p-4 text-gray-700">{u.rol}</td>
                  <td className="p-4 text-gray-700">{u.cooperativa}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.estado === 'Activo' ? '● Activo' : '● Inactivo'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button className="border border-gray-300 px-3 py-1 rounded text-gray-700 hover:bg-gray-50">✏️ Editar</button>
                    <button onClick={() => openModal(u)} className="border border-gray-300 px-3 py-1 rounded text-blue-700 hover:bg-blue-50">🛡️ Permisos</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Paginación */}
          <div className="p-4 border-t flex justify-between items-center text-sm text-gray-600 bg-gray-50">
            <span>ℹ️ Los permisos se asignan según el rol y la cooperativa.</span>
            <div className="flex items-center gap-4">
              <span>1 - 4 de 4</span>
              <div className="flex gap-1">
                <button className="px-2 py-1 border rounded bg-white text-gray-400 cursor-not-allowed">{'<'}</button>
                <button className="px-2 py-1 border rounded bg-white text-gray-400 cursor-not-allowed">{'>'}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Permisos */}
        {showModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-blue-900 flex items-center"><span className="mr-2">⚙️</span> Permisos del usuario seleccionado</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800 font-bold text-xl">×</button>
              </div>
              
              <div className="mb-6 p-4 bg-gray-50 rounded border">
                <div className="font-bold text-lg">{selectedUser.nombre}</div>
                <div className="text-gray-600 text-sm mb-2">{selectedUser.email}</div>
                <div className="flex gap-4 text-sm mt-2">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">Rol: {selectedUser.rol}</span>
                  <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded">Cooperativa: {selectedUser.cooperativa}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-start gap-3">
                  <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-green-600" />
                  <div>
                    <div className="font-bold text-gray-900">Venta</div>
                    <div className="text-xs text-gray-500">Puede realizar ventas de pasajes</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 text-green-600" />
                  <div>
                    <div className="font-bold text-gray-900">Revisar comprobantes</div>
                    <div className="text-xs text-gray-500">Puede validar y revisar comprobantes de pago</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 w-4 h-4 text-green-600" />
                  <div>
                    <div className="font-bold text-gray-900">Publicar viajes</div>
                    <div className="text-xs text-gray-500">Puede publicar y gestionar viajes en la plataforma</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 w-4 h-4 text-green-600" />
                  <div>
                    <div className="font-bold text-gray-900">Administrar cooperativas</div>
                    <div className="text-xs text-gray-500">Puede gestionar cooperativas y sus configuraciones</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button onClick={() => setShowModal(false)} className="bg-red-600 text-white font-bold py-2 px-6 rounded hover:bg-red-700">
                  💾 Guardar permisos
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}