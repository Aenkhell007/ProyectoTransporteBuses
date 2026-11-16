# Auditoría de las 43 vistas — 16/11/2026

## Alcance y evidencia

Se revisaron las 43 referencias PNG contra sus rutas oficiales. Son 43 variantes de vista, no 43 URLs diferentes: algunas son pestañas, diálogos o configuraciones del mismo editor. Personal del bus queda fuera del alcance solicitado.

La revisión de interfaz ejecutó 86 casos (43 vistas en 1366 y 390 px), con datos sintéticos y API simulada: sin errores JavaScript, APIs de fixture faltantes ni desbordamiento horizontal. Los datos de las capturas no se insertaron en la base. Los JSON y PNG locales están en `tmp/auditoria-*`, `tmp/benjamin-*` y `tmp/matias-*` (ignorados por Git). Esto comprueba renderizado y navegación; no sustituye las pruebas de persistencia ni acredita igualdad visual píxel a píxel.

Las integraciones con PostgreSQL usan usuarios/datos sintéticos y ROLLBACK. Cubren activación, recuperación de sesión, compra/cotización, comprobantes, permisos, PDF, venta en efectivo, reembolsos de oficina, configuración de cuentas/QR, identidad y operación. La extensión de operación verifica además los endpoints del reembolso de cliente: propietario, cuenta ajena, origen, idempotencia y una sola solicitud en trámite.

## Correcciones realizadas

- La vista 9.2 dejó de ser una demostración: consulta la compra del actor y su política histórica, envía una solicitud real y muestra el estado. La política no se sustituye por la última versión de la cooperativa. No permite solicitudes duplicadas ni ejecuta abonos.
- El nombre, razón social y RUC no se actualizaban para el rol COOPERATIVA debido a RLS; se sustituye el UPDATE silencioso por una función autorizada y limitada a esos campos, con control de versión. No concede UPDATE general sobre cooperativas. Migración `20261116_guardar_identidad_cooperativa` aplicada en la base compartida.
- Buses y grupos admiten selección explícita de ámbito autorizado para el administrador global. Lecturas y escrituras verifican el mismo ámbito.
- Los enlaces y pestañas conservan la cooperativa seleccionada entre identidad, pagos, tarifas y operación.
- Los paneles verifican permisos efectivos de la sesión antes de montar sus vistas; el backend vuelve a autorizar cada operación. Pruebas de navegador: siete accesos indebidos bloqueados sin consultar las APIs de contenido.
- Una respuesta 401 invalida la sesión en React. Se comprobó el regreso al login sin el bucle que producía una sesión local obsoleta. Un 403 conserva la cuenta.

## Matriz de las referencias

