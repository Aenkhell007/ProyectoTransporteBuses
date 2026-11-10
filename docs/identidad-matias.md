# Integración de Matías — identidad y administración

Las vistas 0.1, 0.2 y 0.3 reutilizan el acceso, registro, verificación y recuperación existentes. Se añadió Recordarme con cookie persistente opcional, sin almacenar contraseñas en el navegador.

| Vista | Ruta | Alcance |
|---|---|---|
| 0.1 | /iniciar-sesion | Inicio de sesión, visibilidad de clave, Recordarme, errores y redirección por rol |
| 0.2 | /registrarse | Registro con validación, consentimiento y activación existentes |
| 0.3 | /recuperar-contrasena | Solicitud de recuperación sin revelar si una cuenta existe |
| 10 | /mi-cuenta | Nombres, apellidos, teléfono y nacimiento; contraseña actual requerida para cambiarla |
| 11.2 | /panel/usuarios | Filtros, estados, roles y permisos individuales por membresía |
| 20 | /panel/accesos | Edición de cooperativa, usuario, estado y asignación de rol/cooperativa/oficina |
| 20.1 | /panel/cooperativas/nueva | Alta transaccional de cooperativa y responsable nuevo o existente; logo PNG/JPG |
| 20.2 | /panel/usuarios/nuevo | Alta de usuario con rol, ámbito, permisos e invitación |

La cabecera y el panel lateral compartidos se conservan. Las referencias están en el maestro V3 y sus ocho PNG; los datos de las capturas no se insertan como usuarios reales.

## Seguridad y persistencia

La migración `20261116_identidad_administracion` incorpora versiones para usuarios y membresías, permisos individuales con RLS y operaciones autorizadas. Las asignaciones solo modifican al usuario seleccionado; una oficina debe pertenecer a su cooperativa. Los permisos individuales no conceden administración global. El cambio de rol restablece excepciones individuales del ámbito; elegir Cliente desactiva asignaciones de personal. Se conserva la protección del último administrador.

La edición del perfil conserva el correo y documento de identidad; no ofrece un cambio silencioso de identidad. La contraseña requiere la clave actual y revoca las sesiones. Una invitación permite establecer contraseña y verificar el correo: token aleatorio, hash en PostgreSQL, una hora de validez y un solo uso. El enlace lleva el token en el fragmento y la pantalla lo elimina de la barra al abrirse. Nunca se muestran hashes ni enlaces privados al administrador.

La creación y los permisos del nuevo usuario se confirman juntos. El correo se solicita después de confirmar la cuenta; si el proveedor falla, la interfaz informa que la cuenta está guardada y ofrece reenviar desde la gestión. Los envíos se realizan solo al usar esa acción de la aplicación.

## Verificación

- Compilación y comprobaciones TypeScript de frontend, backend y Prisma.
- Pruebas unitarias existentes y validaciones de identidad.
- Prueba HTTP/PostgreSQL con usuarios y cooperativas sintéticos y ROLLBACK: perfil, versión obsoleta, alta conjunta, invitación consumible, cambio de rol, permisos efectivos limitados al ámbito y cierre de sesión al cambiar contraseña. El correo se simula, no se envía a personas reales.
- Revisión de las ocho rutas en escritorio y móvil con API simulada para interfaz, sin errores JavaScript ni desbordamiento horizontal.
- La prueba de pagos verifica la regresión de los módulos existentes.

```powershell
npm --prefix frontend run build
npm --prefix backend run check:api
npm --prefix backend test
$env:PROBAR_IDENTIDAD_DB='1'
npm --prefix backend run test:identidad:db
Remove-Item Env:PROBAR_IDENTIDAD_DB
```

La migración se aplica una vez por el responsable de la base compartida. Los compañeros que ya usan esa base generan su cliente Prisma; no repiten SQL instalado ni publican .env o certificados.
