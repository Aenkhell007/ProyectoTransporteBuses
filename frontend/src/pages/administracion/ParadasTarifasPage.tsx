import { ParadasTarifasManager } from "../../components/frecuencias/ParadasTarifasManager";
import {
  PARADAS_ORDENADAS_MOCK,
  TARIFAS_TRAMO_MOCK,
} from "../../mocks/paradasTarifas";

export default function ParadasTarifasPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">
        Administracion de paradas y tarifas
      </h1>
      <p className="mt-2 text-gray-600">
        ADM06 - Consulta de paradas autorizadas y tarifas por tramo.
      </p>

      <ParadasTarifasManager
        paradas={PARADAS_ORDENADAS_MOCK}
        tarifas={TARIFAS_TRAMO_MOCK}
      />

      <p className="mt-4 text-sm text-gray-500">
        Vista de demostracion con datos simulados.
        No modifica la base de datos.
      </p>
    </main>
  );
}
