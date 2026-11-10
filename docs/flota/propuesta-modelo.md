# Propuesta de modelo: Flota y mapa de asientos (EC-004)

## Bus
- id
- placa (única)
- marca
- chasis
- carrocería
- fotos
- cooperativa (relación)

## BusFloor
- id
- bus (relación)
- número de piso

## SeatType
- id
- nombre (Normal, VIP)

## Seat
- id
- piso (relación)
- número de asiento
- tipo (relación con SeatType)
- fila
- columna

## Restricciones
- El número de asiento es único por bus y piso.
- La placa es única.

## Pendiente de acordar con Matías
- Tipos de IDs, nombres, enums y relación bus-viaje.