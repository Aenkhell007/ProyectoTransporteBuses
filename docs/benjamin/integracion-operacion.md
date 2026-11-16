# Integración de operación — Benjamín

Rama local `codex/benjamin-vistas`, creada desde el merge de Matías en `develop`. La autoría y la publicación quedan pendientes de la autorización de Benjamín. Se usa React, TypeScript, Tailwind y el catálogo compartido de Font Awesome; se conserva la cabecera y el menú existentes.

| Referencia | Ruta conectada |
|---|---|
| 11.1 · Cooperativas | `/panel/cooperativas` |
| 11.3 · Reportes y auditoría | `/panel/reportes` |
| 15 · Panel de la cooperativa | `/cooperativa` |
| 17 · Frecuencias y paradas | `/cooperativa/frecuencias` |
| 18 · Hoja de ruta | `/cooperativa/hoja-ruta` |
| 19.2 · Tarifas, descuentos e impuestos | `/cooperativa/configuracion/tarifas` |
| 19.3 · Cancelaciones y reembolsos | `/cooperativa/configuracion/tarifas/politica` |

Las antiguas rutas sueltas de vista previa de frecuencias y paradas redirigen al editor conectado. La hoja de ruta de vista previa utiliza el mismo componente conectado; ya no muestra el borrador de datos ficticios.

## Flujo para probar

1. Entrar con administrador o con un usuario asignado al rol Cooperativa. El administrador puede seleccionar una cooperativa autorizada; un usuario local solo ve sus ámbitos.
2. Verificar en Buses que exista un grupo activo, un bus y un plano publicado con asientos. Se reutiliza la gestión de Mikel.
3. En Frecuencias, crear un código y una resolución, elegir grupos habilitados y terminales. El origen tiene 0 minutos; las siguientes paradas tienen tiempos crecientes. Una frecuencia directa solo permite origen y destino. El registro de resolución no consulta servicios externos ANT.
4. En Tarifas, elegir frecuencia y tramo; guardar una tarifa vigente por grupo y clase de asiento. Para publicar se requiere al menos la tarifa de ruta completa para todas las clases del plano. Configurar los tramos intermedios que se vayan a vender. Los impuestos provienen del catálogo global autorizado; no se inventan tasas. Los beneficios se activan solo con porcentaje, condiciones y edades cuando corresponda.
5. En Hoja de ruta, elegir hasta 31 días. Generar propuesta no escribe ni publica: ofrece buses compatibles y disponibles, e informa las frecuencias sin bus elegible. Guardar borrador crea las asignaciones en PostgreSQL. También se puede crear una asignación manual. El conductor es opcional y solo se admiten usuarios activos con rol Personal del bus del mismo ámbito.
6. Seleccionar los borradores y Publicar salidas. La API repite las validaciones y la base aplica sus restricciones. La salida aparece en la búsqueda de viajes del cliente para origen, destino, fecha y plazas disponibles.
7. Continuar por la compra existente: asientos, pasajeros, cotización, aceptación y pago. La operación en efectivo requiere el permiso de venta; los demás métodos conservan sus flujos existentes.

## Reglas y seguridad

Se reutilizan las tablas existentes: no se añade una migración ni se insertan datos de demostración persistentes. El nuevo router `/api/operacion` exige sesión, autorización por cooperativa, origen permitido para escrituras, límites de payload, versiones y consultas parametrizadas. Las escrituras usan el contexto transaccional y RLS existentes.

Los horarios se interpretan en America/Guayaquil. Se respeta el descanso semanal del grupo y las indisponibilidades del bus. Se aplica el margen de 30 minutos de las reglas operativas anteriores. Los lotes se guardan/publican completos o se revierten. La exclusión PostgreSQL protege las superposiciones; los borradores también ocupan el horario del bus. No se permite duplicar una frecuencia en la misma fecha.

Una frecuencia con viajes no permite cambiar ruta, tiempos o tipo. Al editar paradas sin viajes ni tarifas se crea una ruta separada para no alterar otras frecuencias que compartan la anterior. Las tarifas reemplazadas se conservan inactivas: las cotizaciones y compras mantienen sus referencias. Los cambios de beneficios requieren su revisión vigente. Las salidas con reservas activas no se cancelan desde la planificación.

La vista de personal y la edición global del catálogo de impuestos no forman parte de estas siete referencias. La asignación de personal existente se hace en Usuarios y roles. Los planos y la compatibilidad de grupos se reutilizan de la integración de flota.

