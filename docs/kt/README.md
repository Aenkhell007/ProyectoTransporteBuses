# Módulo de compra del cliente (KT)

Responsable: Kevin Balseca (KT). Estado: en desarrollo con datos simulados.
Issue padre: #36. Elemento de configuración: pendiente de asignar por el equipo.

## Alcance

Vistas del documento maestro V3 que corresponden a este módulo:

| Vista | Pantalla | Ruta propuesta |
|---|---|---|
| 1 y 1.1 | Inicio con búsqueda, servicios, destinos, sobre nosotros y contacto | `/` (anclas `#rutas`, `#servicios`, `#sobre-nosotros`, `#contacto`) |
| 2 | Resultados de búsqueda con filtros, orden y paginación | `/viajes` |
| 4 | Datos de pasajeros | `/pasajeros` |
| 5 | Resumen del viaje y descuentos | `/resumen` |
| 9 y 9.1 | Mis viajes: próximos e historial | `/mis-viajes` |

La selección de asientos (vistas 3.1 y 3.2) es de Mikel; el pago, el boleto y el
reembolso (vistas 6 a 8 y 9.2) son de Ángel.

## Flujo

1. Buscar viajes por origen, destino, fecha y cantidad de pasajeros (`buscar_viajes`).
2. Elegir un viaje y pasar a la selección de asientos con `viaje_id`, `origen_orden`, `destino_orden` y cantidad.
3. Al confirmar asientos se crea la reserva pendiente y se retienen los asientos (`reservar_asientos`).
4. Registrar un pasajero por asiento (`guardar_pasajero`) y cotizar (`cotizar`).
5. Revisar el resumen y aceptar la versión de la cotización (`aceptar_cotizacion`).
6. Continuar al pago (vista 6 de Ángel) con `reserva_id`.
7. Consultar las compras propias en Mis viajes (`v_mis_viajes`).

El contrato de cada ruta está en [`docs/api/compra-endpoints.md`](../api/compra-endpoints.md).

## Reglas del módulo

- El total lo calcula el servidor. El frontend muestra importes en centavos divididos entre 100 y nunca los envía como verdad.
- Los porcentajes de descuento, edades, tarifas e impuestos salen de las tablas `tarifas`, `beneficios` e `impuestos`.
- La disponibilidad se vuelve a verificar en el servidor al reservar; la búsqueda solo informa.
- Las fechas se evalúan en `America/Guayaquil`; la edad del beneficio se calcula a la fecha de salida.
- Registrar un acompañante no crea una cuenta.
- Mis viajes muestra solo las compras de la sesión, no las encontradas por un correo o cédula escritos.

## Dependencias de integración

- **Benjamín:** viajes publicados, paradas ordenadas, tarifas por tramo y clase, beneficios.
- **Mikel:** mapa de asientos y ocupación por tramo; pantallas 3.1 y 3.2.
- **Matías:** sesión, usuario autenticado y perfil; esquema de la base.
- **Ángel:** vista 6 que recibe la reserva; estados de pago y boleto para Mis viajes.

## Organización en el frontend

- `frontend/src/pages/compra/` y `frontend/src/pages/mis-viajes/`: páginas.
- `frontend/src/components/compra/`: componentes reutilizables (búsqueda, tarjeta de viaje, ficha de pasajero, resumen, desglose de precios, pestañas).
- `frontend/src/features/compra/`: servicios de API y reglas puras (validaciones, formato de dinero y fechas).
- `frontend/src/types/compra/`: tipos del contrato.
- `frontend/src/mocks/compra/`: datos simulados mientras no exista el servidor.

## Historial del documento

- 14/10/2026: primera versión (rama `feature/6-compra-kt`, contratos JSON en inglés).
- 22/10/2026: alineado con la base real y con la convención del contrato de flota (#37).
