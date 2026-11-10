# Integración de las vistas 6, 7, 7.1 y 8

Se sustituye el flujo de demostración de estas cuatro pantallas por consultas y operaciones autenticadas del backend. No se crean reservas, pasajeros, cuentas bancarias ni importes de ejemplo para alimentar las vistas.

## Requisito de entrada

La vista 5 debe entregar un `reserva_id` existente, perteneciente al cliente autenticado, con pasajeros completos y cotización vigente aceptada. El backend conserva la autoridad sobre importes, estados, permisos y vencimientos.

Rutas del frontend, conservando ese mismo identificador:

- `/pago?reserva_id=UUID`: métodos y cuentas habilitados, selección de cuenta e intento de pago.
- `/pago/comprobante?reserva_id=UUID`: carga privada del archivo y referencia.
- `/pago/seguimiento?reserva_id=UUID`: consulta cada 15 segundos; revisión, rechazo y reenvío, vencimiento o aprobación.
- `/pago/confirmacion?reserva_id=UUID`: boleto únicamente con compra confirmada y documento listo.

Un UUID de una maqueta no constituye una reserva válida. Si las vistas anteriores todavía usan mocks, deben conectarse por separado; no hay una reserva automática de respaldo.

## API

Todas las operaciones usan la cookie existente `transporte_sesion`. No se envían credenciales PostgreSQL al navegador.

| Método y ruta | Contrato |
| --- | --- |
| GET `/api/reservas/:id/pago` | Reserva autorizada, viaje, cotización, pasajeros, cuentas, política, intento, comprobante y documento. |
| POST `/api/reservas/:id/intentos-pago` | JSON `{cuentaId, clave}`. La clave UUID identifica el reintento de la misma operación. |
| POST `/api/reservas/:id/comprobantes?intento_id=UUID&referencia=...` | Cuerpo binario JPEG, PNG o PDF; cabecera `X-File-Name` codificada con `encodeURIComponent`. Aplica política de la cooperativa. |
| GET `/api/reservas/:id/archivos/:archivoId` | Archivo privado autorizado. `?ver=1` permite abrir imágenes/PDF; sin él se descarga. |
| GET `/api/reservas/:id/boleto/qr` | PNG con el identificador opaco del boleto, disponible solo después de emitirlo. |
| POST `/api/pagos/comprobantes/:id/revision` | JSON `{aprobar, motivo, version}`. Exige `pagos.revisar` y el ámbito permitido por SQL. El cliente no puede aprobar su pago. |
| POST `/api/pagos/compras/:id/documento` | Reintento de emisión para personal con permiso. No duplica un documento ya listo. |

La bandeja del oficinista debe consumir el endpoint de revisión. Esta entrega proporciona el contrato y su implementación; no modifica la pantalla administrativa de otro integrante.

La aprobación es una revisión manual del comprobante. No se consulta al banco ni se verifica automáticamente una transferencia bancaria. El importe asociado es el de la cotización aceptada: no se presenta como un monto reportado por el cliente porque el esquema actual no almacena ese dato por separado.

## Archivos y documentos

- `backend/src/pagos/`: API, validaciones, almacenamiento privado y PDF.
- `backend/src/sesion.ts`: contexto de sesión compartido con autenticación.
- `shared/pagos.ts`: contrato TypeScript común.
- `frontend/src/features/pagos/pagosApi.ts` y `useFlujoPago.ts`: consumo de la API sin fallback a mocks.
- `frontend/src/components/pagos/ResumenPago.tsx`: mismo resumen real en 6, 7 y 7.1.
- Migración `20261104_consulta_pago_cliente`: dos funciones de lectura con autorización y permisos restringidos. No cambia tablas ni reescribe migraciones existentes.

Los archivos se guardan en `backend/.data/pagos`, excluido de Git, o en `PAGOS_ARCHIVOS_DIR`. El directorio no se publica con `express.static`. En un servidor desplegado necesita almacenamiento persistente, copia de seguridad y el mismo directorio accesible por las instancias que atiendan las descargas. No es un bucket de Supabase Storage; PostgreSQL guarda los metadatos y las relaciones.

Si se pierde la respuesta de COMMIT, se comprueba si el archivo está registrado antes de limpiarlo. Cuando no se puede comprobar, se conserva privado para permitir reconciliación, evitando borrar un documento de una operación que sí se confirmó.

No se promete envío de correo o WhatsApp. El esquema puede crear notificaciones pendientes al confirmar la compra, pero los trabajadores de esos avisos se integran por separado. El botón para compartir por WhatsApp abre una acción manual del usuario.

## Instalación y pruebas

Desde la raíz del repositorio:

```bash
npm --prefix backend ci
npm --prefix backend/conexion-bd run db:deploy
npm --prefix backend run check:api
npm --prefix backend run test:auth
npm --prefix backend run test:pagos
npm --prefix frontend run build
```

La prueba de integración es explícita y requiere `DIRECT_URL` con permisos de migración. Crea sus propios registros, aplica/verifica las funciones en una transacción, usa el rol `transporte_runtime`, prueba HTTP y PostgreSQL, y revierte todos los registros y la membresía temporal al finalizar. Los archivos se crean y eliminan en un directorio temporal. No envía correos ni WhatsApp.

```bash
# Git Bash
PROBAR_PAGOS_DB=1 npm --prefix backend run test:pagos:db
```

Casos verificados: cotización desde tarifas, acceso del titular, rechazo de otra cuenta, límites de archivo y referencia, intento repetido, rechazo con motivo, nuevo intento, revisión sin permiso denegada, versión incorrecta, aprobación, PDF privado, QR bloqueado durante revisión, descarga denegada a otra cuenta y reintento después de perder la respuesta de COMMIT.

Para probar manualmente, mantener API y frontend ejecutándose y usar una reserva real del usuario. `FRONTEND_URL` del backend debe coincidir exactamente con el origen donde se abre el frontend. El agente verificó la interfaz en 4175; no inició un servidor en 5173.

## Estado de la entrega

Migración aplicada en la base configurada el 4 de noviembre de 2026. Pruebas SQL/HTTP con rollback y compilación verificadas. Las vistas anteriores, Mis viajes, la bandeja administrativa y las notificaciones externas no se consideran terminadas por esta integración. La prueba visual y manual de una compra de negocio completa requiere que esas dependencias entreguen la reserva y la decisión reales.
