export default function PerfilPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-900 mb-2">Mi perfil</h1>
      <p className="text-gray-600 mb-6">Consulta y actualiza tus datos personales y de contacto.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Menú lateral */}
        <aside className="col-span-1 bg-white p-4 shadow rounded-lg h-fit">
          <nav className="flex flex-col space-y-2">
            <button className="text-left p-2 bg-red-50 text-red-600 font-medium rounded">Mis datos</button>
            <button className="text-left p-2 text-gray-700 hover:bg-gray-100 rounded">Seguridad</button>
            <button className="text-left p-2 text-gray-700 hover:bg-gray-100 rounded">Mis viajes</button>
            <button className="text-left p-2 text-red-500 mt-4 border-t pt-4">Cerrar sesión</button>
          </nav>
        </aside>

        {/* Formularios principales */}
        <main className="col-span-2 space-y-6">
          <section className="bg-white p-6 shadow rounded-lg">
            <h2 className="text-xl font-bold text-blue-900 mb-4">Datos personales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600">Nombres</label>
                <input type="text" className="w-full border rounded p-2 mt-1" defaultValue="Ángel Matías" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Apellidos</label>
                <input type="text" className="w-full border rounded p-2 mt-1" defaultValue="Galarza" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-600">Cédula</label>
                <input type="text" className="w-full border rounded p-2 mt-1" defaultValue="1723456789" />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 shadow rounded-lg">
            <h2 className="text-xl font-bold text-blue-900 mb-4">Datos de contacto</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600">Correo electrónico</label>
                <input type="email" className="w-full border rounded p-2 mt-1" defaultValue="angel.galarza@example.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Teléfono / WhatsApp</label>
                <input type="tel" className="w-full border rounded p-2 mt-1" defaultValue="+593 99 123 4567" />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Guardar cambios</button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
