# Integración de las vistas de Mikel

Rama de trabajo: `feature/mikel-integracion-backend`. Destino de revisión: `develop`.
Esta entrega conecta los editores existentes; conserva las cabeceras, los menús
laterales y el pie compartidos. No sustituye el esquema por el SQL exportado.

## Rutas para probar

Usar el origen y puerto que indique Vite. Iniciar sesión en ese mismo origen.

| Vista | Ruta | Datos y permiso |
| --- | --- | --- |
| 3.1 y 3.2 | `/asientos` desde un viaje de `/viajes` | Conservan el flujo real existente, con el viaje y sus parámetros. |
| 11.4 | `/panel/configuracion/global` | Configuración global; `config.global`. |
| 16 y 16.1 | `/cooperativa/buses`, luego editar o Nuevo bus | Bus, fotos, servicios y plano; `flota.admin`. |
| 17.1 | `/cooperativa/frecuencias/grupos` | Frecuencias, grupos y buses reales; `operacion.admin`. |
| 19 | `/cooperativa/configuracion` | Identidad, contacto y logo; `config.admin`. |

Las rutas `/vista-previa/...` siguen siendo demostraciones independientes: no
utilizarlas para acreditar persistencia. La vista 19.1 de pagos conserva su
alcance anterior y no se conecta a nuevos servicios en esta entrega.

El usuario de cooperativa necesita una membresía activa en una única cooperativa
activa. Si tiene varios ámbitos, se rechaza la operación hasta implementar un
selector explícito; nunca se elige una cooperativa de forma silenciosa. La API
comprueba sesión, permisos y ámbito en cada consulta. Una URL visible no autoriza
el acceso. El administrador global puede abrir 11.4 sin una membresía local.

## Instalación

Configurar en privado los archivos de entorno existentes: `backend/.env` para
puerto, origen y servicios; `backend/conexion-bd/.env` para `DATABASE_URL`,
`DIRECT_URL` y el certificado TLS. No incluir estos archivos en Git.

Desde la raíz:

```sh
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend/conexion-bd ci
npm --prefix backend/conexion-bd run db:deploy
npm --prefix backend/conexion-bd run db:generate
npm --prefix backend run check:api
npm --prefix frontend run build
```

La migración nueva es `20261112_editores_mikel`. Es transaccional y aditiva:
agrega versión de bus, contenido privado de imágenes y configuración del editor.
No elimina reservas, planos, usuarios ni datos anteriores. En Supabase compartido
solo se aplica una vez; los demás equipos comprueban el estado y generan su
cliente. No usar `migrate reset`, `db push` ni ejecutar de nuevo el esquema inicial.

Arrancar el backend y el frontend en terminales separadas. Si se usa un puerto
distinto, hacer coincidir `FRONTEND_URL` y el origen del navegador, y configurar
el proxy de Vite a la API. No mezclar `localhost` y `127.0.0.1` para las cookies.

## Comportamiento del guardado

- Guardar un bus confirma datos, fotos, servicios y plano en una misma transacción.
  Un error revierte toda la operación. Se rechazan unidades y placas duplicadas.
- El servidor valida y normaliza las imágenes a PNG. El contenido y sus metadatos
  quedan en PostgreSQL; no dependen de una carpeta privada de otro equipo. El
  acceso requiere sesión y permiso en la cooperativa. Las fotos anteriores que
  no tengan contenido en este almacenamiento necesitan migrar su archivo original.
- Un cambio de plano genera otra versión. Si el plano está publicado o en uso,
  exige confirmación. Los viajes anteriores conservan el plano que contrataron.
- Las versiones protegen contra escrituras simultáneas: un conflicto devuelve
  409 y conserva el formulario para poder revisar los cambios antes de reintentar.
- Las compatibilidades modifican `frecuencia_grupo`, no los viajes ya publicados.
- Identidad guarda cooperativa y configuración con sus dos versiones. No inserta
  nombres, RUC, grupos ni buses de ejemplo si faltan datos reales.

## Alcance de la configuración global

El tiempo de sesión se aplica a los siguientes inicios de sesión; no revoca
sesiones ya abiertas. Los formatos y el tamaño de comprobantes se comprueban en
el servidor, junto con la política de cada cooperativa, usando el límite menor.
Idioma, moneda, zona horaria y preferencias de canales quedan persistidos; eso
no cambia por sí solo todos los textos o formateadores del cliente.

Brevo se declara disponible únicamente si existen sus variables en el servidor.
La preferencia de correo no sustituye al proceso de activación/recuperación ni
implementa por sí sola el envío de boletos. MFA y WhatsApp no se pueden activar.
Los colores y el logo guardados se muestran en la vista previa de identidad;
extender esa marca a toda la aplicación pública corresponde a sus consumidores.

## Verificación

```sh
npm --prefix backend run test:editores
npm --prefix backend run test:auth
npm --prefix backend run test:pagos
npm --prefix backend run test:compra
```

Para `test:compra`, cargar el entorno del backend o definir una `DATABASE_URL`
local de prueba: estas pruebas de validación no realizan conexiones a PostgreSQL.

Prueba real opcional (PowerShell):

```powershell
$env:PROBAR_EDITORES_DB = '1'
$env:ENTORNO_PRUEBAS_DB = (Resolve-Path backend/conexion-bd).Path
npm --prefix backend run test:editores:db
```

Requiere `DIRECT_URL` con capacidad de preparar fixtures y asumir el rol runtime.
Ejecuta peticiones HTTP reales sobre PostgreSQL, comprueba permisos, aislamiento
entre cooperativas, imágenes, versiones, plano histórico y reversión de errores.
Finalmente revierte todos los fixtures. No envía correos ni mensajes reales.

La revisión manual debe guardar, recargar y confirmar los valores en cada ruta,
probar otro usuario sin permiso y verificar escritorio/móvil. Los catálogos vacíos
se muestran como vacíos; no se reemplazan por mocks.