| Vista | Pantalla | Ruta oficial | Acceso | Comportamiento revisado |
|---|---|---|---|---|
| 0.1 | Iniciar sesión | /iniciar-sesion | Público | Activación, sesión y destino según rol |
| 0.2 | Registro | /registrarse | Público | Validación y activación de cuenta |
| 0.3 | Recuperar contraseña | /recuperar-contrasena | Público | Tokens de recuperación y expiración |
| 1 | Inicio | / | Público | Catálogo de ciudades y destinos |
| 1.1 | Sobre nosotros y contacto | /#sobre-nosotros; /#contacto | Público | Formulario de contacto; canales externos pendientes de datos definitivos |
| 2 | Resultados | /viajes | Público | Búsqueda, filtros y disponibilidad por tramo |
| 3.1 | Asientos Normal | /asientos | Cliente | Plano del viaje, disponibilidad y reserva |
| 3.2 | Asientos Ejecutivo | /asientos | Cliente | Pisos y plano del viaje, misma API de reserva |
| 4 | Pasajeros | /pasajeros?reserva_id= | Cliente propietario | Pasajeros, contactos y beneficios |
| 5 | Resumen y descuentos | /resumen?reserva_id= | Cliente propietario | Cotización y aceptación de versión |
| 6 | Método de pago | /pago?reserva_id= | Cliente propietario | Cuentas y creación idempotente de intento |
| 7 | Subir comprobante | /pago/comprobante?reserva_id= | Cliente propietario | Archivo privado, límites y referencia |
| 7.1 | En verificación | /pago/seguimiento?reserva_id= | Cliente propietario | Estado y motivo de rechazo |
| 8 | Compra y boleto | /pago/confirmacion?reserva_id= | Cliente propietario | Confirmación, PDF y QR de boleto |
| 9 | Mis viajes | /mis-viajes | Cliente propietario | Listado exclusivo del actor |
| 9.1 | Historial | /mis-viajes?seccion=historial | Cliente propietario | Paginación y filtros de historial |
| 9.2 | Solicitud de reembolso | /mis-viajes/reembolso?reserva_id= | Cliente propietario | Corregida: solicitud real, política histórica, seguimiento e idempotencia |
| 10 | Perfil | /mi-cuenta | Cuenta autenticada | Perfil y cambio de contraseña con revocación de sesiones |
| 11 | Administración | /panel | Administrador | Resumen real |
| 11.1 | Cooperativas | /panel/cooperativas | Administrador | Confirmación y estado sin recargar |
| 11.2 | Usuarios y roles | /panel/usuarios | Administrador | Roles y permisos efectivos por ámbito |
| 11.3 | Reportes y auditoría | /panel/reportes | Administrador / API autorizada | Agregados, ámbito y CSV |
| 11.4 | Configuración global | /panel/configuracion/global | Administrador | Versiones y proveedores disponibles |
| 12 | Oficinista | /oficina | Permisos de oficina | Resumen y próximas salidas |
| 12.1 | Reservas de oficina | /oficina/reservas | Permisos de oficina | Ámbito de cooperativa/oficina |
| 12.2 | Comprobantes | /oficina/comprobantes | Permisos de revisión | Listado y documento privado |
| 12.3 | Reembolsos de oficina | /oficina/reembolsos | reembolsos.gestionar | Decisión y abono documentado como operaciones separadas |
| 13 | Revisión de comprobante | /oficina/comprobantes/:id | pagos.revisar | Aprobación, rechazo y emisión de documento |
| 14 | Venta en oficina | /oficina/ventas | oficina.vender | Viaje, asientos, pasajeros, cobro idempotente y cambio |
| 15 | Panel cooperativa | /cooperativa | Permisos de cooperativa | Indicadores y navegación con ámbito |
| 16 | Bus Ejecutivo | /cooperativa/buses/:id | flota.admin | Datos, fotos y plano versionado |
| 16.1 | Bus Normal | /cooperativa/buses/:id | flota.admin | Mismo editor con plano de un piso |
| 17 | Frecuencias | /cooperativa/frecuencias | operacion.admin | Versiones, paradas y compatibilidad |
| 17.1 | Grupos habilitados | /cooperativa/frecuencias/grupos | operacion.admin | Grupos por frecuencia y ámbito explícito |
| 18 | Hoja de ruta | /cooperativa/hoja-ruta | operacion.admin | Descansos, solapes, asignación y publicación |
| 19 | Identidad y contacto | /cooperativa/configuracion | config.admin | Corregida persistencia real de nombre, razón social y RUC |
| 19.1 | Pagos y cuentas | /cooperativa/configuracion/pagos | pagos.configurar | Cuentas, QR, formatos, límites y versión |
| 19.1.1 | Agregar cuenta | /cooperativa/configuracion/pagos?cuenta=nueva | pagos.configurar | Alta/edición y cuenta predeterminada |
| 19.2 | Tarifas e impuestos | /cooperativa/configuracion/tarifas | tarifas.admin | Guardado atómico y vista previa |
| 19.3 | Cancelaciones | /cooperativa/configuracion/tarifas/politica | tarifas.admin | Borrador, publicación y conservación de versiones anteriores |
| 20 | Cooperativas y usuarios | /panel/accesos | Administrador | Edición y asignación |
| 20.1 | Alta de cooperativa | /panel/cooperativas/nueva | Administrador | Alta de responsable y configuración en transacción |
| 20.2 | Alta de usuario | /panel/usuarios/nuevo | Administrador | Permisos de membresía e invitación |

## Lo que aún requiere configuración o una entrega separada

