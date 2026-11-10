import { useState } from 'react';
import SeatMap from '../../components/flota/SeatMap';
import { mapaAsientosMock } from '../../mocks/mapaAsientos';

export default function MapaAsientosDemo() {
  const { paradas, celdas } = mapaAsientosMock;
  const [origen, setOrigen] = useState(1);
  const [destino, setDestino] = useState(3);
  const [seleccion, setSeleccion] = useState<string[]>([]);

  const cambiarOrigen = (valor: number) => {
    setOrigen(valor);
    if (destino <= valor) setDestino(valor + 1);
  };

  const codigos = celdas
    .filter((c) => seleccion.includes(c.id))
    .map((c) => c.codigo)
    .join(', ');

  return (
    <div className="seat-map-demo">
      <h2>Mapa de asientos (datos simulados)</h2>
      <p>
        <label>
          Origen:{' '}
          <select value={origen} onChange={(e) => cambiarOrigen(Number(e.target.value))}>
            {paradas.slice(0, -1).map((p) => (
              <option key={p.orden} value={p.orden}>{p.nombre}</option>
            ))}
          </select>
        </label>{' '}
        <label>
          Destino:{' '}
          <select value={destino} onChange={(e) => setDestino(Number(e.target.value))}>
            {paradas.filter((p) => p.orden > origen).map((p) => (
              <option key={p.orden} value={p.orden}>{p.nombre}</option>
            ))}
          </select>
        </label>
      </p>
      <SeatMap mapa={mapaAsientosMock} origen={origen} destino={destino} onChange={setSeleccion} />
      <p>Asientos elegidos: {codigos || 'ninguno'}</p>
    </div>
  );
}