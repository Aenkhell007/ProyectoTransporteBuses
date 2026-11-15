# Vistas 19.1 y 19.1.1: configuración de pagos conectada

Las cuentas, métodos manuales, instrucciones y política de comprobantes se consultan y guardan en PostgreSQL. Las credenciales de proveedores no se devuelven al navegador. PayPhone, tarjeta y PayPal continúan deshabilitados mientras no haya un adaptador implementado y verificado.

## Acceso

- Administrador: `/panel/configuracion/pagos`.
- Responsable de cooperativa: `/cooperativa/configuracion/pagos`.
- Alta de cuenta: misma dirección con `?cuenta=nueva`.
- Se exige sesión y permiso `pagos.configurar` en la cooperativa elegida. El selector solo contiene ámbitos autorizados. Un oficinista o cliente sin ese permiso no puede guardar cuentas.

## Persistencia y funcionamiento

- La configuración completa se guarda en una transacción. La versión evita sobrescribir cambios de otro usuario; un conflicto conserva el formulario para revisarlo y recargar.
- El alta y la edición de una cuenta guardan también los cambios pendientes de la configuración, como una sola operación.
- Desactivar retira la cuenta de nuevas selecciones. No se borran cuentas ni sus intentos de pago históricos. La cuenta y el QR del intento confirmado se conservan mediante su snapshot.
- Hay como máximo una cuenta predeterminada por cooperativa y debe estar activa. Al guardar sin elegir una, la primera activa se establece como predeterminada.
- Transferencia requiere al menos una cuenta activa. Las cuentas duplicadas y los campos incompletos se rechazan también en el servidor.
- Los bancos se obtienen del catálogo; las nuevas cuentas usan USD, número de 4 a 50 dígitos y RUC de 13 dígitos. Los registros académicos anteriores se pueden conservar sin convertirlos en cuentas comerciales.
- Los formatos y el tamaño del comprobante deben respetar los límites globales y el máximo admitido por el flujo actual (5 MB). La referencia obligatoria se aplica al subir comprobantes.
- El QR opcional admite JPG/PNG estático de hasta 5 MB. El servidor valida y normaliza la imagen y guarda metadatos y contenido juntos en PostgreSQL. No depende del disco privado de otro equipo ni de una URL pública.
- Cancelar en la pantalla principal restaura la última respuesta persistida; recargar o cambiar de cooperativa avisa si hay cambios pendientes.

## API

| Método y ruta | Operación |
|---|---|
| `GET /api/configuracion/pagos/cooperativas` | Ámbitos autorizados |
| `GET /api/configuracion/pagos/:cooperativa` | Cuentas, bancos, métodos, política y límites |
| `PUT /api/configuracion/pagos/:cooperativa` | Guardado atómico con versión |
| `GET /api/configuracion/pagos/:cooperativa/cuentas/:cuenta/qr` | QR para configuración autorizada |
| `GET /api/reservas/:reserva/cuentas/:cuenta/qr` | QR para una reserva autorizada, con snapshot del intento |

Las escrituras exigen un origen autorizado. Los errores 401/403/409/422 no exponen SQL ni secretos. Las cuentas, métodos y política conservan la auditoría existente en PostgreSQL.

## Migración y comprobaciones

`20261114_configuracion_pagos` agrega la cuenta predeterminada, la versión de política, el contenido de QR con RLS y las funciones de lectura para el cliente. No modifica importes, usuarios, contraseñas ni cuentas bancarias existentes. Debe aplicarla una vez el responsable de la base compartida antes de ejecutar este backend; los demás equipos generan su cliente Prisma y usan la misma base.

```powershell
npm --prefix frontend run build
npm --prefix backend run check:api
npm --prefix backend test
# Pruebas explícitas contra PostgreSQL: fixtures transaccionales con ROLLBACK.
$env:PROBAR_CONFIG_PAGOS_DB='1'
npm --prefix backend run test:configuracion:db
Remove-Item Env:PROBAR_CONFIG_PAGOS_DB
```

Se comprobaron alta/edición/recarga, QR válido e inválido, duplicados, cuenta predeterminada, desactivación, bloqueo de pasarelas, límites, versión obsoleta, origen ajeno y aislamiento por cooperativa. La prueba de pagos verifica además el QR de una reserva autorizada y que la edición posterior de la cuenta no cambie su snapshot; todos sus datos temporales se revierten.

Verificación final: migración aplicada a la base compartida, Prisma generado y validado; 56 pruebas del frontend, 31 del backend y dos pruebas de integración con PostgreSQL aprobadas. La interfaz se probó en Edge con una API simulada para comprobar alta, edición, recarga, conflicto y tamaños de escritorio y móvil, sin errores JavaScript ni desbordamiento horizontal.
