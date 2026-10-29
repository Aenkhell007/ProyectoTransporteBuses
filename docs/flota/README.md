# Módulo de flota y asientos (EC-004)

Responsable: Mikel. Estado: en desarrollo con datos simulados; el servidor Express todavía no
existe, así que las pantallas no llaman a ninguna API.

## Alcance
- CRUD de buses con desactivación (no se elimina: activo = false).
- Editor visual del plano de un bus (hasta 3 pisos y 12 columnas) y sus versiones.
- Mapa y selección de asientos para el flujo de compra (vistas 3.1 y 3.2).
- Servicios del frontend que consumen la API de flota según el contrato.

## Archivos (frontend/src)
| Pieza | Archivos |
|---|---|
| Buses | types/bus.ts, mocks/buses.ts, utils/validarBus.ts, components/flota/BusForm.tsx, pages/flota/BusesPage.tsx |
| Editor de plano | types/plano.ts, mocks/clasesAsiento.ts, utils/plano.ts, components/flota/PlanoEditor.tsx, pages/flota/PlanoEditorPage.tsx |
| Versiones de plano | types/versionesPlano.ts, mocks/versionesPlano.ts, utils/versionesPlano.ts, pages/flota/PlanosBusPage.tsx |
| Mapa de asientos | types/flota.ts, mocks/mapaAsientos.ts, utils/disponibilidad.ts, components/flota/SeatMap.tsx |
| Selección de asientos | types/mapaViaje.ts, mocks/mapaViaje.ts, mocks/reservaAsientos.ts, components/flota/SelectorAsientos.tsx, pages/flota/SeleccionAsientosPage.tsx |
| Servicios de API | services/http.ts, services/mapaApi.ts, services/busesApi.ts, services/planosApi.ts, services/disponibilidadApi.ts |

Algunas piezas están en pull requests en revisión y pueden no estar todavía en develop.

## Documentación relacionada
- Contrato de API: docs/api/flota-endpoints.md
- Mapa de asientos de ejemplo: docs/api/mapa-asientos.mock.json y docs/api/mapa-asientos.md
- Contrato de compra (KT): docs/api/compra-endpoints.md