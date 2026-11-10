# Entrega de boletos PDF

El boleto se puede consultar y descargar en la aplicación sin servicios externos. Su QR identifica el documento; el panel de abordaje pertenece a una entrega posterior.

## Activación por el responsable

Copiar los nombres de variables de `backend/.env.example` al entorno privado. Nunca subir claves ni tokens a Git.

- Definir `BOLETOS_DESDE` con fecha ISO y zona, por ejemplo la fecha real de puesta en servicio. No usar una fecha antigua salvo que se quiera procesar expresamente compras pendientes desde ese momento.
- Correo: configurar Brevo/remitente autorizado y `BOLETOS_EMAIL_ACTIVO=true`. Adjunta el PDF privado; la aceptación de Brevo no certifica recepción en la bandeja del destinatario.
- WhatsApp: configurar token, identificador numérico del teléfono, versión Graph admitida, nombre e idioma de una plantilla aprobada; después activar `BOLETOS_WHATSAPP_ACTIVO=true`. La plantilla necesita cabecera de documento y una variable de texto en el cuerpo para el código de compra. El destinatario debe haber autorizado el contacto según el flujo comercial.
- Reiniciar la API tras configurar el entorno. Sin fecha de corte, credenciales y activación explícita, el canal no consulta ni consume la cola.

La implementación usa [correo transaccional Brevo](https://developers.brevo.com/reference/send-transac-email) y [plantilla multimedia de WhatsApp Business](https://www.postman.com/meta/whatsapp-business-platform/request/2qbotrb/send-message-template-media). Las pruebas sustituyen ambos proveedores y no envían mensajes reales.

## Archivos y estados

Los PDF permanecen en el almacenamiento privado de cada backend. La emisión etiqueta la notificación con un identificador estable del equipo/carpeta; otro backend no puede tomarla. Puede definirse `BACKEND_ID` estable al desplegar, siempre asociado al mismo almacenamiento privado y con al menos ocho caracteres. No compartir el identificador entre equipos con carpetas privadas diferentes.

La API reclama filas con bloqueo para evitar envíos concurrentes. Correo usa la clave de idempotencia de la notificación; los errores explícitamente transitorios tienen hasta tres intentos. En WhatsApp, solo un rechazo HTTP 429 permite reintento automático. Un timeout o respuesta ambigua se registra para revisión, evitando reenviar ciegamente. Un proceso interrumpido en estado EN_PROCESO también requiere revisión; no se recupera automáticamente un envío cuyo resultado se desconoce.

La confirmación muestra pendiente, aceptación por proveedor o incidencia. No afirma entrega al destinatario. No hay webhook de recepción/lectura. Los canales siguen desactivados hasta que el responsable complete la configuración y valide un envío de prueba autorizado.

## Reembolsos

La aprobación parcial regenera el boleto descargable con los pasajeros restantes. El comprobante original de compra conserva sus importes; la confirmación informa los importes solicitados y abonados. No se reenvía automáticamente un boleto modificado si la notificación original ya se procesó.

Los abonos en oficina registran la devolución y su evidencia; no realizan una transferencia bancaria automática. Las credenciales de pagos externos y las reglas comerciales definitivas se configuran por separado.
