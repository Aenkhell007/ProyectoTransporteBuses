# Mapa de asientos: cómo leer el mock

Archivo de ejemplo: docs/api/mapa-asientos.mock.json

## Paradas y tramos
- Cada parada tiene `id` (identificador), `order` (posición en la ruta, desde 1)
  y `name`. El nombre de la ciudad NO es un identificador.
- Un tramo (`segments[].number`) conecta dos paradas consecutivas por ID.
  Los tramos se numeran desde 1 (no desde 0).

| Tramo | Desde (fromStopId) | Hasta (toStopId) |
|---|---|---|
| 1 | 1 (Ambato) | 2 (Latacunga) |
| 2 | 2 (Latacunga) | 3 (Quito) |

## occupiedSegments
Lista los números de tramo en los que el asiento está ocupado.
- `[]`: libre en todo el viaje.
- `[1]`: ocupado solo Ambato–Latacunga.
- `[2]`: ocupado solo Latacunga–Quito.
- `[1, 2]`: ocupado en todo el recorrido.

## Ejemplo
El asiento 2 tiene `occupiedSegments: [1]`: está ocupado de Ambato a Latacunga,
pero queda libre de Latacunga a Quito. Un pasajero que viaja Latacunga–Quito
puede elegirlo; uno que viaja Ambato–Quito no (tramo 1 ocupado).

## Cómo saber si un asiento está disponible
Dado originStopId y destinationStopId:
1. Se toman los tramos entre ambas paradas (según order).
2. El asiento está disponible solo si ninguno de esos tramos aparece en
   occupiedSegments.

Ejemplos con el asiento 2 ([1]):
- Ambato (1) → Latacunga (2): ocupado (tramo 1).
- Latacunga (2) → Quito (3): libre (tramo 2).
- Ambato (1) → Quito (3): ocupado (usa el tramo 1).

## Correspondencia con el contrato de reserva (KT)
- originStopId y destinationStopId de la reserva son los `id` de `stops`.
- Los IDs de parada deben coincidir con los de Stop del modelo de rutas
  (Benjamín). En este mock los valores 1, 2 y 3 son de ejemplo.