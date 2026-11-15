# Módulo de flota y asientos

Responsable: Mikel. La API activa está en `backend/src/flota/router.ts` y `editorRouter.ts`. Las pantallas conectadas están en `frontend/src/pages/mikel/EditoresConectados.tsx`; usan los servicios `features/flota/editorApi.ts`.

## Rutas actuales

- `/cooperativa/buses`: listado de buses autorizado.
- `/cooperativa/buses/:id`: editor conectado de bus y plano.
- `/cooperativa/frecuencias/grupos`: compatibilidades habilitadas.
- `/cooperativa/configuracion`: identidad de la cooperativa.
- `/asientos`: selección de asientos de un viaje del flujo de compra.

Los ejemplos de desarrollo utilizados se mantienen en `/vista-previa/cooperativa/*` y `/vista-previa/flota/*`. Las páginas anteriores sin rutas, mocks y servicios reemplazados se retiraron en la limpieza del 14/11/2026; su versión original está en Git y en el respaldo local.

## Componentes vigentes

- `components/flota/EditorBus.tsx`, `PlanoEditor.tsx` y `GruposHabilitadosEditor.tsx`.
- `components/flota/SelectorAsientos.tsx` y `pages/flota/SeleccionAsientosPage.tsx`.
- `features/flota/plantillasPlano.ts` y sus pruebas.
- `pages/flota/BusesPage.tsx` y `PlanosBusPage.tsx`: ejemplos utilizados en desarrollo.

## Reglas

Los planos utilizados por viajes se versionan; la base evita la sobreventa. La selección y disponibilidad dependen de la API y del tramo. Los permisos de flota y cooperativa se validan en el servidor.

## Verificación y contratos

`npm --prefix frontend run build`, `npm --prefix backend run check:api` y `npm --prefix backend test`. Consultar [integración del backend](integracion-backend-mikel.md), [endpoints de flota](../api/flota-endpoints.md) y [contrato de compra](../api/compra-endpoints.md).
