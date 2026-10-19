import { useState } from 'react';
import type { MapaAsientos } from '../../types/flota';
import { asientoDisponible } from '../../utils/disponibilidad';
import './seat-map.css';

interface SeatMapProps {
  mapa: MapaAsientos;
  origen: number;
  destino: number;
  onChange?: (seleccion: string[]) => void;
}

export default function SeatMap({ mapa, origen, destino, onChange }: SeatMapProps) {
  const [seleccion, setSeleccion] = useState<string[]>([]);

  const alternar = (id: string) => {
    const nueva = seleccion.includes(id)
      ? seleccion.filter((s) => s !== id)
      : [...seleccion, id];
    setSeleccion(nueva);
    onChange?.(nueva);
  };

  const pisos = Array.from({ length: mapa.pisos }, (_, i) => i + 1);

  return (
    <div className="seat-map">
      {pisos.map((piso) => {
        const celdas = mapa.celdas.filter((c) => c.piso === piso);
        const columnas = Math.max(...celdas.map((c) => c.columna), 1);
        return (
          <section key={piso} className="seat-map__piso">
            <h3>Piso {piso}</h3>
            <div
              className="seat-map__grilla"
              style={{ gridTemplateColumns: `repeat(${columnas}, 2.5rem)` }}
            >
              {celdas.map((c) => {
                if (c.tipo !== 'ASIENTO') {
                  return (
                    <div
                      key={c.id}
                      className={`seat-map__celda seat-map__celda--${c.tipo.toLowerCase()}`}
                      style={{ gridRow: c.fila, gridColumn: c.columna }}
                    />
                  );
                }
                const libre = asientoDisponible(c, origen, destino);
                const elegido = seleccion.includes(c.id);
                const clase = mapa.clases.find((k) => k.id === c.clase_id);
                const estado = elegido ? 'elegido' : libre ? 'libre' : 'ocupado';
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!libre}
                    onClick={() => alternar(c.id)}
                    className={`seat-map__celda seat-map__asiento seat-map__asiento--${estado}`}
                    style={{ gridRow: c.fila, gridColumn: c.columna }}
                    aria-label={`Asiento ${c.codigo}, ${clase?.nombre ?? ''}, ${estado}`}
                    aria-pressed={elegido}
                  >
                    {c.codigo}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}