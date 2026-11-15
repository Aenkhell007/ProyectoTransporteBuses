# Limpieza local del 14/11/2026

Se retiraron 46 archivos sin conexión con las entradas activas, las pruebas o las herramientas de conexión: pantallas anteriores de identidad/oficina/flota, servicios reemplazados, controladores y rutas del backend anterior, un esquema Prisma de dos modelos y una prueba vacía de Vitest. Los archivos retirados están enumerados en `archivos-retirados.json` dentro del respaldo externo.

Los originales retirados o modificados tienen un respaldo externo en el equipo donde se realizó la limpieza. Incluye los originales de los archivos modificados. El historial Git conserva los archivos versionados.

Se eliminó una ruta repetida de frecuencias y un import de React sin uso. Los chequeos TypeScript ahora rechazan variables y parámetros sin uso. `npm --prefix backend test` ejecuta las pruebas unitarias existentes en lugar de finalizar siempre con error.

Se conservan las rutas de vista previa todavía utilizadas, los mocks que cargan esas rutas, pruebas, migraciones, certificados, variables de entorno, comprobantes y boletos privados, archivos de imágenes y scripts locales del usuario. La limpieza no modifica la base compartida.

Comprobaciones:

```sh
npm --prefix frontend run build
npm --prefix backend run check:api
node backend/node_modules/tsx/dist/cli.mjs --tsconfig frontend/tsconfig.json --test frontend/tests/*.test.*
npm --prefix backend test
npm --prefix backend/conexion-bd run check
```

## Resultado de la verificación

- Frontend: build correcto.
- Backend y módulo Prisma: chequeos TypeScript correctos.
- Frontend: 56 pruebas aprobadas. Backend: 28 pruebas aprobadas.
- Dependencias locales del backend sincronizadas con package-lock.json; sharp disponible.
- PostgreSQL: conexión de lectura correcta con transporte_app.
- API /api/health: HTTP 200 y base conectada.
- Rutas de administración y oficina: HTTP 401 sin sesión, sin exponer datos.
- Frontend local activo en http://127.0.0.1:5173; el servidor anterior de 4192 se conserva. Backend en http://127.0.0.1:3000.

Estos chequeos no sustituyen una nueva prueba manual de cada flujo con las cuentas correspondientes. La limpieza se entrega mediante una rama y pull request; consulta el historial Git para recuperar versiones anteriores.
