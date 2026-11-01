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

## Cómo probar cada pantalla
Las pantallas no tienen ruta registrada para no tocar App.tsx. Para verlas, agregar
temporalmente en frontend/src/App.tsx el import de la página y una ruta antes de path="*", y
levantar la aplicación con `npm run dev` dentro de frontend. No subir ese cambio.

| Página | Ruta de prueba | Qué comprobar |
|---|---|---|
| BusesPage | /flota/buses | Placa repetida y de formato inválido, desactivar y ver desactivados |
| PlanoEditorPage | /flota/plano-editor | Pintar, borrar, renumerar y cambiar pisos |
| PlanosBusPage | /flota/planos-bus | Plano en uso solo lectura y crear nueva versión |
| SeleccionAsientosPage | /asientos?viaje_id=...&origen_orden=2&destino_orden=3&cantidad=1 | Límite por pasajeros, tramo y errores con &simular=conflicto, invalido o red |

Verificación general: `npm run build` dentro de frontend (incluye la revisión de tipos).

## Reglas de la base que aplica el módulo
- Un plano usado por un viaje no cancelado no se edita (tg_plano_inmutable): se crea una
  versión nueva.
- Una celda de plano es ASIENTO, PASILLO o BLOQUE; piso de 1 a 3 y columna de 1 a 12. Un
  ASIENTO lleva código y clase; el código no se repite dentro del plano.
- El mapa de un viaje viene de plano_disponible, con estado por celda: DISPONIBLE, OCUPADO,
  RESERVADO o SELECCIONADO.
- La sobreventa la impide la base (reservar_asientos y una restricción EXCLUDE), no el
  frontend: la pantalla solo informa.
- Escribir en la flota exige el permiso flota.admin, que tiene el rol COOPERATIVA.

## Dependencias
- Servidor Express (pendiente): sin él no hay conexión real.
- Pasajeros y reserva de Kevin: la reserva simulada compartida y la ruta /asientos.
- Matías: efecto de publicar un plano, códigos HTTP de los errores y alcance de ADMIN_SISTEMA.

## Pendiente
- Conectar los servicios a la API real cuando exista el servidor.
- Edición de un bus y carga de fotos.
- Distribución Normal y Ejecutivo de las vistas aprobadas.