- Personal del bus y validación de abordaje por QR: fuera del alcance por petición del usuario. El QR del boleto ya se genera; esto es distinto de implementar su lectura/validación en un panel de abordaje.
- QR bancario: carga y persistencia implementadas y probadas; hace falta que cada cooperativa cargue su imagen bancaria auténtica. No se inventó un QR de pago.
- WhatsApp Business: integración preparada para cargar el PDF privado y enviar una plantilla aprobada. Está desactivada hasta configurar el número oficial, credenciales, versión Graph, plantilla e idioma. Se probó con proveedor simulado; no se enviaron mensajes reales. El enlace manual conserva las restricciones de sesión del documento privado.
- El formulario de contacto guarda consultas. Se retiró el correo ficticio y, con autorización explícita del usuario, la página consulta solo los canales comerciales de Gran Continental: correo de soporte, teléfono/WhatsApp y dirección de su configuración. No publica datos de usuarios ni permite elegir otras cooperativas. Los campos vacíos muestran que falta confirmarlos.
- Correo automático del boleto: implementado con PDF adjunto, cola persistente, idempotencia y estado visible en la confirmación. Requiere activar expresamente el canal y una fecha de corte; permanece apagado durante las pruebas. Cada backend procesa únicamente sus archivos privados. Ver [Entrega de boletos](entrega-boletos.md).
- Tarjeta, PayPhone y PayPal continúan anunciados como no disponibles/próximamente, coherente con el alcance actual. No se ejecutaron cobros ni devoluciones bancarias reales.
- Reembolso por pasajero: conectado cuando la política guardada con la compra lo permite. Se conservan las reglas históricas, se libera solo la selección aprobada y se regenera el boleto para los pasajeros vigentes. Los abonos acumulados no superan lo pagado. La reserva completa continúa disponible.
- Las políticas comerciales, datos de contacto y tarifas definitivas deben ser configurados por los responsables. Las pruebas no convierten porcentajes ilustrativos de las referencias en reglas de producción.

Por estos límites no se certifica un “100 %” de servicios externos o funcionalidades fuera del alcance. La aceptación corresponde al flujo soportado y a los casos documentados, no a una garantía de ausencia absoluta de defectos.

## Comandos de comprobación

```powershell
npm --prefix frontend run build
npm --prefix backend run check:api
npm --prefix backend/conexion-bd run check
npm --prefix backend test
backend/node_modules/.bin/tsx --tsconfig frontend/tsconfig.json --test frontend/tests/*.test.ts
node --test frontend/tests/*.test.mjs
$env:PROBAR_ACTIVACION_DB='1'; npm --prefix backend run test:activacion:db
$env:PROBAR_PAGOS_DB='1'; npm --prefix backend run test:pagos:db
$env:PROBAR_CONFIG_PAGOS_DB='1'; npm --prefix backend run test:configuracion:db
$env:PROBAR_EDITORES_DB='1'; npm --prefix backend run test:editores:db
$env:PROBAR_IDENTIDAD_DB='1'; npm --prefix backend run test:identidad:db
$env:PROBAR_OPERACION_DB='1'; npm --prefix backend run test:operacion:db
npm --prefix backend/conexion-bd run db:estado
```

El estado de migraciones debe indicar 17 locales y ninguna pendiente/fallida/diferente. No se comparten `.env`, certificados ni sesiones privadas por Git.

La migración `20261116_contacto_publico` fija la cooperativa pública por su identificador y expone solo los cinco campos comerciales autorizados (incluido nombre). Se probó que la respuesta no contiene RUC, usuarios ni versiones privadas. El SQL completo de las nuevas migraciones se conserva para reproducir la instalación.

Resultados unitarios finales: 62 casos de frontend y 41 de backend. Se conservan los recorridos de interfaz reproducibles y sus requisitos en `frontend/tests/e2e/README.md`.

Comprobación del servidor local: nueve consultas protegidas sin cookie devolvieron 401. El endpoint público de contacto devolvió únicamente `nombre`, `email`, `telefono`, `whatsapp` y `direccion` de Gran Continental; un parámetro de otra cooperativa no cambia el ámbito público. Backend y base conectados tras el reinicio.

## Cierre del flujo

Las migraciones de esta revisión conservan los registros existentes; no se vació la base. La nueva política de reembolso parcial no modifica políticas históricas automáticamente. Las consultas de pasajeros y política se limitan a la reserva autorizada, sin abrir el catálogo privado de planos a clientes.

La prueba de pagos comprueba efectivo, comprobantes, devolución completa, archivo privado y aislamiento de la cola por backend. La de operación añade compras con política anterior y nueva, selección parcial, clave idempotente, rechazo de cambios de selección con la misma clave, boleto de pasajeros vigentes y dos abonos consecutivos. Las suites PostgreSQL deben ejecutarse una a una: sus cambios temporales de rol dentro de transacciones pueden bloquearse si se solapan.

Se retiraron nueve archivos desconectados, documentados en [Limpieza local](limpieza-local.md). Personal del bus y validación de abordaje quedan para la segunda entrega, conservando el QR de identificación del boleto y el QR bancario.

La oficina muestra los nombres, asientos y base económica de los pasajeros incluidos en cada solicitud, para revisar devoluciones parciales antes de aprobar. El editor de políticas impide guardar o publicar mientras todavía consulta sus reglas.
