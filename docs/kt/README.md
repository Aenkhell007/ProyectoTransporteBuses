# Módulo de compra del cliente (KT)

Responsable: Kevin Balseca (KT, `Balseca-Kevin`). Issue padre: #36.
Elemento de configuración: <!-- PENDIENTE: ID del inventario; lo asigna Ángel. --> pendiente de asignar.

Estado al 10/11/2026 (`develop` en `cb543ef`): las 7 vistas del módulo tienen ruta y usan la API real desde #84 y #85. Este documento reemplaza la tabla del 03/11/2026, que describía datos simulados.

## Vistas

| Vista | Pantalla | Ruta | Archivo | Origen |
|---|---|---|---|---|
| 1 y 1.1 | Inicio con búsqueda, servicios, destinos, sobre nosotros y contacto | `/` (anclas `#rutas`, `#servicios`, `#sobre-nosotros`, `#contacto`) | `frontend/src/pages/compra/InicioPage.tsx` | #40, #83, #84 |
| 2 | Resultados con filtros, orden y más resultados por cursor | `/viajes` | `frontend/src/pages/compra/ResultadosPage.tsx` | #42, #84 |
| 4 | Datos de los pasajeros, una ficha por asiento | `/pasajeros?reserva_id=` | `frontend/src/pages/compra/PasajerosPage.tsx` | #51, #81, #84, #85 |
| 5 | Resumen del viaje, descuentos y aceptación de la cotización | `/resumen?reserva_id=` | `frontend/src/pages/compra/ResumenCompraPage.tsx` | #53, #84, #85 |
| 9 y 9.1 | Mis viajes: próximos e historial | `/mis-viajes` | `frontend/src/pages/mis-viajes/MisViajesPage.tsx` | #55, #79, #84 |

Las vistas 3.1 y 3.2 (selección de asientos, `/asientos`) son de Mikel. Las vistas 6, 7, 7.1, 8 y 9.2 (pago, comprobante, seguimiento, confirmación y reembolso) son de Ángel.

## Issues abiertos del módulo

#88 a #93 (vistas 1, 2, 4 y 5) se fusionaron en `develop` con #112 (`cb543ef`).

| Issue | Vista | Estado |
|---|---|---|
| #94 Monto reportado en Mis viajes | 9 | Espera a Ángel: de dónde sale el monto que reporta el cliente |
| #95 Código legible en reservas en verificación | 9 | Espera a Ángel: formato del código de una reserva sin compra |
| #96 Política de privacidad enlazada | 1.1 | Espera el texto y la versión de la política |
| #97 Canales de contacto reales | 1.1 y 2 | Espera el número de WhatsApp, el correo y las oficinas |

## Flujo

1. Buscar por origen, destino, fecha y número de pasajeros: `GET /api/viajes` llama a `transporte.compra_buscar`.
2. Elegir un viaje y pasar a `/asientos` (Mikel) con `viaje_id`, `origen_orden`, `destino_orden`, `cantidad` y `plano_id`.
3. Al confirmar los asientos, `POST /api/reservas` crea la reserva pendiente (`reservar_asientos`) y la pantalla de Mikel navega a `/pasajeros?reserva_id=`.
4. `PUT /api/reservas/:id/pasajeros` guarda un pasajero por asiento y el contacto (`compra_guardar_pasajeros`); `POST /api/reservas/:id/cotizacion` cotiza (`cotizar`).
5. `/resumen` muestra la cotización del servidor. "Continuar al pago" envía `POST /api/reservas/:id/aceptar-cotizacion` con `{ version }`; si la versión cambió, el servidor responde 409 y la pantalla recarga la cotización.
6. `/pago?reserva_id=` es la vista 6 de Ángel.
7. `GET /api/mis-viajes` lista solo las reservas y compras de la sesión. Desde una tarjeta se abren `/pago`, `/pago/seguimiento`, `/pago/confirmacion` o `/mis-viajes/reembolso`, todas con `reserva_id`.

`backend/src/compra/router.ts` tiene 19 rutas. El contrato está en [`docs/api/compra-endpoints.md`](../api/compra-endpoints.md). Las guías de instalación son [`docs/integracion-compra-real.md`](../integracion-compra-real.md) y [`docs/edicion-asientos-pasajeros.md`](../edicion-asientos-pasajeros.md).

## Reglas del módulo

- El total lo calcula el servidor. El frontend muestra los centavos divididos entre 100 y no envía importes.
- Los descuentos, edades, tarifas e impuestos salen de las tablas `tarifas`, `beneficios` e `impuestos`.
- Las categorías Adulto, Niño, Tercera edad y Persona con discapacidad son fijas (#85). Una categoría solo aplica descuento si existe una regla vigente en la base.
- La disponibilidad se vuelve a comprobar en el servidor al reservar; la búsqueda solo informa.
- Las fechas se evalúan en `America/Guayaquil`; la edad del beneficio se calcula a la fecha de salida.
- Registrar un acompañante no crea una cuenta.
- Mis viajes usa la sesión, no un correo ni una cédula escritos.

## Pruebas

| Comando | Qué cubre | Resultado el 10/11/2026 |
|---|---|---|
| `npm --prefix backend run test:compra` | Validación de pasajeros y rutas HTTP de compra | 3 de 3 |
| `node backend/node_modules/tsx/dist/cli.mjs --test frontend/tests/edicionPasajeros.test.ts` | Recuperación del borrador y categorías de pasajero | 3 de 3 |
| `npm --prefix frontend run build` | Compilación de las páginas | Correcto |

El recorrido manual completo (búsqueda hasta EN REVISIÓN) no se pudo hacer: del 08/11 al 11/11/2026 `GET /viajes` devolvió 0 viajes publicados en todas las rutas.

## Dependencias de integración

- Benjamín: viajes publicados, paradas ordenadas, tarifas por tramo y clase, beneficios.
- Mikel: mapa de asientos y ocupación por tramo; pantallas 3.1 y 3.2.
- Matías: sesión, usuario autenticado y perfil (`GET /api/compra/perfil`).
- Ángel: vista 6 que recibe la reserva; estados de pago y boleto para Mis viajes.

## Organización en el frontend

- `frontend/src/pages/compra/` y `frontend/src/pages/mis-viajes/`: páginas.
- `frontend/src/components/compra/`: búsqueda, tarjeta de viaje, filtros, ficha de pasajero, resumen del viaje, desglose de precios, pestañas y tarjeta de Mis viajes.
- `frontend/src/features/compra/`: cliente HTTP (`cliente.ts`), servicios de API y reglas puras (validaciones, dinero, fechas, fotos).
- `frontend/src/types/compra/`: tipos del contrato.
- `frontend/public/images/home/` y `frontend/public/images/destinos/`: 9 imágenes WebP del inicio, de 132 a 368 KB.

## Historial del documento

- 14/10/2026: primera versión (rama `feature/6-compra-kt`, contratos JSON en inglés).
- 22/10/2026: alineado con la base real y con la convención del contrato de flota (#37).
- 03/11/2026: estado de cada vista, rutas entre módulos y contrato 0.3.0 (#75).
- 06/11/2026: compra y Mis viajes pasan a la API real (#84).
- 10/11/2026: estado con #84 y #85 integrados, issues #88 a #97, pruebas e imágenes WebP (#111).
- 10/11/2026: #88 a #93 fusionados con #112 (#113).
