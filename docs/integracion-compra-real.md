# Compra con datos de PostgreSQL (vistas 1 a 8)

La rama `feature/integracion-compra-real` conecta el catálogo, la búsqueda, el mapa de asientos, la reserva, los pasajeros y la cotización con la API. Las vistas 6, 7, 7.1 y 8 consultan la misma reserva y los endpoints de pagos existentes. Ninguno de estos servicios importa los mocks de compra ni aprueba pagos desde el navegador.

## Instalación y arranque local

Desde la raíz del repositorio, después de configurar las variables privadas existentes:

```sh
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend/conexion-bd ci
npm --prefix backend/conexion-bd run db:deploy
npm --prefix backend/conexion-bd run db:generate
```

La migración `20261105_compra_cliente` agrega las funciones de consulta/guardado y los contactos opcionales de pasajeros. No reinicia la base ni carga viajes de demostración. Requiere el baseline existente y las migraciones de activación/pagos anteriores. `DIRECT_URL` se usa únicamente para administrar migraciones; el servidor mantiene `DATABASE_URL` con el rol limitado `transporte_app`.

Para usar el puerto 4176, en el archivo privado `backend/.env` establece `FRONTEND_URL=http://127.0.0.1:4176`, conservando `PORT=3000` y las demás variables. Reinicia el backend. El frontend puede usar el proxy de Vite con `VITE_API_URL=/api` en `frontend/.env.local`.

En dos terminales:

```sh
npm --prefix backend run dev
```

```sh
npm --prefix frontend run dev -- --port 4176
```

Abre `http://127.0.0.1:4176/`. No compartas ni subas los archivos `.env`.

## Datos necesarios para una prueba manual

Antes de buscar debe existir una cooperativa activa con frecuencia/ruta y paradas, bus activo, plano y asientos activos, tarifas vigentes y un viaje futuro `PUBLICADO`. Para pagar necesita además método manual habilitado, cuenta receptora activa y política de comprobantes. Los descuentos se obtienen de los beneficios vigentes de esa cooperativa; el navegador no decide importes ni porcentajes.

La comprobación inicial del 05/11/2026 encontró siete ciudades, ninguna cooperativa activa y ningún viaje futuro publicado. Posteriormente se prepararon viajes académicos persistidos para comprobar el recorrido. No son servicios comerciales ni fallbacks del frontend. Los datos operativos definitivos deben cargarse/publicarse mediante los módulos del equipo.

## Recorrido y autorizaciones

1. Iniciar sesión con cuenta activada o buscar como visitante desde `/`.
2. Elegir un viaje en `/viajes`. La selección usa sus identificadores y tramo reales.
3. En `/asientos`, elegir un asiento por pasajero. Para reservar se exige sesión. El servidor comprueba disponibilidad y bloquea el tramo; un conflicto devuelve 409 y recarga el mapa.
4. `/pasajeros?reserva_id=…` recupera la reserva del titular, guarda los datos y los contactos, y obtiene la cotización calculada por PostgreSQL. Los respaldos se validan y guardan en almacenamiento privado.
5. `/resumen?reserva_id=…` muestra importes del servidor. Aceptar una versión desactualizada no permite continuar al pago.
6. `/pago?reserva_id=…` carga métodos/cuentas reales y crea un intento con clave de idempotencia.
7. `/pago/comprobante?reserva_id=…` envía el archivo al servidor. Subirlo deja el pago en revisión; no emite boleto.
8. `/pago/seguimiento?reserva_id=…` consulta el estado cada 15 segundos mientras la pestaña está visible. Permite consultar el rechazo/reenvío y acceder a la confirmación cuando corresponde.
9. La aprobación pertenece al personal con `pagos.revisar` en el ámbito de la cooperativa. Su bandeja debe consumir `POST /api/pagos/comprobantes/:id/revision` con `{aprobar, motivo, version}`. Ese endpoint valida permisos en PostgreSQL y genera el PDF al aprobar. El cliente no tiene un botón para aprobarse a sí mismo.
10. `/pago/confirmacion?reserva_id=…` permite consultar QR/PDF solo con compra confirmada y documento listo. El archivo es privado y requiere sesión. Una falla de emisión debe reintentarse por personal autorizado mediante `POST /api/pagos/compras/:id/documento`.

La interfaz de revisión del oficinista pertenece a su módulo y no se reemplaza aquí. WhatsApp automático y el envío automático del boleto por correo no están conectados: compartir manualmente un enlace no acredita entrega de una notificación. La vista 9 «Mis viajes» consulta las reservas del titular mediante la API y permite acceder al documento privado cuando está disponible. Las solicitudes de reembolso conservan su integración pendiente.

## Comprobaciones

```sh
npm --prefix backend run check:api
npm --prefix backend run test:auth
npm --prefix backend run test:compra
npm --prefix backend run test:pagos
npm --prefix frontend run build
```

Prueba explícita contra PostgreSQL, con fixtures dentro de una transacción revertida (no envía correos ni WhatsApp):

```sh
PROBAR_PAGOS_DB=1 npm --prefix backend run test:pagos:db
```

En PowerShell usa `$env:PROBAR_PAGOS_DB='1'` antes del comando. Comprueba consulta, reserva, persistencia de pasajeros, cotización, aceptación, aislamiento entre usuarios, subida/rechazo/reenvío, permisos de revisión, aprobación y PDF/QR. No sustituye la aceptación manual de las vistas con los datos operativos del proyecto ni acredita igualdad visual exacta con las maquetas.
