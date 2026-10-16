# Módulo de reservas, pagos y boletos — Ángel

Estado: propuesta para revisión del equipo.

## Alcance

- Gestionar el estado y vencimiento de la reserva.

- Calcular y validar el total en el servidor con las tarifas acordadas.

- Mostrar instrucciones de transferencia y recibir el comprobante.

- Consultar el estado de revisión del pago.

- Emitir boletos QR/PDF después de la aprobación, sin duplicarlos.

- Permitir la consulta y descarga de boletos autorizados.

## Integración

- KT: búsqueda, pasajeros, selección de asientos y resumen de compra.

- Mikel: estructura y disponibilidad de asientos por tramo.

- Benjamín: viajes, paradas y tarifas.

- Matías: identidad, permisos y esquema compartido.

- Pablo: revisión de comprobantes y venta presencial.

## Decisiones pendientes

- Resolver el orden de creación de pasajeros y reserva:

  booking.contract.json requiere passengerIds, mientras

  passengers.contract.json requiere bookingId.

- Acordar los estados de reserva, pago y boleto.

- Definir qué sucede con el vencimiento cuando hay un comprobante en revisión.

- Acordar contratos de carga, revisión de comprobantes y descarga de boletos.

- Confirmar el identificador del módulo en el inventario de configuración.

## Referencias

- docs/api/booking.contract.json en feature/6-compra-kt.

- docs/api/passengers.contract.json en feature/6-compra-kt.

- Issues relacionados: #3, #7 y #9.

