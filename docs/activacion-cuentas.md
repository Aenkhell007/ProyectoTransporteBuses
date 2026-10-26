# Activación de cuentas y correos de identidad

## Flujo

1. `/registrarse` crea el usuario y un token `VERIFICAR_EMAIL` dentro de una transacción. Guarda SHA-256, no el token original.
2. Envía un correo formal con HTML y alternativa de texto. La respuesta informa que debe activar la cuenta antes de acceder. La cuenta se conserva si falla el envío.
3. El enlace abre `/activar-cuenta#token=...`. La vista retira el fragmento de la barra de direcciones y solicita una confirmación explícita; una visita GET o un escáner de enlaces no consume el token.
4. `POST /api/auth/activation/confirm` valida el enlace, marca `usuarios.email_verificado_at`, consume todos sus tokens de activación y crea una sola notificación de bienvenida en la misma transacción.
5. Solo después se permite iniciar sesión. La protección también se aplica al crear sesiones en PostgreSQL y al abrir el contexto de una sesión existente. Las cuentas previas sin verificación también deben activar su correo; no se verificaron automáticamente usuarios ni administradores.

## Reenvío y seguridad

- `/reenviar-activacion` sirve para cuentas nuevas y existentes.
- El token vence en 60 minutos. Los enlaces usados, inexistentes o vencidos se rechazan.
- Máximo de un token nuevo por minuto y cinco por hora por cuenta; además se conserva el límite general por IP.
- La respuesta de reenvío no confirma si existe una cuenta.
- Las solicitudes previas siguen siendo válidas hasta vencer o hasta que se confirme una activación, para evitar invalidar un correo que todavía está llegando.
- No se registran tokens, destinatarios, contraseñas ni respuestas completas del proveedor.

## Bienvenida y aceptación del correo

Se utiliza `transporte.notificaciones`, sin nuevas tablas. El evento `BIENVENIDA_VERIFICADA` tiene una clave única por usuario. El trabajador solo reclama este tipo de evento y usa bloqueo de filas para evitar reclamaciones simultáneas. No vuelve a reclamar una bienvenida aceptada por el proveedor.

Se envía una clave de idempotencia estable a Brevo. Las respuestas explícitas 429/5xx permiten hasta tres intentos, separados por un minuto y únicamente durante los diez minutos siguientes a la activación. Los fallos de red de resultado incierto no se reintentan automáticamente. Un proceso que se interrumpa con un evento `EN_PROCESO` requiere revisión manual: se prefiere no duplicar un correo cuyo resultado se desconoce. No se garantiza entrega exactamente una vez a través de una red externa.

`notificaciones.estado = ENVIADA` indica aceptación por Brevo, no entrega en bandeja. `proveedor_ref` permite consultar sus eventos. Para conocer entregado/rechazado se deben consultar los registros de Brevo; no se añadió un webhook de entrega en esta tarea.

La recuperación de contraseña también utiliza una plantilla formal HTML, conservando su token y vencimiento de 30 minutos.

## Base de datos y despliegue

Archivo SQL: `backend/conexion-bd/prisma/migrations/20261026_activacion_email/migration.sql`.

En la base compartida localmente configurada, `prisma migrate deploy` devolvió P3005 porque el esquema existente no tiene su baseline registrado. No se forzó ni se simuló ese baseline. Se instaló únicamente el SQL anterior mediante una transacción administrativa, conservando una copia local de las funciones de sesión previas. Esta migración todavía no está registrada como aplicada en `_prisma_migrations`.

Antes de usar Prisma Migrate para futuros despliegues, el equipo debe validar y registrar la base histórica real y reconciliar esta aplicación manual. No volver a aplicar la migración inicial sobre la base existente.

La instalación no borra registros, no modifica correos ni marca usuarios existentes como verificados. Reutiliza las tablas y permisos actuales. El servidor usa `transporte_app`; la conexión administrativa solo se utilizó para instalar las funciones y ejecutar las pruebas de base de datos.

## Comprobaciones

- Frontend compila con `npm --prefix frontend run build`.
- `npm --prefix backend run check:api` valida el servidor de integración y sus pruebas.
- `npm --prefix backend run test:auth`: nueve pruebas unitarias sin envío real.
- Prueba de PostgreSQL: en PowerShell, dentro de `backend`, definir `$env:PROBAR_ACTIVACION_DB='1'`, ejecutar `npm run test:activacion:db` y después `Remove-Item Env:PROBAR_ACTIVACION_DB`. Usa DIRECT_URL; todos los registros de prueba se revierten con ROLLBACK. Verifica bloqueo de acceso previo, expiración, uso único, reenvíos y una sola bienvenida.
- Permisos de las funciones comprobados con `transporte_app`.
- HTTP: confirmación de token inexistente y correo de reenvío inválido devuelven 400.

Pendiente: recorrido manual con un correo real, confirmación del enlace y comprobación de los eventos de entrega de Brevo. Durante estas comprobaciones no se enviaron mensajes reales ni se activaron cuentas de personas.
