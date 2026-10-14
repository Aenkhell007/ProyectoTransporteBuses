# Módulo de compra de KT

Este módulo implementa el flujo de compra del pasajero definido en PGCS v1.4:

1. Buscar viajes por origen, destino y fecha.
2. Consultar el detalle de paradas y tarifas.
3. Registrar pasajeros, incluyendo pasajeros invitados.
4. Seleccionar asientos disponibles por tramo.
5. Crear una reserva temporal y mostrar el resumen de compra.

## Dependencias de integración

- **Benjamín:** contrato de búsqueda, destinos, fechas, paradas y tarifas.
- **Mikel:** pisos, tipos de asiento y ocupación por tramo.
- **Matías:** identidad del usuario y pasajeros invitados.
- **Ángel:** estado de reserva, total calculado por servidor, vencimiento y pago.

Los contratos se mantienen en `docs/api` y los datos simulados en `mocks/kt`. El
frontend no debe inferir disponibilidad: el backend debe verificarla de forma
transaccional antes de confirmar una reserva.
