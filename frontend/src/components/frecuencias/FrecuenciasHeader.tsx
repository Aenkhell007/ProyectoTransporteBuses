import React from 'react';

interface FrecuenciasHeaderProps {
  totalFrecuencias?: number;
  onNuevaFrecuencia?: () => void;
}

export const FrecuenciasHeader: React.FC<FrecuenciasHeaderProps> = ({
  totalFrecuencias = 0,
  onNuevaFrecuencia,
}) => {
  return (
    <header className="bg-[#F7F7F7] p-6 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">
          Frecuencias ANT y Paradas
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Catálogo de horarios autorizados, resoluciones ANT y paradas permitidas ({totalFrecuencias} registradas).
        </p>
      </div>
      <button
        type="button"
        onClick={onNuevaFrecuencia}
        className="bg-[#C8102E] text-white px-4 py-2 rounded-md font-medium hover:opacity-90 transition"
      >
        + Registrar Frecuencia
      </button>
    </header>
  );
};
