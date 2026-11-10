import { useState } from "react";
import { validarPlanificacion } from "../../features/operacion/planificacion.rules";
import type {
  BusPlanificable,
  FrecuenciaPlanificable,
  AsignacionPlanificada,
  ResultadoPlanificacion,
} from "../../features/operacion/planificacion.types";

const frecuencia: FrecuenciaPlanificable = {
  id: "F-001",
  cooperativaId: "C-001",
  activa: true,
  gruposHabilitados: ["NORMAL"],
  tarifaConfigurada: true,
};

const buses: BusPlanificable[] = [
  {
    id: "BUS-101",
    cooperativaId: "C-001",
    grupoId: "NORMAL",
    activo: true,
    planoDisponible: true,
    diasDescanso: [],
  },
  {
    id: "BUS-102",
    cooperativaId: "C-001",
    grupoId: "NORMAL",
    activo: true,
    planoDisponible: true,
    diasDescanso: [],
  },
];

const asignaciones: AsignacionPlanificada[] = [
  {
    id: "ASIG-001",
    busId: "BUS-101",
    inicioISO: "2026-11-11T09:00:00-05:00",
    finISO: "2026-11-11T11:00:00-05:00",
    estado: "PUBLICADO",
  },
];

export default function HojaRutaPage() {
  const [busId, setBusId] = useState("BUS-101");
  const [inicio, setInicio] = useState("2026-11-11T08:00");
  const [fin, setFin] = useState("2026-11-11T10:00");
  const [resultado, setResultado] =
    useState<ResultadoPlanificacion | null>(null);

  function comprobar() {
    const bus = buses.find((b) => b.id === busId) ?? buses[0];

    const respuesta = validarPlanificacion(
      {
        frecuencia,
        bus,
        inicioISO: `${inicio}:00-05:00`,
        finISO: `${fin}:00-05:00`,
      },
      asignaciones,
      { margenMinutos: 30 }
    );

    setResultado(respuesta);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold mb-2">
        Planificacion operativa - Hoja de ruta
      </h1>

      <p className="text-gray-600 mb-6">
        Vista 18 - Validacion de asignaciones de buses
      </p>

      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-5">
          Nueva propuesta de asignacion
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            Bus
            <select
              className="border rounded p-2"
              value={busId}
              onChange={(e) => {
                setBusId(e.target.value);
                setResultado(null);
              }}
            >
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.id}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            Inicio
            <input
              type="datetime-local"
              className="border rounded p-2"
              value={inicio}
              onChange={(e) => {
                setInicio(e.target.value);
                setResultado(null);
              }}
            />
          </label>

          <label className="flex flex-col gap-2">
            Fin
            <input
              type="datetime-local"
              className="border rounded p-2"
              value={fin}
              onChange={(e) => {
                setFin(e.target.value);
                setResultado(null);
              }}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={comprobar}
          className="mt-6 bg-blue-700 text-white px-5 py-3 rounded"
        >
          Validar asignacion
        </button>

        {resultado && (
          <div
            role="status"
            className="mt-6 border rounded p-4"
          >
            <h3 className="font-semibold">
              {resultado.valida
                ? "Asignacion valida como borrador"
                : "Asignacion no valida"}
            </h3>

            {resultado.errores.length > 0 && (
              <ul className="mt-3 list-disc pl-5">
                {resultado.errores.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}

            {resultado.asignacionesEnConflicto.length > 0 && (
              <p className="mt-3">
                Conflictos:{" "}
                {resultado.asignacionesEnConflicto.join(", ")}
              </p>
            )}
          </div>
        )}

        <p className="mt-6 text-sm text-gray-500">
          Datos simulados. La validacion no publica viajes
          ni guarda cambios en PostgreSQL.
        </p>
      </section>
    </main>
  );
}
