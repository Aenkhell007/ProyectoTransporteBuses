import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import SelectorAsientos from '../../components/flota/SelectorAsientos';
import { ErrorCompra, erroresPorCampo, mensajeDeError } from '../../features/compra/errores';
import { simularPlanoDisponible } from '../../mocks/mapaViaje';
import { simularReserva } from '../../mocks/reservaAsientos';
import type { ModoSimulacion, RespuestaReserva } from '../../mocks/reservaAsientos';

function entero(valor: string | null, porDefecto: number) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
}

function modoDe(valor: string | null): ModoSimulacion {
  return valor === 'conflicto' || valor === 'invalido' || valor === 'red' ? valor : 'ok';
}

export default function SeleccionAsientosPage() {
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const viajeId = parametros.get('viaje_id') ?? '00000000-0000-4000-8000-000000000101';
  const origen = entero(parametros.get('origen_orden'), 1);
  const destino = entero(parametros.get('destino_orden'), 3);
  const cantidad = entero(parametros.get('cantidad'), 2);
  const modo = modoDe(parametros.get('simular'));

  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [reserva, setReserva] = useState<RespuestaReserva | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [detalles, setDetalles] = useState<string[]>([]);
  const [hayConflicto, setHayConflicto] = useState(false);
  // Al cambiar esta versión, el selector se vuelve a montar y su selección se limpia.
  const [versionMapa, setVersionMapa] = useState(0);

  const mapa = useMemo(() => simularPlanoDisponible(origen, destino), [origen, destino]);
  const tramoValido = destino > origen;

  const alCambiar = useCallback((ids: string[]) => {
    setSeleccion(ids);
    setReserva(null);
    setMensajeError(null);
  }, []);

  const codigos = mapa.celdas
    .filter((c) => seleccion.includes(c.id))
    .map((c) => c.codigo)
    .join(', ');

  const confirmar = async () => {
    setEnviando(true);
    setReserva(null);
    setMensajeError(null);
    setDetalles([]);
    setHayConflicto(false);
    try {
      const respuesta = await simularReserva(
        {
          viaje_id: viajeId,
          origen_orden: origen,
          destino_orden: destino,
          asiento_ids: seleccion,
        },
        modo,
      );
      setReserva(respuesta);
      navegar(`/pasajeros?reserva_id=${respuesta.reserva_id}`);
    } catch (error) {
      setMensajeError(mensajeDeError(error));
      setDetalles(Object.values(erroresPorCampo(error)));
      setHayConflicto(error instanceof ErrorCompra && error.status === 409);
    } finally {
      setEnviando(false);
    }
  };

  // En la versión real esto vuelve a pedir el mapa; aquí se limpia la selección.
  const actualizarDisponibilidad = () => {
    setVersionMapa((v) => v + 1);
    setSeleccion([]);
    setMensajeError(null);
    setHayConflicto(false);
  };

  return (
    <div className="seleccion-asientos-pagina">
      <h2>Selección de asientos (datos simulados)</h2>
      <p>
        Tramo: parada {origen} → parada {destino} · Pasajeros: {cantidad}
      </p>
      {tramoValido ? (
        <SelectorAsientos
          key={`${origen}-${destino}-${versionMapa}`}
          mapa={mapa}
          cantidad={cantidad}
          onChange={alCambiar}
        />
      ) : (
        <p>El tramo no es válido: el destino debe ser posterior al origen.</p>
      )}
      <p>Asientos elegidos: {codigos || 'ninguno'}</p>
      <button
        type="button"
        className="seleccion-asientos-pagina__confirmar"
        disabled={enviando || seleccion.length !== cantidad}
        onClick={confirmar}
      >
        {enviando ? 'Reservando...' : 'Confirmar asientos'}
      </button>

      {mensajeError && (
        <div className="seleccion-asientos-pagina__error" role="alert">
          <p>{mensajeError}</p>
          {detalles.length > 0 && (
            <ul>
              {detalles.map((detalle) => (
                <li key={detalle}>{detalle}</li>
              ))}
            </ul>
          )}
          {hayConflicto && (
            <button type="button" onClick={actualizarDisponibilidad}>
              Actualizar disponibilidad
            </button>
          )}
        </div>
      )}

      {reserva && (
        <div className="seleccion-asientos-pagina__exito" role="status">
          <p>
            Reserva creada. Los asientos quedan retenidos hasta las{' '}
            {new Date(reserva.expires_at).toLocaleTimeString('es-EC', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </p>
          <p>Reserva: {reserva.reserva_id}</p>
        </div>
      )}
    </div>
  );
}