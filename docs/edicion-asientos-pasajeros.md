# Edición de asientos y tipos de pasajero

La rama `feature/11-edicion-asientos-pasajeros` parte del trabajo del PR #84. Mientras ese PR siga abierto, la comparación de este cambio debe usar `feature/integracion-compra-real` como base. Cuando #84 esté integrado, se podrá dirigir a `develop` para revisar únicamente esta corrección. No requiere cambios en `main`.

## Instalación

Desde la raíz del repositorio, con las variables privadas de conexión ya configuradas:

```sh
npm --prefix backend/conexion-bd run db:deploy
npm --prefix backend/conexion-bd run db:generate
```

La migración `20261106_edicion_asientos_pasajeros` agrega una versión de edición y la categoría del pasajero; no elimina reservas ni pasajeros. No ejecutar reset ni modificar las migraciones anteriores.

## Comportamiento

- Volver desde pasajeros recupera la reserva y los asientos propios mediante una consulta autorizada. El historial y un identificador en sessionStorage permiten regresar también con Atrás. El almacenamiento no autoriza acceso: el servidor valida la sesión y la titularidad.
- Sin cambiar la selección, Continuar reutiliza la reserva. No crea otra ni prolonga el plazo.
- Para editar, quitar un asiento, escoger otro y pulsar Revisar cambio de asientos. Confirmar guarda el cambio atómicamente; cancelar no modifica la reserva.
- Se conservan los identificadores de las fichas y los datos guardados. El borrador se recupera por identificador, aunque cambie el orden visual.
- Si hay conflicto o una versión antigua, se rechaza la operación completa. Los asientos anteriores permanecen retenidos.
- El cambio anula los intentos pendientes sin comprobante e invalida la cotización aceptada. Es necesario revisar y aceptar una nueva cotización.
- Tras enviar cualquier comprobante, o con la reserva vencida/confirmada/cancelada, no se permite cambiar asientos. No se altera ningún pago histórico.
- Adulto, Niño, Tercera edad y Persona con discapacidad se muestran como categorías independientes. Elegir una categoría no crea un descuento: solo se aplica una regla vigente del servidor, con sus requisitos de edad y respaldo. Las categorías se muestran también en resumen y pago.

## Pruebas

```sh
node backend/node_modules/tsx/dist/cli.mjs --test frontend/tests/edicionPasajeros.test.ts
npm --prefix frontend run build
npm --prefix backend run check:api
```

La prueba optativa `PROBAR_PAGOS_DB=1 npm --prefix backend run test:pagos:db` ejecuta los escenarios de compra y edición con fixtures temporales dentro de una transacción que se revierte. No envía correos ni WhatsApp ni aprueba reservas reales.

Prueba manual: reservar tres asientos, completar parcialmente los pasajeros, volver, continuar sin cambios y verificar los datos. Luego cambiar uno, confirmar, comprobar los tres pasajeros y revisar nuevamente el precio. Intentar el cambio desde otra pestaña desactualizada y después de enviar un comprobante.
