# Módulo de compra del cliente (KT)

Responsable: Kevin Balseca (KT, `Balseca-Kevin`). Issue padre: #36.
Elemento de configuración: <!-- PENDIENTE: ID del inventario; lo asigna Ángel. --> pendiente de asignar.

Estado al 16/11/2026 (`develop` en `2610ce4`, merge de #146 del 16/11/2026): las 7 vistas del módulo tienen ruta y usan la API real desde #84 y #85. Este documento reemplaza la tabla del 03/11/2026, que describía datos simulados.

## Vistas

| Vista | Pantalla | Ruta | Archivo | Origen |
|---|---|---|---|---|
| 1 y 1.1 | Inicio con búsqueda, servicios, destinos, sobre nosotros y contacto | `/` (anclas `#rutas`, `#servicios`, `#sobre-nosotros`, `#contacto`) | `frontend/src/pages/compra/InicioPage.tsx` | #40, #83, #84 |
| 2 | Resultados con filtros, orden y más resultados por cursor | `/viajes` | `frontend/src/pages/compra/ResultadosPage.tsx` | #42, #84 |
| 4 | Datos de los pasajeros, una ficha por asiento | `/pasajeros?reserva_id=` | `frontend/src/pages/compra/PasajerosPage.tsx` | #51, #81, #84, #85 |
| 5 | Resumen del viaje, descuentos y aceptación de la cotización | `/resumen?reserva_id=` | `frontend/src/pages/compra/ResumenCompraPage.tsx` | #53, #84, #85 |
| 9 y 9.1 | Mis viajes: próximos e historial | `/mis-viajes` | `frontend/src/pages/mis-viajes/MisViajesPage.tsx` | #55, #79, #84, #128, #129 |

Las vistas 3.1 y 3.2 (selección de asientos, `/asientos`) son de Mikel. Las vistas 6, 7, 7.1, 8 y 9.2 (pago, comprobante, seguimiento, confirmación y reembolso) son de Ángel.

## Issues abiertos del módulo

#88 a #93 (vistas 1, 2, 4 y 5) se fusionaron en `develop` con #112 (`cb543ef`).

| Issue | Vista | Estado |
|---|---|---|
| #94 Monto reportado en Mis viajes | 9 | Opción b fusionada con #128 (`9e75ced`, aprobado por Ángel): la tarjeta muestra el importe esperado. Falta cerrar el issue |
| #95 Código legible en reservas en verificación | 9 | Opción b fusionada con #129 (`52de9ad`): `codigoCorto` en `features/compra/codigo.ts`. Ángel no dejó revisión en #129. Falta cerrar el issue |
| #96 Política de privacidad enlazada | 1.1 | Espera #121 (Matías): texto y versión de la política. Sin respuesta al 16/11/2026 |
| #97 Canales de contacto reales | 1.1 y 2 | Espera #120 (Ángel) y #122 (Mikel). `GET /api/configuracion/cooperativa` (#118) exige sesión de la cooperativa y no sirve para el inicio público. Sin respuesta al 16/11/2026 |
| #119 Historial por pasajero | 9 y 9.1 | Espera la decisión del comité: `backend/src/compra/misViajes.ts` filtra por `cliente_id` y la RLS de `reservas` no deja ver la reserva a un pasajero que no compró. Sin respuesta al 16/11/2026 |
| #147 Pruebas de compra sin `DATABASE_URL` | 4 y 5 | PR #149 abierto |
| #148 Pruebas unitarias de las vistas 1, 1.1, 2, 4 y 5 | 1, 1.1, 2, 4 y 5 | PR #150 abierto |

## Flujo

1. Buscar por origen, destino, fecha y número de pasajeros: `GET /api/viajes` llama a `transporte.compra_buscar`.
2. Elegir un viaje y pasar a `/asientos` (Mikel) con `viaje_id`, `origen_orden`, `destino_orden`, `cantidad` y `plano_id`.
3. Al confirmar los asientos, `POST /api/reservas` crea la reserva pendiente (`reservar_asientos`) y la pantalla de Mikel navega a `/pasajeros?reserva_id=`.
4. `PUT /api/reservas/:id/pasajeros` guarda un pasajero por asiento y el contacto (`compra_guardar_pasajeros`); `POST /api/reservas/:id/cotizacion` cotiza (`cotizar`).
5. `/resumen` muestra la cotización del servidor. "Continuar al pago" envía `POST /api/reservas/:id/aceptar-cotizacion` con `{ version }`; si la versión cambió, el servidor responde 409 y la pantalla recarga la cotización.
6. `/pago?reserva_id=` es la vista 6 de Ángel.
7. `GET /api/mis-viajes` lista solo las reservas y compras de la sesión. Desde una tarjeta se abren `/pago`, `/pago/seguimiento`, `/pago/confirmacion` o `/mis-viajes/reembolso`, todas con `reserva_id`.
8. El oficinista revisa el comprobante en `/oficina/comprobantes/:id` (vista 13 de Pablo, #143), que llama a `POST /api/pagos/comprobantes/:id/revision`. Desde #143 el inicio de sesión lleva al oficinista a `/oficina`, al administrador a `/panel` y a la cooperativa a `/cooperativa`; una compra pendiente (`/pasajeros?reserva_id=`) se conserva.

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

Resultados del 16/11/2026 sobre `develop` en `2610ce4`. Las pruebas del frontend se ejecutan desde la raíz con `node backend/node_modules/tsx/dist/cli.mjs --tsconfig frontend/tsconfig.json --test frontend/tests/*.test.*`. `frontend/tsconfig.json` no incluye `frontend/tests`, así que `npm --prefix frontend run build` no revisa sus tipos.

| Archivo o comando | Vista | Qué cubre | Resultado |
|---|---|---|---|
| `frontend/tests/edicionPasajeros.test.ts` | 4 | Recuperación del borrador y categorías de pasajero | 3 de 3 |
| `frontend/tests/importeMiViaje.test.ts` | 9 | Importe esperado en verificación y total pagado (#94) | 3 de 3 |
| `frontend/tests/codigoCorto.test.ts` | 9 | Código de 8 caracteres de una reserva o compra (#95) | 3 de 3 |
| Todas las de `frontend/tests` | Todas | Las 11 que hay en `develop`, de todos los módulos | 56 de 56 |
| `npm --prefix backend test` | 4 y 5 en `compra.test.ts` | Validación de consultas y pasajeros, rutas HTTP de compra, y las pruebas de los demás módulos | 33 de 33 con `backend/conexion-bd/.env`; 30 de 31 en un clon sin `.env` |
| `npm --prefix frontend run build` | Todas | Tipos y compilación de las páginas | Correcto |

PR abiertos el 16/11/2026:

| PR | Issue | Qué agrega | Resultado en su rama |
|---|---|---|---|
| #149 | #147 | `backend/src/compra/entornoPrueba.ts`: `compra.test.ts` carga sin `DATABASE_URL` | `npm --prefix backend test` 33 de 33 en un clon sin `.env` |
| #150 | #148 | 54 pruebas: `compraBusqueda.test.ts` (vista 1, 13), `compraContacto.test.ts` (1.1, 7), `compraFiltros.test.ts` (2, 8), `compraPasajeros.test.ts` (4 y 14, 16) y `compraImportes.test.ts` (5, 10) | 110 de 110 en `frontend/tests` |

Las pruebas de #150 no escriben cédulas: las generan con el algoritmo de módulo 10, escrito aparte de `pasajeros.ts`.

El recorrido manual completo no se pudo hacer. El 16/11/2026, `GET /api/viajes` devolvió 0 viajes publicados en 882 consultas: los 42 pares de las 7 ciudades activas, con fechas del 16/11 al 06/12/2026. La hoja de ruta (vista 18) todavía no publica viajes por API y el repositorio no carga beneficios activos. La aprobación del comprobante ya se puede hacer desde la vista 13 (#143).

## Dependencias de integración

- Benjamín: viajes publicados, paradas ordenadas, tarifas por tramo y clase, beneficios.
- Mikel: mapa de asientos y ocupación por tramo; pantallas 3.1 y 3.2.
- Matías: sesión, usuario autenticado y perfil (`GET /api/compra/perfil`).
- Ángel: vista 6 que recibe la reserva; estados de pago y boleto para Mis viajes.

Archivos de KT que usan otras vistas (un cambio en ellos necesita la revisión del dueño de esas vistas, según `docs/comite-cambios.md`):

| Archivo de KT | Lo importa | Vista |
|---|---|---|
| `features/compra/reservaApi.ts` | `pages/flota/SeleccionAsientosPage.tsx` (Mikel) y `features/oficina/VentaOficinaReal.tsx` (Pablo, #143) | 3.1, 3.2 y 14 |
| `features/compra/pasajeros.ts` | `features/oficina/VentaOficinaReal.tsx` (Pablo, #143) | 14 |
| `features/compra/cliente.ts`, `errores.ts`, `dinero.ts` | `pages/flota/SeleccionAsientosPage.tsx` (Mikel) | 3.1 y 3.2 |
| `features/compra/fechas.ts` | `SeleccionAsientosPage.tsx` (Mikel) y `components/pagos/ResumenPago.tsx` (Ángel) | 3.1, 3.2 y 6 |
| `components/compra/Icono.tsx` | 9 archivos de `features/oficina/` y `AdminResumenPage.tsx` (Pablo, #143), `Login.tsx` y `RecuperarContrasena.tsx` (Matías), `SeleccionAsientosPage.tsx` (Mikel), `ConfirmacionCompra.tsx`, `SeguimientoPago.tsx` y `SolicitarReembolso.tsx` (Ángel) | 0.2, 0.3, 3.1, 3.2, 7.1, 8, 9.2, 11 a 14 |

`Icono.tsx` cambió dos veces sin pasar por KT: Pablo agregó `dinero`, `oficina` y `grafico` en `d8ddd76` (#143), y Matías lo reescribió en `98a7006` (#146) para que delegue en `components/ui/IconoBiblioteca.tsx`, con iconos de Font Awesome Free (`@fortawesome/free-solid-svg-icons` y `@fortawesome/free-brands-svg-icons` 7.3.1, atribución en `docs/iconos-terceros.md`). Los nombres de `NombreIcono` no cambiaron.

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
- 16/11/2026: #94 y #95 resueltos con #128 y #129, pruebas y PR #149 y #150, archivos de KT usados por otras vistas, cambios de `Icono.tsx` y estado de los bloqueos (#151).
