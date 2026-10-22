# Mapa de asientos: cómo leer el mock

Archivo de ejemplo: docs/api/mapa-asientos.mock.json

## Paradas
Cada parada se identifica por su `orden` en la ruta (ruta_paradas.orden), que
empieza en 1. La reserva guarda origen_orden y destino_orden con esos números.
El nombre de la ciudad no es un identificador.

## Celdas y ocupaciones
- Cada celda es una posición de la grilla (piso, fila, columna). Solo las de
  tipo ASIENTO se pueden reservar; PASILLO y BLOQUE son decorativas.
- Todos los IDs son UUID.
- `ocupaciones` lista los rangos reservados del asiento en este viaje.

## Disponibilidad
Para un recorrido origen o -> destino d, el asiento está ocupado si alguna
ocupación cumple origen_orden < d y destino_orden > o.

Ejemplo con el asiento 2 (ocupado de la parada 1 a la 2, Ambato -> Latacunga):
- 1 -> 2 (Ambato -> Latacunga): ocupado.
- 2 -> 3 (Latacunga -> Quito): libre.
- 1 -> 3 (Ambato -> Quito): ocupado, porque usa el tramo 1 -> 2.

## Clases de asiento
El mock usa NORMAL y EJECUTIVO. Los códigos reales de la tabla clases_asiento
se confirman con el equipo según las vistas aprobadas.

## Pendiente
- Qué estados de reserva_asientos cuentan como ocupados (hoy solo se conoce RETENIDO).
- Una retención vencida (expires_at pasado) no cuenta como ocupación.