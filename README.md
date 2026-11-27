# Gran Continental: venta de pasajes de buses interprovinciales

Aplicación web para comprar pasajes de bus entre ciudades de Ecuador. El cliente busca un viaje, elige asientos, registra a los pasajeros, paga por transferencia subiendo el comprobante y, cuando la cooperativa aprueba el pago, descarga un boleto PDF con código QR. El personal de cada cooperativa administra buses, planos de asientos, frecuencias, tarifas y la revisión de comprobantes.

Proyecto grupal de la asignatura Manejo y Configuración del Software, cuarto semestre paralelo "B", carrera de Software, Facultad de Ingeniería en Sistemas, Electrónica e Industrial (FISEI), Universidad Técnica de Ambato. Período julio a diciembre de 2026. Docente: Ing. MSc. Santiago David Jara Moya.

Los requisitos y las vistas numeradas salen del Documento Maestro V3 del 16/10/2026, de 355 páginas; las 163 primeras son la versión vigente. <!-- PENDIENTE: dónde lo puede consultar el docente (enlace o carpeta compartida). -->

## Auditoría local del 16/11/2026

La revisión de las 43 referencias, las correcciones de roles/sesión, el reembolso real del cliente y los límites de las integraciones externas están en [Auditoría de vistas](docs/auditoria-43-vistas-2026-11-16.md). Incluye una matriz por vista y comandos de comprobación.

## Estado al 14/11/2026

`develop` incorpora la integración de Pablo del PR #143. Los paneles de administración y oficina usan servicios reales para resumen, reservas, comprobantes, revisión, reembolsos y venta presencial. Ver [integración de Pablo](docs/oficina/integracion-pablo.md).

La limpieza local retiró implementaciones reemplazadas y archivos sin uso. Ver [informe de limpieza](docs/limpieza-local.md). Las funcionalidades pendientes de otros módulos siguen indicadas en sus pantallas y documentación.

## Módulos y responsables