## Verificación

- Build y TypeScript de frontend/backend; pruebas unitarias y chequeo Prisma.
- Prueba HTTP + PostgreSQL con datos sintéticos y ROLLBACK: ámbito, origen, versiones, paradas, descansos, conflictos, lotes atómicos, ausencia de tarifas, publicación, búsqueda real, reserva, pasajeros, cotización, cobro en efectivo y boleto. Ninguna compra de prueba persiste; no se envía correo real.
- Siete vistas comprobadas en 1366 px y 390 px con API simulada para inspección visual: sin errores JavaScript ni desbordamiento de página. Simulación de tarifa de $28 con adulto y niño al 30%: $47.60.

```powershell
npm --prefix frontend run build
npm --prefix backend run check:api
npm --prefix backend test
$env:PROBAR_OPERACION_DB='1'
npm --prefix backend run test:operacion:db
Remove-Item Env:PROBAR_OPERACION_DB
```


## Revisión de las siete referencias

La activación de cooperativas (11.1) utiliza un diálogo accesible propio con acción específica y actualiza el estado y la versión devueltos por un endpoint específico de activación, sin reenviar ni revalidar el RUC o los datos de identidad. No utiliza `window.confirm` ni requiere recarga. La cancelación del diálogo no guarda cambios. El control existe también en móvil.

Las vistas 17, 18 y 19.2 se reorganizaron con los bloques de las referencias: origen/destino y paradas intermedias; calendario por unidad, revisión, asignación y barra de publicación; tarifas y descuentos tabulares, impuestos/cargos y simulación. Las cantidades y los importes proceden de PostgreSQL; no se copian los datos ilustrativos a la base.

El reporte (11.3) consulta cobros, compras, pasajeros, devoluciones registradas y hasta 100 eventos de auditoría del ámbito autorizado. Permite filtros por período, cooperativa y estado de pago; el CSV contiene el resumen mostrado y protege las celdas contra fórmulas. Los totales se agrupan por la fecha del cobro o devolución, no por la fecha de salida. No se muestran detalles privados de la columna `auditoria.datos`.

La política (19.3) se guarda en borrador con revisión de concurrencia. Una política publicada se clona como nueva versión, preservando las compras anteriores. La publicación exige condiciones, plazo y cobertura continua de los intervalos desde 0 minutos hasta infinito, y utiliza la función PostgreSQL existente. La cancelación parcial sigue deshabilitada por la restricción del motor: la base es el total pagado de la reserva completa. La vista previa es ilustrativa y no registra devoluciones.

La configuración conjunta de tarifas y beneficios se guarda en una sola transacción: si un beneficio es inválido, también se revierten los cambios de tarifas.


Resultado de la revisión: 58 pruebas unitarias de frontend y 36 de backend aprobadas; build y chequeos TypeScript/Prisma correctos. Prueba de integración con PostgreSQL para operación, políticas versionadas, reportes, configuración atómica y activación/desactivación, con ROLLBACK. La comprobación de interfaz cubre las siete rutas en escritorio/móvil, confirmación cancelada, desactivación/reactivación sin recarga, guardar/publicar política y descarga CSV con API simulada.

### Acceso del administrador a la identidad de cooperativa

La pantalla `/cooperativa/configuracion` consulta los ámbitos activos autorizados con `config.admin` y muestra un selector cuando hay varios. Consulta y guardado envían el mismo `cooperativaId`; el servidor vuelve a comprobar permiso y estado activo en cada petición. Un administrador global no necesita una membresía local para configurar un ámbito autorizado. Las peticiones antiguas sin selección conservan la exigencia de una membresía única.

La prueba HTTP/PostgreSQL de editores cubre administrador sin membresía, listado limitado para el miembro, rechazo de clientes y ámbitos ajenos, guardado explícito y rechazo de cooperativas inactivas.

### Configuración ausente en cooperativas existentes

La migración `20261116_completar_configuracion_cooperativas` agrega únicamente las filas de configuración ausentes, con los valores predeterminados del esquema. No sobrescribe colores, contactos ni datos existentes. Se refuerza el alta HTTP con inserción idempotente antes de guardar contacto/logo. Las pruebas verifican que la reparación puede repetirse sin duplicar ni sobrescribir y que el alta conserva el correo recibido.
