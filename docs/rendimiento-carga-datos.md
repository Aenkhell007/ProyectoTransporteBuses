# Optimización de carga de datos - 18/11/2026

## Cambios

- Lecturas independientes agrupadas en una consulta PostgreSQL para contexto de operación, administración de identidades, perfil de sesión, resumen de administrador, editor de buses/planos y configuración de pagos.
- El contexto de operación permite pedir solo las colecciones que usa cada pantalla. Mantiene el contexto completo como opción predeterminada para consumidores existentes y propuestas del servidor.
- Listado de políticas y sus reglas en una consulta, eliminando dos lecturas adicionales por cada versión. Se conserva la revisión estable que valida edición/publicación.
- Pool: conserva al menos una conexión abierta tras usarla y descarta las adicionales tras 60 segundos ociosas, frente a los 10 anteriores. Activa keepAlive y prepara una conexión al iniciar el servidor. Mantiene el límite de cinco conexiones y verificación TLS. Los fallos de conexiones ociosas se registran sin credenciales y el pool las retira.
- GET idénticos comparten únicamente la petición pendiente. No se almacenan respuestas terminadas; escrituras y login/logout invalidan las lecturas compartidas. Peticiones con señales propias no comparten cancelación.
- Se evita consultar otra vez el mismo ámbito al sincronizar cooperativaId en la URL.
- Páginas cargadas por demanda y límites Suspense dentro de los layouts para conservar cabecera y navegación.
- Catálogos públicos simultáneos comparten la consulta pendiente. Al terminar vuelve a consultarse la base.

## Medición comparativa real

Misma base Supabase, conexión abierta, ámbito real de Gran Continental bajo RLS, dos ejecuciones por caso. Antes y después se alternaron para reducir el sesgo de red. Se compararon campos y valores normalizando representaciones ISO de fechas. Las sesiones temporales se revirtieron mediante ROLLBACK.

| Lectura backend | Antes (ms) | Después (ms) |
|---|---|---|
| Contexto cooperativa completo | 4714 / 2649 | 288 / 211 |
| Perfil y permisos | 519 / 1184 | 215 / 321 |
| Administración de usuarios (incluye permiso admin) | 1388 / 1541 | 527 / 747 |
| Datos y plano de bus | 1461 / 1625 | 207 / 217 |

El arranque real se verificó además en un puerto temporal con envíos desactivados: API y base conectadas; health 267 ms y los endpoints HTTP de ciudades/destinos/filtros 211-282 ms, con conexión preparada. No se guardaron cambios ni se enviaron mensajes.

Son tiempos de las funciones de lectura, no tiempos completos de página ni una prueba de carga concurrente. La conexión inicial, la validación de sesión/transacción, HTTP, renderizado e Internet añaden tiempo. Las cifras varían con la red y no son un SLA.

El JavaScript principal compilado pasó de aproximadamente 891,6 KB (235,2 KB gzip) a 311,1 KB (97,9 KB gzip), sin contar chunks compartidos. El resto se descarga según la página visitada. La compilación ya no genera un chunk principal mayor de 500 KB.

## Seguridad y datos actuales

La agrupación usa la misma conexión y transacción de sesión. Los valores SQL siguen parametrizados y las tablas siguen bajo sus políticas RLS. No se usa otra conexión privilegiada para acelerar lecturas. Se conserva el chequeo de permisos antes del contexto administrativo.

No se cachean respuestas terminadas de asientos, precios, compras, comprobantes ni permisos. No se modificaron roles, datos comerciales, migraciones, credenciales ni envíos externos. Las pruebas reales usan datos sintéticos o sesiones temporales dentro de transacciones revertidas.

## Verificación

- TypeScript backend y compilación frontend.
- 44 pruebas unitarias backend; 68 frontend (42 TS y 26 MJS), incluyendo frescura de datos, aislamiento de claves, escrituras y reintentos.
- 43 vistas en escritorio/móvil con API simulada (86 casos), más accesos indebidos, sesión vencida, cambio de cooperativa y conteo de solicitudes.
- Las cuatro integraciones PostgreSQL (configuración de pagos, operación, identidades y editores) pasaron con rollback. Operación verifica también todos los contextos reducidos, campos omitidos, vista inválida y denegación al cliente.

Ejecutar desde la raíz, con Node y dependencias instalados:

~~~powershell
npm --prefix backend run check:api
npm --prefix backend test
node backend/node_modules/tsx/dist/cli.mjs --tsconfig frontend/tsconfig.json --test frontend/tests/*.test.ts
node --test frontend/tests/*.test.mjs
npm --prefix frontend run build
~~~

Las pruebas de navegador se describen en frontend/tests/e2e/README.md. Las integraciones reales requieren acceso privado a la base y se ejecutan una por una, nunca en paralelo porque comparten operaciones de roles/bloqueos reversibles.

## Uso local

Reiniciar el backend para tomar el nuevo pool y las consultas. Vite recarga el frontend automáticamente; si se usa la compilación, volver a construir. Con Docker: docker compose up --build -d. No se realizó commit ni push como parte de esta optimización.

La primera carga sigue dependiendo de Internet y de la ubicación de Supabase. Para producción, medir también con datos representativos y usuarios concurrentes, usando frontend compilado y backend alojado cerca de la base. No se promete espera cero ni que todos los escenarios estén cubiertos al 100%.
