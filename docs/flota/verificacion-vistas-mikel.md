# Verificación frontend de las vistas de Mikel

Alcance: vistas 3.1, 3.2, 11.4, 16, 16.1, 17.1 y 19. Revisión local del 11 de noviembre de 2026. Sin llamadas nuevas al backend, migraciones ni publicación en Git.

## Rutas de revisión (servidor de desarrollo, puerto 4198)

| Vista | Ruta | Contenedor |
| --- | --- | --- |
| 3.1 | /vista-previa/mikel-v3/asientos-normal | Cabecera y pie del cliente |
| 3.2 | /vista-previa/mikel-v3/asientos-premium | Cabecera y pie del cliente |
| 11.4 | /vista-previa/panel/configuracion/global | Administración |
| 16 | /vista-previa/cooperativa/buses/ejecutivo | Cooperativa |
| 16.1 | /vista-previa/cooperativa/buses/normal | Cooperativa |
| 17.1 | /vista-previa/cooperativa/frecuencias/grupos | Cooperativa |
| 19 | /vista-previa/cooperativa/configuracion | Cooperativa |

Índice: /vista-previa/mikel-v3. Todas estas rutas son de desarrollo y no conceden permisos de producción.

## Comprobaciones

- Compilación de producción y TypeScript correctos. Advertencia existente de tamaño del paquete JavaScript superior a 500 kB; no es un error de compilación.
- Cinco pruebas de plantillas: geometría Normal 2+2, Ejecutivo 1+2 por piso, códigos únicos, renumeración y rechazo de dimensiones inválidas.
- Navegador en escritorio (1440 px) y móvil (390 px): cabeceras compartidas, navegación en la misma pestaña y distribución adaptable.
- 3.1: dos asientos seleccionados actualizan total a $40 en la muestra; los ocupados/reservados y selecciones adicionales quedan bloqueados.
- 3.2: selección U8/U9 actualiza el total a $56 en la muestra; cambiar de piso conserva la selección. Continuar informa explícitamente que la muestra no crea una reserva.
- 11.4: todos los bloques permanecen visibles. Cambiar sesión, revisar impacto y confirmar genera confirmación local. Desmarcar todos los formatos impide confirmar. Cancelar restaura la última confirmación. Los canales y MFA no se activan sin integración disponible.
- 16/16.1: capacidad calculada a partir del plano, confirmación antes de recrearlo, editor de celdas y cancelación. Cambiar dos pisos/seis filas a un piso/diez filas genera 40 asientos con clase Normal. Borrar una celda reduce la capacidad; cancelar la restaura. Validación de unidad/placa y confirmación local comprobadas.
- 17.1: búsqueda, detalle, selección de grupos, revisión y confirmación local; el catálogo de grupos se consulta sin modificarlo desde compatibilidades.
- 19: vista previa de identidad, campos y colores; navegación a Pagos 19.1 y formulario existente 19.1.1 dentro del panel compartido.

## Límites deliberados

Las vistas previas usan ejemplos identificados. Sus borradores no sobreviven necesariamente a abandonar o recargar la pantalla. Los editores exponen datos tipados y callbacks de guardado para una integración posterior; no simulan un guardado en PostgreSQL.

El flujo real existente de reservas en /asientos no se sustituye por las muestras 3.1/3.2. Antes de publicar la integración se deberán comprobar autorización, ámbitos de cooperativa, concurrencia/versiones, errores HTTP y persistencia con servicios reales.

Resumen, gestión completa del catálogo de grupos, personal y tarifas pendientes se indican como tales; no se acreditan como implementados por estas siete vistas. La aceptación visual final corresponde a la revisión del usuario, y no se declara coincidencia exacta píxel por píxel.
