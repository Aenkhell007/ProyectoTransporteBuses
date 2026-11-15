# Datos para probar el panel de oficina

Estos registros se guardan en PostgreSQL y se consultan desde el backend. Son datos de demostración identificados con DEMO: no representan viajes comerciales, transferencias ni devoluciones reales. Cargar datos no corrige las diferencias visuales con las referencias.

## Orden de ejecución

1. Tener aplicadas las migraciones de la versión del backend que estás probando. No repetir migraciones manualmente si ya figuran aplicadas en la base compartida.
2. En Supabase, abrir SQL Editor con el rol postgres.
3. Si Gran Continental todavía no tiene política de reembolso publicada, revisar y ejecutar `politica-reembolso-solo-pruebas.sql`. Es opcional y exclusivamente académica: publica una devolución del 50 % antes de la salida para nuevas compras de esta cooperativa. Afecta nuevas compras mientras siga publicada; sustituirla por una política autorizada antes de operar. Si ya hay una publicada, el archivo la conserva.
4. Ejecutar completo `datos-prueba-oficina.sql`. Al final devuelve los IDs de las cuatro reservas. Guardar ese resultado.
5. Iniciar sesión como Manuel, oficinista de Oficina Matriz Ambato, en el frontend que apunta al backend de esta versión. No cambia su contraseña ni sus permisos.

Ambos scripts se comprobaron juntos en Supabase dentro de una transacción revertida. También se verificó repetir el script principal sin duplicar las cuatro reservas del mismo día. La comprobación no dejó los registros guardados; debes ejecutar los archivos para conservarlos.

## Qué se crea

| Elemento | Datos |
| --- | --- |
| Cooperativa y oficina | Reutiliza Gran Continental, RUC 1805381579001, y Oficina Matriz Ambato |
| Viaje normal | Ambato → Quito, mañana a las 08:00, 40 asientos, tarifa $12 |
| Viaje VIP | Ambato → Quito, mañana a las 10:00, 36 asientos en dos pisos, tarifa $18 |
| Reserva 1 | Pendiente, asiento 1A, pasajero Prueba 1 |
| Reserva 2 | Pendiente con intento de transferencia, asiento 1B, pasajero Prueba 2 |
| Reserva 3 | Venta en efectivo confirmada, asiento 1C, pasajero Prueba 3 |
| Reserva 4 | Venta confirmada con solicitud de reembolso, asiento 1D, pasajero Prueba 4 |
| Cuenta receptora | DEMO-NO-TRANSFERIR; no es una cuenta bancaria utilizable |

La fecha de los viajes se calcula al ejecutar el script, usando America/Guayaquil. Las ventas se registran el día de ejecución. Las reservas pendientes conservan el vencimiento normal del sistema; prueba el comprobante inmediatamente. Repetir el script ese mismo día no renueva reservas vencidas ni revierte decisiones.

## Recorrido de prueba

Usa el mismo origen del navegador donde iniciaste sesión, por ejemplo http://127.0.0.1:4192. Si usas otro puerto, reemplázalo y asegúrate de que esté autorizado por el backend.

1. **Resumen:** `/oficina`. Con fecha de hoy deben aparecer las ventas registradas. Para próximas salidas selecciona mañana: no hay salidas de estos datos para hoy.
2. **Ventas:** `/oficina/ventas`. Selecciona Oficina Matriz Ambato, Ambato → Quito, fecha de mañana. Recorre viaje, asientos, pasajeros y cobro. Usa un asiento libre, documento de prueba tipo OTRO y efectivo de demostración. Esto prueba el flujo HTTP, adicionalmente a los registros creados en SQL.
3. **Reservas:** `/oficina/reservas`. Limpia los filtros o selecciona mañana. Localiza Prueba 1 a Prueba 4.
4. **Adjuntar comprobante:** con la misma sesión abre `/pago/comprobante?reserva_id=ID_DE_LA_RESERVA_2`. Sustituye el ID por el que devuelve SQL. Adjunta un JPG, PNG o PDF marcado como prueba, con importe de $12, referencia DEMO y tamaño permitido. Confirma y envía.
5. **Comprobantes:** `/oficina/comprobantes`. El archivo enviado debe aparecer en revisión. Abre el detalle, amplía o descarga el archivo y prueba aprobarlo. Para probar rechazo crea otro intento/reserva y escribe el motivo. No se insertan rutas ficticias de archivos en SQL.
6. **Reembolsos:** `/oficina/reembolsos`. Abre la solicitud de Prueba 4, revisa la política, importe e historial. Aprobar una solicitud no equivale a haber abonado dinero. No registres transferencias reales para esta demostración.

Los registros SQL de venta pueden dejar el documento de compra pendiente de generación: no crean un PDF o QR ficticio. Prueba la emisión del boleto mediante el cobro en la aplicación. Este conjunto tampoco verifica notificaciones externas ni autoriza movimientos bancarios.

Los correos de contacto de las reservas terminan en example.invalid para no enviar avisos a personas reales. Los datos DEMO quedarán visibles a los usuarios autorizados de la base compartida.
