import SeatMap from '../../components/flota/SeatMap';
import { mapaAsientosMock } from '../../mocks/mapaAsientos';

export default function MapaAsientosDemo() {
  return (
    <div>
      <h2>Mapa de asientos (datos simulados): Ambato → Quito</h2>
      <SeatMap mapa={mapaAsientosMock} origen={1} destino={3} />
    </div>
  );
}