| Módulo | Vistas del documento maestro | Rutas en `App.tsx` | Responsable |
|---|---|---|---|
| Compra del cliente | 1, 1.1, 2, 4, 5, 9, 9.1 | `/`, `/viajes`, `/pasajeros`, `/resumen`, `/mis-viajes` | Kevin Balseca (KT) |
| Flota y asientos | 3.1, 3.2, 11.4, 16, 16.1, 19 | `/asientos` | Mikel Guzmán |
| Reservas, pagos y boletos | 6, 7, 7.1, 8, 9.2, 19.1, 19.1.1 | `/pago`, `/pago/comprobante`, `/pago/seguimiento`, `/pago/confirmacion`, `/mis-viajes/reembolso`; `/vista-previa/panel/configuracion` (solo desarrollo, vistas 19.1 y 19.1.1 desde #104; `/vista-previa/configuracion/pagos` redirige ahí) | Ángel Galarza |
| Identidad y administración | 0.1, 0.2, 0.3, 10, 11.2, 20, 20.1, 20.2 | `/registrarse`, `/iniciar-sesion`, `/activar-cuenta`, `/reenviar-activacion`, `/recuperar-contrasena`, `/restablecer-contrasena`, `/mi-cuenta` | Matías Mena |
| Operación | 11.1, 11.3, 15, 17, 18, 19.2 y 19.3; paradas y tarifas (ADM06) | `/panel/cooperativas`, `/panel/reportes`, `/cooperativa`, `/cooperativa/frecuencias`, `/cooperativa/hoja-ruta`, `/cooperativa/configuracion/tarifas`, `/cooperativa/configuracion/tarifas/politica` | Benjamín Basurto |
| Oficina y panel de administración | 11, 12.x, 13, 14 | `/panel`, `/oficina`, `/oficina/ventas`, `/oficina/reservas`, `/oficina/comprobantes`, `/oficina/comprobantes/:id`, `/oficina/reembolsos` | Pablo Yupa |

Las rutas `/vista-previa/*` se conservan solo en desarrollo para los ejemplos utilizados. Los paneles reales están en `/panel`, `/oficina` y `/cooperativa`. Las pantallas antiguas que no tenían ruta ni consumidores se retiraron en la limpieza del 14/11/2026.

La integración conectada de las vistas de Benjamín se documenta en [Operación](docs/benjamin/integracion-operacion.md).

El número de vista de cada módulo sale de la tabla de responsables del equipo; se confirma con el documento maestro. El detalle de cada módulo está en `docs/kt/`, `docs/angel/`, `docs/flota/` y `docs/benjamin/`. Quién hizo cada PR está en [CONTRIBUTING.md](CONTRIBUTING.md).

## Flujo de compra

1. Inicio: el cliente busca por origen, destino, fecha y número de pasajeros.
2. Resultados: elige un viaje publicado con plano y tarifa vigentes.
3. Asientos: al confirmar, el servidor crea una reserva pendiente y retiene los asientos hasta `expires_at`.
4. Pasajeros: una ficha por asiento. La categoría (Adulto, Niño, Tercera edad, Persona con discapacidad) solo aplica descuento si existe una regla vigente en la base.
5. Resumen: el servidor calcula la cotización en centavos; el cliente acepta una versión concreta.
6. Pago: el cliente elige una cuenta bancaria de la cooperativa y sube el comprobante (JPG, PNG o PDF de hasta 5 MB). La reserva pasa a EN REVISIÓN.
7. Revisión: personal con el permiso `pagos.revisar` en la cooperativa de esa reserva aprueba o rechaza.
8. Boleto: tras la aprobación (o confirmación automática con PayPhone) se emite un PDF con QR, visible en Mis viajes solo para la cuenta dueña de la reserva, junto con el botón oficial **Agregar a Google Wallet** para dispositivos Android.
9. Abordaje (RF11): el personal del bus o de la cooperativa valida el mismo QR (desde el PDF o Google Wallet) en `/abordaje` (o desde el menú del panel).

## Google Wallet y RF11

- **Google Wallet (Android):** ver [Guía gratuita y oficial de Google Wallet](docs/google-wallet-android.md) para configurar las credenciales RS256 (sin credenciales funciona en modo demostración).
- **Validación QR de abordaje (RF11):** disponible en `/abordaje`, `/panel/abordaje`, `/oficina/abordaje` y `/cooperativa/abordaje`.

## Tecnologías

| Capa | Herramientas y versión (de los `package.json`) |
|---|---|
| Frontend | React 19.3.1, React Router 7, Vite 8.3.4, TypeScript 6.0.3, Tailwind CSS 4.3.3 |
| Backend | Node.js 22.12.0 o superior, Express 5.3, tsx 4.23, pdfkit 0.20, qrcode 1.5, bcrypt 6, pg 8.23 |
| Base de datos | PostgreSQL en Supabase (esquema `transporte`), Prisma 7.10 para migraciones y cliente |
| Sesión | Cookie de sesión (`/api/health` informa `sesion-cookie`) |
| Correo | Brevo para activación de cuenta y recuperación de contraseña |
| Control de versiones | Git con Git Flow y pull requests en GitHub |

## Estructura de carpetas

```text
backend/
  src/auth/            registro, activación, inicio de sesión, recuperación
  src/compra/          19 rutas: catálogos, viajes, reservas, pasajeros, cotización, contacto, Mis viajes
  src/pagos/           comprobantes, revisión, boleto PDF/QR
  src/flota/           flota, planos, fotos y configuración
  src/oficina/         resumen, reservas, comprobantes, ventas y reembolsos
  src/server.ts        Express: autenticación, compra, pagos, oficina, flota y /api/health
  conexion-bd/         Prisma: schema.prisma, migraciones, scripts db:*
  .data/pagos/         comprobantes y boletos generados en local (no se versiona)
frontend/
  src/pages/           una carpeta por módulo (compra, flota, pagos, identidad, operacion...)
  src/components/      componentes por módulo y layout compartido
  src/layouts/         AdminLayout de los paneles del personal
  src/features/        servicios de API y reglas puras
  src/types/           tipos de los contratos de API
  tests/               pruebas con node:test
  public/images/       imágenes; las nuevas van en WebP de menos de 500 KB
shared/                tipos comunes entre frontend y backend (pagos.ts)
docs/                  contratos de API, guías de integración y documentación por módulo
```

Para actualizar un equipo existente, sigue [Actualizar y probar la integración](docs/actualizar-equipo.md).

## Instalación

Requisitos: Node.js 22.12.0 o superior y Git. No hace falta PostgreSQL local; el backend se conecta a la base compartida en Supabase.

```sh
git clone https://github.com/Aenkhell007/ProyectoTransporteBuses.git
cd ProyectoTransporteBuses
git switch develop
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend/conexion-bd ci
```

Si `npm ci` falla en Windows con `EPERM` o código -4048, hay un servidor de Vite o del backend abierto que bloquea `node_modules`. Se detiene y se repite.

### Variables de entorno

Cada integrante recibe los valores por un canal privado del equipo. Nunca se suben al repositorio; `.gitignore` excluye `.env`, `.env.*`, `*.local` y `certs/`. Las plantillas son `backend/.env.example`, `backend/conexion-bd/.env.example` y `frontend/.env.example`.

| Archivo | Variables | Uso |
|---|---|---|
| `backend/conexion-bd/.env` | `DATABASE_URL`, `DB_SSL`, `DB_SSL_CA_FILE` | Conexión del backend con el rol limitado `transporte_app` |
| `backend/conexion-bd/.env` | `DIRECT_URL` | Solo para quien aplica migraciones (`db:deploy`) |
| `backend/conexion-bd/certs/supabase-ca.crt` | | Certificado de la CA de Supabase para validar TLS |
| `backend/.env` | `PORT`, `FRONTEND_URL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | Servidor Express y correo |
| `frontend/.env.local` | `VITE_API_URL=/api` | Proxy de Vite hacia Express |

Las variables `VITE_*` llegan al navegador, así que ninguna credencial de base de datos o de Brevo va en ellas. `backend/.env` no lleva `DATABASE_URL` ni `DIRECT_URL`: el servidor carga ese archivo primero y un valor ahí reemplaza el correcto.

### Arranque

```sh
# DIRECT_URL falso solo para generar el cliente (prisma.config.ts lo lee aunque no se conecta)
DIRECT_URL=postgresql://x:x@127.0.0.1:1/x npm --prefix backend/conexion-bd run db:generate
npm --prefix backend/conexion-bd run db:comprobar   # debe mostrar rol transporte_app y esquema 1.0.0
npm --prefix backend run dev                         # terminal 1, http://127.0.0.1:3000/api/health
npm --prefix frontend run dev -- --port 5173         # terminal 2, http://127.0.0.1:5173/
```

En PowerShell, la primera línea es `$env:DIRECT_URL='postgresql://x:x@127.0.0.1:1/x'`, después `npm --prefix backend/conexion-bd run db:generate` y `Remove-Item Env:DIRECT_URL`.

Se usa `127.0.0.1` en lugar de `localhost` y el mismo puerto que dice `FRONTEND_URL`; con otro origen la cookie de sesión no viaja y el backend responde 403.

## Pruebas

Comprobaciones locales del 14/11/2026:

| Comando | Resultado |
|---|---|
| `npm --prefix frontend run build` | Compila con comprobación de variables y parámetros sin uso |
| `npm --prefix backend run check:api` | Tipos correctos |
| `npm --prefix backend/conexion-bd run check` | Tipos correctos |
| `node backend/node_modules/tsx/dist/cli.mjs --tsconfig frontend/tsconfig.json --test frontend/tests/*.test.*` | 56 pruebas aprobadas |
| `npm --prefix backend test` | 28 pruebas aprobadas |

Las pruebas contra PostgreSQL mantienen sus comandos separados (`test:pagos:db`, `test:activacion:db`, `test:editores:db`) y requieren configuración privada. La limpieza no ejecuta migraciones ni modifica los datos compartidos.

## Errores frecuentes

| Síntoma | Causa habitual |
|---|---|
| `PrismaConfigEnvError: DIRECT_URL` al generar el cliente | `prisma.config.ts` lee `DIRECT_URL` aun para `db:generate`; usar el valor falso de Arranque |
| `P1000` | Usuario o contraseña de la URL de conexión incorrectos |
| `ENOENT` o error TLS | Falta `certs/supabase-ca.crt` o la ruta en `DB_SSL_CA_FILE` |
| `EPERM` o -4048 en `npm ci` | Un proceso de Node abierto bloquea `node_modules` |
| 502 en `/api` | Express no está corriendo en `127.0.0.1:3000` |
| 403 al guardar | Sesión vencida, o `FRONTEND_URL` con otro puerto |
| 404 al descargar un boleto | El PDF se generó en el backend de otro integrante (`backend/.data/pagos`) |
| No aparecen viajes | Viaje sin publicar, sin plano o sin tarifa vigente para esa fecha |

## Documentación

- Contratos de API: `docs/api/compra-endpoints.md`, `docs/api/flota-endpoints.md`, `docs/api/mapa-asientos.md`
- Integración con datos reales: `docs/integracion-compra-real.md`, `docs/integracion-pagos-reales.md`, `docs/edicion-asientos-pasajeros.md`
- Activación de cuentas: `docs/activacion-cuentas.md`
- Base de datos: `backend/conexion-bd/README.md`, `backend/conexion-bd/GUIA_COMPLETA.md`, `docs/baseline-prisma.md`
- Módulos: `docs/kt/README.md`, `docs/angel/README.md`, `docs/flota/README.md`, `docs/benjamin/`
- Elementos de configuración: `docs/configuracion/inventario-ec.csv`
- Forma de trabajo con Git Flow: [CONTRIBUTING.md](CONTRIBUTING.md)
- Plantillas: `.github/ISSUE_TEMPLATE/tarea.md` y `.github/pull_request_template.md`
- Cita del repositorio: [CITATION.cff](CITATION.cff)

## Cómo citar

[CITATION.cff](CITATION.cff) tiene el título, el resumen, los 6 integrantes, el repositorio y la licencia en formato Citation File Format 1.2.0. GitHub muestra el botón "Cite this repository", con la cita en APA y BibTeX, cuando el archivo está en la rama por defecto (`main`); hasta `release/1.0.0` el archivo solo está en `develop`. La versión y la fecha de publicación se agregan con la etiqueta `v1.0.0`.

Cita en APA armada con los datos de `CITATION.cff`:

```text
Galarza Moreta, Á. G., Balseca Tumbaco, K. D., Guzmán Lescano, M. A., Mena Romero, M. X., Basurto Villalba, P. B., & Yupa Aguiar, P. D. (2026). Gran Continental: venta de pasajes de buses interprovinciales [Computer software]. https://github.com/Aenkhell007/ProyectoTransporteBuses
```

## Licencia

MIT. Copyright (c) 2026 Angel Giovanni Galarza Moreta. Ver [LICENSE](LICENSE).
