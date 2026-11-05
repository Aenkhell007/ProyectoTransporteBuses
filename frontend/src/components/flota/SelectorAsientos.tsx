import { useEffect, useMemo, useState } from 'react';
import type { EstadoCelda, MapaViaje } from '../../types/mapaViaje';
import './selector-asientos.css';

interface SelectorAsientosProps {
  mapa: MapaViaje;
  /** Cantidad de pasajeros: máximo de asientos que se pueden elegir. */
  cantidad: number;
  onChange?: (asientoIds: string[]) => void;
}

const TEXTO_ESTADO: Record<EstadoCelda, string> = {
  DISPONIBLE: 'libre',
  SELECCIONADO: 'retenido por ti',
  RESERVADO: 'reservado',
  OCUPADO: 'ocupado',
};

export default function SelectorAsientos({ mapa, cantidad, onChange }: SelectorAsientosProps) {
  const [seleccion, setSeleccion] = useState<string[]>([]);

  // Solo se puede elegir un asiento que el servidor marca como DISPONIBLE.
  const libres = useMemo(
    () =>
      new Set(
        mapa.celdas
          .filter((c) => c.tipo === 'ASIENTO' && c.estado === 'DISPONIBLE')
          .map((c) => c.id),
      ),
    [mapa],
  );

  // Si cambia el mapa o la cantidad, se quitan los asientos que ya no sirven y se avisa
  // al componente padre.
  useEffect(() => {
    const vigentes = seleccion.filter((id) => libres.has(id)).slice(0, cantidad);
    if (vigentes.length !== seleccion.length) {
      setSeleccion(vigentes);
      onChange?.(vigentes);
    }
  }, [libres, cantidad, seleccion, onChange]);

  const alternar = (id: string) => {
    let nueva = seleccion;
    if (seleccion.includes(id)) nueva = seleccion.filter((s) => s !== id);
    else if (seleccion.length < cantidad) nueva = [...seleccion, id];
    if (nueva === seleccion) return;
    setSeleccion(nueva);
    onChange?.(nueva);
  };

  const pisos = Array.from(new Set(mapa.celdas.map((c) => c.piso))).sort((a, b) => a - b);

  return (
    <div className="selector-asientos">
      <p className="selector-asientos__contador">
        Elegidos: {seleccion.length} de {cantidad}
      </p>
      <div className="selector-asientos__pisos">
        {pisos.map((piso) => {
          const celdas = mapa.celdas.filter((c) => c.piso === piso);
          const columnas = Math.max(...celdas.map((c) => c.columna), 1);
          return (
            <section key={piso}>
              <h3>Piso {piso}</h3>
              <div
                className="selector-asientos__grilla"
                style={{ gridTemplateColumns: `repeat(${columnas}, 2.5rem)` }}
              >
                {celdas.map((c) => {
                  const posicion = { gridRow: c.fila, gridColumn: c.columna };
                  if (c.tipo !== 'ASIENTO') {
                    return (
                      <div
                        key={c.id}
                        className={`selector-asientos__celda selector-asientos__celda--${c.tipo.toLowerCase()}`}
                        style={posicion}
                      />
                    );
                  }
                  const elegido = seleccion.includes(c.id);
                  const bloqueado = !libres.has(c.id) || (!elegido && seleccion.length >= cantidad);
                  const visual = elegido
                    ? 'elegido'
                    : c.estado === 'DISPONIBLE'
                      ? 'libre'
                      : c.estado.toLowerCase();
                  const ejecutivo = c.clase === 'EJECUTIVO' ? ' selector-asientos__asiento--ejecutivo' : '';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={bloqueado}
                      onClick={() => alternar(c.id)}
                      className={`selector-asientos__celda selector-asientos__asiento selector-asientos__asiento--${visual}${ejecutivo}`}
                      style={posicion}
                      aria-label={`Asiento ${c.codigo}, ${c.clase ?? ''}, ${
                        elegido ? 'elegido' : TEXTO_ESTADO[c.estado]
                      }`}
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
      <ul className="selector-asientos__leyenda">
        <li><span className="selector-asientos__muestra selector-asientos__muestra--libre" /> Libre</li>
        <li><span className="selector-asientos__muestra selector-asientos__muestra--elegido" /> Elegido</li>
        <li><span className="selector-asientos__muestra selector-asientos__muestra--reservado" /> Reservado u ocupado</li>
        <li><span className="selector-asientos__muestra selector-asientos__muestra--ejecutivo" /> Ejecutivo</li>
      </ul>
    </div>
  );
}