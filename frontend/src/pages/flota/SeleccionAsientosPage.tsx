import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import SelectorAsientos from '../../components/flota/SelectorAsientos';
import { simularPlanoDisponible } from '../../mocks/mapaViaje';

function entero(valor: string | null, porDefecto: number) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
}

export default function SeleccionAsientosPage() {
  const [parametros] = useSearchParams();
  const viajeId = parametros.get('viaje') ?? '00000000-0000-4000-8000-000000000101';
  const origen = entero(parametros.get('origen'), 1);
  const destino = entero(parametros.get('destino'), 3);
  const cantidad = entero(parametros.get('cantidad'), 2);

  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [cuerpo, setCuerpo] = useState<object | null>(null);

  const mapa = useMemo(() => simularPlanoDisponible(origen, destino), [origen, destino]);
  const tramoValido = destino > origen;

  const alCambiar = useCallback((ids: string[]) => {
    setSeleccion(ids);
    setCuerpo(null);
  }, []);

  const codigos = mapa.celdas
    .filter((c) => seleccion.includes(c.id))
    .map((c) => c.codigo)
    .join(', ');

  // Cuerpo de POST /reservas según docs/api/compra-endpoints.md. Todavía no se envía.
  const confirmar = () =>
    setCuerpo({
      viaje_id: viajeId,
      origen_orden: origen,
      destino_orden: destino,
      asiento_ids: seleccion,
    });

  return (
    <div className="seleccion-asientos-pagina">
      <h2>Selección de asientos (datos simulados)</h2>
      <p>
        Tramo: parada {origen} → parada {destino} · Pasajeros: {cantidad}
      </p>
      {tramoValido ? (
        <SelectorAsientos mapa={mapa} cantidad={cantidad} onChange={alCambiar} />
      ) : (
        <p>El tramo no es válido: el destino debe ser posterior al origen.</p>
      )}
      <p>Asientos elegidos: {codigos || 'ninguno'}</p>
            <button
        type="button"
        className="seleccion-asientos-pagina__confirmar"
        disabled={seleccion.length !== cantidad}
        onClick={confirmar}
      >
        Confirmar asientos
      </button>
      {cuerpo && (
        <>
          <h3>Cuerpo de POST /reservas (aún no se envía)</h3>
          <pre>{JSON.stringify(cuerpo, null, 2)}</pre>
        </>
      )}
    </div>
  );
}