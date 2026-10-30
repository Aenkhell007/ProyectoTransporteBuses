import React from 'react';
import { ParadaOrdenada, TarifaTramo } from '../../types/paradasTramos';

interface ParadasTarifasManagerProps {
  paradas: ParadaOrdenada[];
  tarifas: TarifaTramo[];
}

export const ParadasTarifasManager: React.FC<ParadasTarifasManagerProps> = ({
  paradas,
  tarifas,
}) => {
  return (
    <div className="bg-[#F7F7F7] p-6 rounded-lg border border-gray-200 mt-6">
      <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">
        Gestión de Paradas Ordenadas y Tarifas por Tramo (ADM06)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tabla de Paradas Ordenadas */}
        <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
          <h3 className="font-semibold text-[#1A1A1A] mb-3">Paradas Autorizadas en Ruta</h3>
          <ul className="space-y-2">
            {paradas.map((p) => (
              <li key={p.id} className="text-sm border-b pb-2 flex justify-between items-center">
                <span>
                  <strong>{p.orden}.</strong> {p.ciudad} ({p.tiempoEstimadoLlegada})
                </span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {p.habilitadaEmbarque ? 'Embarque' : ''} {p.habilitadaDesembarque ? 'Desembarque' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tabla de Tarifas por Tramo */}
        <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
          <h3 className="font-semibold text-[#1A1A1A] mb-3">Tarifas Vigentes por Tramo</h3>
          <ul className="space-y-2">
            {tarifas.map((t) => (
              <li key={t.id} className="text-sm border-b pb-2 flex justify-between items-center">
                <span>
                  {t.ciudadOrigen} → {t.ciudadDestino} ({t.clase})
                </span>
                <span className="font-bold text-[#C8102E]">${t.precioBase.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
