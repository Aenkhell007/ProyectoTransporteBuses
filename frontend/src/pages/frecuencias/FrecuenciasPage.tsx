import { filtrarFrecuencias } from "./filtrarFrecuencias";
import { useState } from "react";
import { FRECUENCIAS_ANT_MOCK } from "../../mocks/frecuencias.mock";
import type {
  EstadoFrecuencia,
  TipoViajeFrecuencia,
} from "../../types/frecuencia.types";

export default function FrecuenciasPage() {
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<"TODAS" | EstadoFrecuencia>("TODAS");
  const [tipo, setTipo] = useState<"TODOS" | TipoViajeFrecuencia>("TODOS");


    const frecuencias = filtrarFrecuencias(
    FRECUENCIAS_ANT_MOCK,
     busqueda,
    estado,
    tipo
    );


  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold mb-2">
        Gestión de frecuencias ANT
      </h1>
      <p className="text-gray-600 mb-6">
        Consulta de rutas, horarios y resoluciones autorizadas.
      </p>

      <section className="bg-white p-5 rounded-lg border">
        <div className="flex flex-wrap gap-4 mb-5">
          <input
            type="search"
            placeholder="Buscar ruta o resolución"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="border rounded p-2 flex-1"
            aria-label="Buscar frecuencias"
          />

          <select
            value={estado}
            onChange={(e) =>
              setEstado(e.target.value as "TODAS" | EstadoFrecuencia)
            }
            className="border rounded p-2"
            aria-label="Filtrar por estado"
          >
            <option value="TODAS">Todas</option>
            <option value="ACTIVA">Activas</option>
            <option value="INACTIVA">Inactivas</option>
          </select>


          <select
  value={tipo}
  onChange={(e) =>
    setTipo(e.target.value as "TODOS" | TipoViajeFrecuencia)
  }
  className="border rounded p-2"
  aria-label="Filtrar por tipo de viaje"
>
  <option value="TODOS">Todos los tipos</option>
  <option value="DIRECTO">Directos</option>
  <option value="CON_PARADAS">Con paradas</option>
</select>


<button
  type="button"
  onClick={() => {
    setBusqueda("");
    setEstado("TODAS");
    setTipo("TODOS");
  }}
  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
>
  Limpiar filtros
</button>

        </div>

        <p className="mb-3 text-sm text-gray-600">
          Mostrando {frecuencias.length} de {FRECUENCIAS_ANT_MOCK.length} frecuencias.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Resolución ANT</th>
                <th className="p-3">Origen</th>
                <th className="p-3">Destino</th>
                <th className="p-3">Salida</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {frecuencias.map((f) => (
                <tr key={f.id} className="border-b">
                  <td className="p-3">{f.numeroResolucion}</td>
                  <td className="p-3">{f.origen}</td>
                  <td className="p-3">{f.destino}</td>
                  <td className="p-3">{f.horaSalida}</td>
                  <td className="p-3">
                    {f.tipo === "DIRECTO" ? "Directo" : "Con paradas"}
                  </td>
                  <td className="p-3">
                    {f.estado === "ACTIVA" ? "Activa" : "Inactiva"}
                  </td>
                </tr>
              ))}
              {frecuencias.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    No se encontraron frecuencias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Datos simulados. Pendiente de conexión con el backend.
        </p>
      </section>
    </main>
  );
}
