# Mapa de asientos: cómo leer el mock

Archivo de ejemplo: docs/api/mapa-asientos.mock.json

## Paradas
Cada parada se identifica por su `orden` en la ruta (ruta_paradas.orden), que
empieza en 1. La reserva guarda origen_orden y destino_orden con esos números.

## Celdas y ocupaciones
- Cada celda es una posición de la grilla (piso, fila, columna). Solo las de
  tipo ASIENTO se pueden reservar; PASILLO y BLOQUE son decorativas.
- `ocupaciones` lista los rangos reservados del asiento en este viaje.

## Disponibilidad
Para un recorrido origen o → destino d, el asiento está ocupado si alguna
ocupación cumple origen_orden < d y destino_orden > o.

Ejemplo con el asiento 2 (ocupado de la parada 1 a la 2, Ambato → Latacunga):
- 1 → 2: ocupado.
- 2 → 3 (Latacunga → Quito): libre.
- 1 → 3: ocupado, porque usa el tramo 1 → 2.