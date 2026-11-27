# Pruebas de interfaz de las 43 referencias

Estos cinco scripts usan Playwright y un frontend Vite en `http://127.0.0.1:5173`. Ejecutarlos desde la raíz del repositorio. No envían correos ni escriben datos reales: interceptan la API con fixtures sintéticos. Los tres primeros cubren las 43 vistas en escritorio y móvil (28 + 7 + 8). Los otros dos cubren accesos indebidos, expiración de sesión y selección de cooperativa.

Instala Playwright en tu entorno de pruebas o indica `PLAYWRIGHT_MODULE` con la ruta al módulo ya instalado. Si utilizas un navegador del sistema, indica su ejecutable mediante `BROWSER_EXECUTABLE`; de lo contrario se usa Chromium de Playwright. Crea la carpeta `tmp` si todavía no existe. Las capturas y resultados se guardan allí, fuera de Git.

```powershell
node frontend/tests/e2e/vistas-cliente-flota-oficina.cjs
node frontend/tests/e2e/vistas-operacion.cjs
node frontend/tests/e2e/vistas-identidad.cjs
node frontend/tests/e2e/roles-y-sesion.cjs
node frontend/tests/e2e/seleccion-cooperativa.cjs
```

La existencia de capturas no equivale a una prueba de conexión real. Las transacciones, RLS, propiedad de reservas y permisos se prueban por separado en `backend/src/*/*.db.test.ts`.


## Regresión de carga de datos

`node frontend/tests/e2e/rendimiento.cjs` comprueba que StrictMode y la sincronización del ámbito en la URL generan una sola consulta de sesión y contexto, y que cambiar de cooperativa consulta datos nuevos. Usa únicamente fixtures y latencia simulada.
