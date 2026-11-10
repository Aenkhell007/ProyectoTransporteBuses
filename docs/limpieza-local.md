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


## Revisión del 16/11/2026

- Se centralizaron los pictogramas en `frontend/src/components/ui/IconoBiblioteca.tsx`, con importaciones individuales de Font Awesome Free. Se retiraron los trazos duplicados de los componentes anteriores conservando sus interfaces, títulos accesibles y clases de tamaño y color. Véase `iconos-terceros.md`.
- Se eliminó `frontend/src/components/flota/seat-map.css`: no tenía importaciones ni referencias a sus clases en la aplicación, pruebas o documentación activa.
- Se retiraron `bcrypt`, `jsonwebtoken` y sus paquetes de tipos del backend: no tenían consumidores en el código ni en los scripts. La autenticación vigente utiliza las funciones criptográficas de Node y las sesiones de PostgreSQL.
- El análisis de importaciones desde la entrada del frontend y sus pruebas no encontró pantallas TypeScript desconectadas. Se conservaron las rutas de vista previa utilizadas y las herramientas de base de datos.
- Los archivos personales sin versionar y los datos privados permanecen fuera del commit. No se modifica el esquema ni los datos de PostgreSQL en esta limpieza.

## Limpieza de cierre de las 43 vistas

Se verificó el grafo de importaciones desde `frontend/src/main.tsx` y todas las pruebas TypeScript/MJS antes de retirar estos nueve archivos sin consumidores:

- `frontend/src/components/frecuencias/ParadasTarifasManager.tsx`
- `frontend/src/features/pagos/reembolsoDemo.ts`
- `frontend/src/mocks/frecuencias.mock.ts`
- `frontend/src/mocks/paradasTarifas.ts`
- `frontend/src/mocks/reembolso.ts`
- `frontend/src/pages/administracion/ParadasTarifasPage.tsx`
- `frontend/src/pages/frecuencias/FrecuenciasPage.tsx`
- `frontend/src/pages/operacion/HojaRutaPage.tsx`
- `frontend/src/types/pagos/reembolso.ts`

Se desinstaló `@zxing/browser`, añadido durante la exploración de abordaje y sin consumidores: Personal del bus y el lector QR pertenecen a la segunda entrega. Se conservan el generador del QR del boleto y la carga del QR bancario. No se borraron scripts personales, comprobantes, boletos privados, variables de entorno ni datos de la base. Git conserva el historial para recuperar código retirado.
