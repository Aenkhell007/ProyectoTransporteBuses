# Contrato de API: Compra del cliente (KT)

> Estado: vigente. Versión 0.4.0 (16/11/2026), revisada contra `develop` en `2610ce4`.
> Los campos siguen la base real (esquema `transporte`, ver `backend/conexion-bd`)
> y la convención de `docs/api/flota-endpoints.md`: español y snake_case.
> Las 19 rutas están en `backend/src/compra/router.ts` (#84, #85) y se montan bajo `/api`
> en `backend/src/server.ts`. Versiones anteriores: 0.3.0 (03/11/2026, #75).

Reemplaza los borradores `booking.contract.json`, `passengers.contract.json` y
`search-trips.contract.json` de la rama `feature/6-compra-kt`.

## Convenciones generales

- Rutas escritas sin prefijo. El servidor las monta bajo `/api` (como `/api/auth` en
  `server.ts`) y el frontend lo pone con `VITE_API_URL=/api` en el cliente `http()`.
- Los IDs son UUID (texto).
- El usuario, su rol y la cooperativa se toman de la sesión. Ninguna ruta acepta
  `usuario_id`, `cliente_id`, rol ni `cooperativa_id` en el body como autorización.
- Sesión: cookie `transporte_sesion` (httpOnly), emitida por `/api/auth` (#56). El
  frontend la envía con `credentials: "include"` (`frontend/src/features/compra/cliente.ts`).
  Una cookie ausente o con formato distinto de 43 caracteres base64url da 401.
- Cada endpoint autenticado abre el contexto con `conSesion` (`backend/src/sesion.ts`)
  en la misma transacción que sus consultas y llama la función SQL indicada. La lógica de
  disponibilidad, tarifas, descuentos e impuestos no se reescribe en TypeScript.
- Rutas públicas (catálogos, búsqueda, detalle y mapa del viaje, contacto) consultan sin sesión
  con funciones `SECURITY DEFINER` que devuelven solo datos públicos.
- `POST`, `PUT` y `DELETE` responden 403 si el encabezado `Origin` no es `FRONTEND_URL`
  ni `http://localhost:5173`, o si `Sec-Fetch-Site` es `cross-site`.
- Todas las respuestas llevan `Cache-Control: no-store`.
- Importes: enteros en centavos con sufijo `_centavos` (en la base son `BIGINT`;
  se serializan como `number` con `aNumeroSeguro`). Porcentajes en puntos base
  (`3000` = 30 %). El frontend divide entre 100 solo para mostrar.
- Fechas con zona (`2026-10-10T06:00:00-05:00`). Las fechas de calendario (`fecha`,
  `nacimiento`) van como `YYYY-MM-DD` y se interpretan en `America/Guayaquil`.
- Listas: `{ "data": [...] }`. Si paginan, agregan `"next_cursor"` (`null` al final).
- Error: `{ "codigo", "mensaje", "errores_campo": [{ "campo", "mensaje" }], "request_id" }`.
  Nunca se devuelve el stack ni el texto interno de PostgreSQL.
- Recurso de otro cliente o de otra cooperativa: 404, para no revelar que existe.

Valores de `config_global` que afectan al módulo: retención de 15 minutos,
máximo 10 pasajeros por reserva, zona `America/Guayaquil`, moneda `USD`.

## Flujo de la compra

La base resuelve la dependencia circular que tenían los borradores anteriores
(la reserva pedía `passengerIds` y los pasajeros pedían `bookingId`):
los pasajeros se guardan por asiento reservado (`reserva_asiento_id`).

```
Vista 2  GET  /viajes                         compra_buscar
Vista 3  GET  /viajes/:id/mapa-asientos       compra_detalle (mapa)
         POST /reservas                       reservar_asientos     (retiene asientos 15 min)
         PUT  /reservas/:id/asientos          compra_cambiar_asientos (volver a elegir)
Vista 4  GET  /compra/perfil, GET /reservas/:id/beneficios, POST /reservas/:id/respaldos
         PUT  /reservas/:id/pasajeros         compra_guardar_pasajeros (una transacción)
         POST /reservas/:id/cotizacion        cotizar               (nueva versión)
Vista 5  GET  /reservas/:id/resumen
         POST /reservas/:id/aceptar-cotizacion aceptar_cotizacion   (fija la versión)
Vista 6  (Ángel) recibe reserva_id con la cotización aceptada
```

- Editar el viaje desde las vistas 4 o 5: `DELETE /reservas/:id` (libera asientos) y volver a buscar.
- Guardar pasajeros anula la aceptación anterior (`aceptada_version = NULL`), así que
  después de editar pasajeros hay que volver a cotizar y aceptar.
- Si la tarifa cambió entre cotizaciones, el cliente acepta la versión nueva; el
  servidor rechaza aceptar una versión que no es la última.

### Rutas del frontend en el flujo

| Vista | Ruta | Recibe | Responsable |
|---|---|---|---|
| 1 y 1.1 | `/` | `origen`, `destino`, `fecha`, `cantidad` (opcionales, para "Editar") | KT |
| 2 | `/viajes` | `origen`, `destino`, `fecha`, `cantidad` y filtros | KT |
| 3.1 / 3.2 | `/asientos` | `viaje_id`, `origen_orden`, `destino_orden`, `cantidad`, `plano_id` | Mikel (#47) |
| 4 | `/pasajeros` | `reserva_id` | KT |
| 5 | `/resumen` | `reserva_id` | KT |
| 6 | `/pago` | `reserva_id` | Ángel |
| 7 | `/pago/comprobante` | estado de navegación de la vista 6 | Ángel |
| 7.1 | `/pago/seguimiento` | `reserva_id` | Ángel (#69) |
| 8 | `/pago/confirmacion` | `reserva_id` | Ángel (#70) |
| 9 y 9.1 | `/mis-viajes` | `seccion`, `estado`, `q`, `desde`, `hasta` | KT |
| 9.2 | `/mis-viajes/reembolso` | `reserva_id` | Ángel (#71) |
| 13 | `/oficina/comprobantes/:id` | id del comprobante; el oficinista aprueba o rechaza | Pablo (#143) |

Todas las rutas de la tabla están en `frontend/src/App.tsx` de `develop` en `2610ce4`.

## Catálogo

### GET /catalogos/ciudades

Ciudades activas para el formulario de búsqueda. Pública. Éxito: 200.

Fuente: tabla `ciudades` (`activa = true`), ordenadas por nombre.

```json
{ "data": [ { "id": "uuid", "nombre": "Quito", "provincia": "Pichincha" } ] }
```

Las tres rutas de catálogo llaman a `compra_catalogos()` (`20261105_compra_cliente`), una
función `SECURITY DEFINER` que lee solo registros activos.

### GET /catalogos/destinos

Destinos destacados del inicio (vista 1). Pública. Éxito: 200. Hasta 10 ciudades de destino
con un viaje `PUBLICADO` de salida futura y tarifa vigente, ordenadas por nombre, con la
tarifa mínima. Sin viajes publicados devuelve `{ "data": [] }`.

```json
{ "data": [ { "ciudad_id": "uuid", "nombre": "Guayaquil", "tarifa_desde_centavos": 2000 } ] }
```

`tarifa_desde_centavos` es la tarifa más baja de un tramo que termina en esa ciudad; no es una cotización.

### GET /catalogos/filtros-viajes

Opciones de los filtros de la vista 2. Pública. Éxito: 200. Cooperativas activas y valores
distintos de `chasis` y `carroceria` de los buses activos de cooperativas activas.

```json
{ "cooperativas": [ { "id": "uuid", "nombre": "Gran Continental" } ], "chasis": ["Scania"], "carrocerias": ["Marcopolo"] }
```

## Búsqueda

### GET /viajes

Pública. Éxito: 200. Llama a `compra_buscar(jsonb)` (`20261105_compra_cliente`), que
consulta todos los viajes antes de filtrar, ordenar y paginar.

| Parámetro | Obligatorio | Regla en `router.ts` |
|---|---|---|
| `origen_ciudad_id` | sí | UUID de `ciudades` |
| `destino_ciudad_id` | sí | UUID, distinto del origen |
| `fecha` | sí | `YYYY-MM-DD` real, no anterior a hoy en `America/Guayaquil` |
| `cantidad` | sí | entero de 1 a 10 |
| `cooperativa` | no | UUID de `cooperativas` |
| `clase` | no | `NORMAL` o `EJECUTIVO` |
| `chasis`, `carroceria` | no | texto de hasta 100 caracteres |
| `tipo_viaje` | no | `DIRECTO` o `CON_PARADAS` |
| `hora` | no | `MADRUGADA`, `MANANA`, `TARDE` o `NOCHE` (hora local de salida) |
| `precio_min`, `precio_max` | no | centavos enteros de 0 a 100000000; mínimo no mayor que máximo |
| `orden` | no | `salida` (por defecto) o `precio` |
| `cursor` | no | entero de 0 a 1000000: desplazamiento que devuelve `next_cursor` |

La función devuelve solo viajes `PUBLICADO` con salida futura, cooperativa,
frecuencia y bus activos, tramo con origen antes que destino (en viajes directos,
solo de la primera a la última parada), plazas libres del tramo suficientes y
tarifa vigente.

```json
{
  "data": [
    {
      "viaje_id": "uuid",
      "cooperativa": "Gran Continental",
      "salida": "2026-10-10T06:00:00-05:00",
      "llegada": "2026-10-10T14:30:00-05:00",
      "origen_orden": 1,
      "destino_orden": 3,
      "tipo_viaje": "DIRECTO",
      "clases": ["EJECUTIVO"],
      "origen": { "orden": 1, "ciudad": "Quito", "terminal": "Terminal Quitumbe" },
      "destino": { "orden": 3, "ciudad": "Guayaquil", "terminal": "Terminal Terrestre" },
      "bus": {
        "id": "uuid", "unidad": "018", "placa": "PAB-1234",
        "chasis": "Scania", "carroceria": "Marcopolo", "grupo": "Ejecutivo", "plano_id": "uuid",
        "pisos": 2, "foto_url": null,
        "servicios": ["AIRE", "ASIENTO_CAMA", "WIFI", "BANO", "PANTALLAS", "ENCHUFES"]
      },
      "plazas_disponibles": 12,
      "tarifa_desde_centavos": 2800
    }
  ],
  "next_cursor": "uuid-o-null"
}
```

- `plazas_disponibles` es el número de asientos libres del tramo, no el número de resultados.
- `tarifa_desde_centavos` es el precio mínimo por pasajero; no es una cotización.
- La función devuelve `bus.planoId`; la API lo expone como `plano_id`.

Campos que la API agrega a cada fila de `buscar_viajes` (la vista 2 los muestra en
`TripCard` y la tarjeta no debe pedir el detalle uno por uno):

| Campo | Fuente |
|---|---|
| `tipo_viaje` | `frecuencias.tipo_viaje` |
| `clases` | códigos de `clases_asiento` con tarifa vigente en el tramo |
| `origen`, `destino` | `ruta_paradas.orden` → `terminales.nombre` → `ciudades.nombre` |
| `bus.pisos` | `planos.pisos` del `plano_id` del viaje |
| `bus.foto_url` | `bus_fotos` con menor `orden` → `archivos`; la API entrega una URL propia para servir el archivo privado, o `null` |
| `bus.servicios` | `bus_equipamiento` → `equipamientos.codigo`; los códigos se acuerdan con los de `ServicioBus` (`frontend/src/types/compra/viajes.ts`) |

Se resuelven con una consulta adicional por página, unida por `viaje_id`, no por fila.

Errores: 422 junto al parámetro (`errores_campo`): identificador, fecha, cantidad o filtro no válido,
origen igual a destino, fecha pasada, precio mínimo mayor que el máximo.

### GET /viajes/:id

Detalle del viaje y del bus para "Ver detalles del bus". Pública mientras el viaje
esté publicado. Éxito: 200. Llama a `compra_detalle(viaje, origen_orden, destino_orden)`;
`origen_orden` y `destino_orden` son opcionales en esta ruta.

```json
{
  "viaje_id": "uuid",
  "tipo_viaje": "DIRECTO",
  "salida": "2026-10-10T06:00:00-05:00",
  "llegada": "2026-10-10T14:30:00-05:00",
  "bus": { "id": "uuid", "unidad": "018", "placa": "PAB-1234", "chasis": "Scania", "carroceria": "Marcopolo", "pisos": 2, "fotos": [], "servicios": [] },
  "paradas": [ { "orden": 1, "terminal_id": "uuid", "terminal": "Terminal Quitumbe", "ciudad": "Quito" } ]
}
```

Errores: 404 (no existe o no está publicado), 422 (identificador u orden no válido).

### GET /viajes/:id/mapa-asientos

Mapa de asientos del tramo para las vistas 3.1 y 3.2 de Mikel. Pública. Éxito: 200.
Parámetros obligatorios: `origen_orden` (entero de 0 a 10000) y `destino_orden` (de 1 a 10000).
Devuelve la clave `mapa` de `compra_detalle`, que sale de `plano_disponible(viaje, origen, destino)`
(`0_base_transporte`): un asiento ocupado en un tramo que se cruza con el pedido no está disponible.

```json
{ "planoId": "uuid", "celdas": [ { "id": "uuid", "piso": 1, "fila": 1, "columna": 1, "tipo": "ASIENTO", "codigo": "N1", "clase": "NORMAL", "estado": "DISPONIBLE" } ] }
```

`celdas[].id` es el valor que va en `asiento_ids` de `POST /reservas`. Errores: 404 y 422 como en `GET /viajes/:id`.

## Reserva

### POST /reservas

Cliente autenticado. Éxito: 201. Llama a `reservar_asientos(viaje, origen, destino, asientos[])`
sin `p_cliente` ni `p_oficina` (la venta en oficina es de Pablo).
Se invoca al confirmar asientos en las vistas 3.1/3.2 (decisión 4).

```json
{ "viaje_id": "uuid", "origen_orden": 1, "destino_orden": 3, "asiento_ids": ["uuid", "uuid"] }
```

`asiento_ids` son IDs de `plano_celdas` (tipo `ASIENTO`), no el código visible del asiento.

```json
{
  "reserva_id": "uuid",
  "estado": "PENDIENTE",
  "expires_at": "2026-10-09T10:15:00-05:00",
  "asientos": [ { "reserva_asiento_id": "uuid", "asiento_id": "uuid", "codigo": "U8", "piso": 2 } ]
}
```

La función retiene los asientos hasta `expires_at` (15 minutos o la salida, lo
que ocurra antes). La restricción `EXCLUDE` de `reserva_asientos` impide dos
retenciones del mismo asiento en tramos que se cruzan.

### PUT /reservas/:id/asientos

Cambia los asientos de una reserva pendiente sin crear otra (volver de la vista 4 a la 3).
Cliente autenticado dueño de la reserva. Éxito: 200 con el mismo cuerpo de
`GET /reservas/:id/resumen`. Llama a `compra_cambiar_asientos(reserva, version, asientos[])`
(`20261106_edicion_asientos_pasajeros`). Guía: `docs/edicion-asientos-pasajeros.md`.

```json
{ "asiento_ids": ["uuid", "uuid"], "version": 1 }
```

- `asiento_ids`: de 1 a 10 UUID distintos; la cantidad debe ser la de la reserva.
- `version`: `edicion_asientos_version` leída del resumen. Si otra pestaña cambió los asientos, la función rechaza la versión.
- Si los asientos son los mismos, devuelve el resumen sin cambios.

Errores: 401; 404 si la reserva es de otro cliente (`Reserva no disponible`, 42501); 409 si la
reserva no es editable, la versión cambió (`Otra pestaña modifico los asientos`), la retención venció
o un asiento está retenido en un tramo que se cruza (23P01); 422 si la cantidad no coincide o un
asiento no es del plano (`Asientos no disponibles`, 22023).

### DELETE /reservas/:id

Cancela una reserva pendiente y libera sus asientos. Éxito: 204. Llama a
`cancelar_reserva_pendiente`. Es idempotente si ya estaba cancelada.

## Pasajeros

### GET /compra/perfil

Datos del usuario de la sesión para la casilla "Usar mis datos de perfil" de la vista 4. Cliente
autenticado. Éxito: 200. Lee `usuarios` con `id = transporte.actor()`; nunca otro usuario.

```json
{ "nombres": "...", "apellidos": "...", "tipo_documento": "CEDULA", "documento": "...", "nacimiento": "YYYY-MM-DD", "telefono": "...", "email": "..." }
```

La vista 4 copia estos datos en la ficha del comprador solo si el cliente marca la casilla. Errores: 401.

### GET /reservas/:id/beneficios

Beneficios que la vista 4 ofrece para la reserva. Cliente autenticado dueño de la reserva.
Éxito: 200. Llama a `compra_beneficios(reserva)`: beneficios de la cooperativa del viaje con
`activo = true` y vigencia que incluye la fecha de salida.

```json
{ "data": [ { "codigo": "NINO", "nombre": "...", "activo": true, "descuento_bp": 0, "edad_min": null, "edad_max_exclusiva": null, "condiciones": null, "requiere_respaldo": false } ] }
```

Los valores de `descuento_bp`, `edad_min` y `edad_max_exclusiva` salen de la tabla `beneficios`; el
ejemplo no los fija.

Sin beneficios activos devuelve `{ "data": [] }` y la vista 4 no ofrece descuento: `beneficios.activo`
es `false` por defecto y el repositorio no carga beneficios. Errores: 401, 404.

### POST /reservas/:id/respaldos

Sube el documento de respaldo de un beneficio (por ejemplo, el carné de discapacidad). Cliente
autenticado dueño de la reserva. Éxito: 201.

- Cuerpo: el archivo en binario, con `Content-Type` `image/jpeg`, `image/png` o `application/pdf`, hasta 5 MB.
- Encabezado `X-File-Name`: nombre original codificado con `encodeURIComponent`; el servidor lo normaliza.
- El servidor valida el tipo por contenido (`validarArchivo` de `backend/src/pagos/validacion.ts`) y guarda con `guardarArchivo` como `RESPALDO`.

```json
{ "archivo_id": "uuid" }
```

`archivo_id` va en `respaldo_archivo_id` del pasajero. Errores: 401, 404, 409 si la reserva ya no está
`PENDIENTE`, 413 si el archivo pasa de 5 MB, 422 si está vacío o el tipo no coincide con el contenido.

### PUT /reservas/:id/pasajeros

Cliente autenticado dueño de la reserva. Éxito: 200. Guarda todos los pasajeros y el
contacto de la reserva en una sola transacción con `compra_guardar_pasajeros(reserva, datos)`
(`20261105_compra_cliente`), que llama a `guardar_pasajero` por asiento.

```json
{
  "contacto": { "email": "comprador@example.com", "telefono": "+593991234567" },
  "pasajeros": [
    {
      "reserva_asiento_id": "uuid",
      "nombres": "Ángel Matías",
      "apellidos": "Galarza",
      "tipo_documento": "CEDULA",
      "documento": "<10 dígitos>",
      "nacimiento": "1992-03-15",
      "beneficio_codigo": null,
      "respaldo_archivo_id": null
    }
  ]
}
```

Correspondencia con el `jsonb` de `guardar_pasajero`:

| Campo API | Clave jsonb | Columna `pasajeros` |
|---|---|---|
| `nombres` | `nombres` | `nombres` varchar(100) |
| `apellidos` | `apellidos` | `apellidos` varchar(100) |
| `tipo_documento` | `tipoDocumento` | `CEDULA`, `PASAPORTE` u `OTRO` |
| `documento` | `documento` | varchar(30) |
| `nacimiento` | `nacimiento` | date, no futura |
| `beneficio_codigo` | `beneficio` | `NINO`, `TERCERA_EDAD`, `DISCAPACIDAD` o `null` (adulto) |
| `respaldo_archivo_id` | `respaldoArchivoId` | archivo validado por el servidor |

Reglas:
- Un pasajero por asiento de la reserva y ningún asiento repetido.
- `nombres`, `apellidos`, `tipo_documento` y `documento` obligatorios.
- La edad para el beneficio se calcula en `cotizar` a la fecha de salida, no a hoy.
- El nacimiento no se deduce de la cédula.
- Registrar un acompañante no crea una cuenta de usuario.
- El contacto del comprador es obligatorio: `contacto.email` (correo de hasta 254 caracteres) y
  `contacto.telefono` (7 a 15 dígitos, `+` opcional). Se guardan en `reservas.contacto_email` y
  `reservas.contacto_telefono`.
- Cada pasajero acepta `telefono` y `email` opcionales y `tipo_pasajero` (`ADULTO`, `NINO`,
  `TERCERA_EDAD` o `DISCAPACIDAD`); se guardan en `pasajeros.telefono`, `pasajeros.email` y
  `pasajeros.tipo_pasajero`.
- Con `tipo_documento = CEDULA`, `documento` debe tener 10 dígitos (`validarPasajeros` en `router.ts`).

Respuesta: `{ "data": ... }` con lo que devuelve `compra_guardar_pasajeros`.

## Cotización

### POST /reservas/:id/cotizacion

Crea una nueva versión de cotización. Éxito: 201. Llama a `cotizar` y lee
`cotizaciones` y `cotizacion_lineas`.

```json
{
  "version": 1,
  "moneda": "USD",
  "base_centavos": 5600,
  "descuento_centavos": 840,
  "servicio_centavos": 0,
  "subtotal_neto_centavos": 4760,
  "iva_centavos": 0,
  "total_centavos": 4760,
  "impuesto_bp": 0,
  "expires_at": "2026-10-09T10:15:00-05:00",
  "lineas": [
    {
      "reserva_asiento_id": "uuid",
      "asiento_codigo": "U8",
      "pasajero": "Ángel Matías Galarza",
      "clase": "EJECUTIVO",
      "beneficio_codigo": null,
      "beneficio_nombre": null,
      "descuento_bp": null,
      "base_centavos": 2800,
      "descuento_centavos": 0,
      "servicio_centavos": 0,
      "impuesto_bp": 0,
      "impuesto_servicio_bp": 0,
      "iva_centavos": 0,
      "subtotal_neto_centavos": 2800,
      "total_centavos": 2800
    }
  ]
}
```

Campos que la API agrega a lo que guardan `cotizaciones` y `cotizacion_lineas`, para
que el frontend muestre sin calcular (`PriceBreakdown`, vista 5; también sirve a las
vistas 6, 7 y 8 de Ángel y 13 y 14 de Pablo):

| Campo | Cálculo en la API |
|---|---|
| `impuesto_bp` (cabecera) | `impuestos.puntos_base` del pasaje; da la etiqueta "IVA (0 %)" |
| `lineas[].subtotal_neto_centavos` | `base − descuento + servicio` de la línea |
| `lineas[].total_centavos` | `subtotal_neto + iva` de la línea |
| `lineas[].beneficio_nombre`, `descuento_bp` | `beneficios.nombre` y `descuento_bp` del `beneficio_id` |
| `lineas[].asiento_codigo`, `pasajero`, `clase` | `plano_celdas.codigo`, `pasajeros` y `clases_asiento.codigo` |

Reglas que aplica la función:
- Tarifa por frecuencia, grupo de bus, clase y tramo vigente a la fecha de salida.
- Descuento = `round(precio × descuento_bp / 10000)` solo si el beneficio está activo y vigente.
- IVA redondeado por línea y luego sumado. El pasaje terrestre lleva el impuesto
  configurado (0 % en la demo), no 15 %.
- `subtotal_neto = base − descuento + servicio` y `total = subtotal_neto + iva`
  (la tabla lo exige con un `CHECK`).
- Discapacidad exige `respaldo_archivo_id`.

`expires_at` es el de la reserva: la cotización no prorroga la retención.

### GET /reservas/:id/resumen

Datos de la vista 5. Éxito: 200. Fuente: `reservas`, `viajes`, `buses`,
`reserva_asientos`, `pasajeros` y la última fila de `cotizaciones` con sus líneas.

```json
{
  "reserva_id": "uuid",
  "estado": "PENDIENTE",
  "expires_at": "2026-10-09T10:15:00-05:00",
  "viaje": { "viaje_id": "uuid", "salida": "...", "llegada": "...", "origen": {}, "destino": {} },
  "bus": { "unidad": "018", "placa": "PAB-1234", "chasis": "Scania", "carroceria": "Marcopolo Paradiso 1800 DD", "clase": "EJECUTIVO", "servicios": [] },
  "pasajeros": [ { "reserva_asiento_id": "uuid", "asiento_codigo": "U8", "piso": 2, "nombres": "...", "apellidos": "...", "tipo_documento": "CEDULA", "documento": "...", "beneficio_codigo": null } ],
  "cotizacion": { "version": 1, "total_centavos": 4760, "lineas": [] },
  "aceptada_version": null
}
```

### POST /reservas/:id/aceptar-cotizacion

Fija la versión mostrada antes del pago. Éxito: 204. Llama a `aceptar_cotizacion`.

```json
{ "version": 1 }
```

Después, el frontend navega a `/pago?reserva_id=<id>` (vista 6 de Ángel).

## Mis viajes

### GET /mis-viajes

Cliente autenticado. Éxito: 200. Solo compras propias, filtradas por la sesión.

| Parámetro | Valores |
|---|---|
| `seccion` | `proximos` o `historial` |
| `estado` | estado de compra o `PAGO_EN_VERIFICACION` |
| `q` | código de compra o ciudad de destino |
| `desde`, `hasta` | fechas de salida `YYYY-MM-DD` (solo historial) |
| `cursor` | `next_cursor` de la página anterior |

Fuente: vista `v_mis_viajes` (sección `PROXIMOS` si la salida es futura y la compra
está `CONFIRMADA`; si no, `HISTORIAL`) y, para las tarjetas "Pago en verificación",
reservas `PENDIENTE` con un intento de pago `EN_REVISION` (decisión 8).
Orden estable por salida y `compra_id` con cursor.

```json
{
  "data": [
    {
      "tipo": "COMPRA",
      "compra_id": "uuid",
      "reserva_id": "uuid",
      "codigo": "GC-20261010-4587",
      "estado": "CONFIRMADA",
      "salida": "2026-10-10T06:00:00-05:00",
      "llegada": "2026-10-10T14:30:00-05:00",
      "origen": { "ciudad": "Quito", "terminal": "Terminal Quitumbe" },
      "destino": { "ciudad": "Guayaquil", "terminal": "Terminal Terrestre" },
      "clase": "EJECUTIVO",
      "pasajeros": ["Ángel Matías Galarza", "María Fernanda Galarza"],
      "asientos": ["U8", "U9"],
      "total_pagado_centavos": 4760,
      "monto_reportado_centavos": null,
      "boleto_id": "uuid",
      "estado_documento": "LISTO"
    }
  ],
  "next_cursor": null
}
```

- `total_pagado_centavos` sale de `compras` y se muestra como "Total pagado".
- `monto_esperado_centavos` sale de `intentos_pago.total_centavos` (o de `reservas.total_centavos`)
  y se muestra como "Importe por verificar" en una reserva con pago en verificación.
- `monto_reportado_centavos`: sin uso en el frontend, decisión de #94. `comprobantes` no tiene
  columna de monto y `backend/src/compra/misViajes.ts` lo envía en `null`.
- Los datos de viaje y precio salen del snapshot de la compra; no se recalculan con tarifas actuales.
- Ver boleto, Descargar PDF y Ver reserva abren las vistas 8 y 7.1 de Ángel; la descarga
  es un endpoint de Ángel que vuelve a verificar la propiedad.
- `codigo` es un UUID (`compras.codigo`, o el `id` de la reserva si no hay compra). Mis viajes muestra
  `codigoCorto(codigo)` (`frontend/src/features/compra/codigo.ts`): los 8 primeros caracteres sin
  guiones, en mayúsculas; el UUID completo queda en el atributo `title`. Buscar esos 8 caracteres en
  `q` encuentra la reserva porque `misViajes.ts` compara con `ILIKE`. Decisión de #95 (opción b).
- `estado` admite `CONFIRMADA`, `PAGO_EN_VERIFICACION`, `FINALIZADO`, `CANCELADA`, `REEMBOLSADA`,
  `VENCIDA`, `PENDIENTE_PAGO` y `RECHAZADA`. `q` admite hasta 60 caracteres. `cursor` es un entero de 0 a 100000.
- Errores: 401; 422 si la sección, el estado, las fechas o la búsqueda no son válidos, o `desde` es posterior a `hasta`.

### GET /mis-viajes/:id

Una tarjeta de Mis viajes, con el mismo formato que cada elemento de `data` de `GET /mis-viajes`.
Cliente autenticado. Éxito: 200. `:id` puede ser el `id` de la reserva o de la compra.

- Busca la reserva con `cliente_id = transporte.actor()`. Una reserva o compra de otro cliente da 404.
- Lee el estado con `consultar_pago_cliente` (`20261104_consulta_pago_cliente`) y lo traduce:
  compra `CONFIRMADA` con salida futura es `CONFIRMADA` y con salida pasada `FINALIZADO`; sin compra,
  `CANCELADA`, `VENCIDA`, `PAGO_EN_VERIFICACION` (intento `EN_REVISION`), `RECHAZADA` o `PENDIENTE_PAGO`.
- Errores: 401, 404, 422 si el identificador no es un UUID.

## Contacto

### POST /contacto

Pública. Éxito: 201. Llama a `enviar_contacto`. No crea reservas.

```json
{ "cooperativa_id": "uuid-o-null", "nombre": "Ana Pérez", "email": "ana@example.com", "asunto": "Equipaje", "mensaje": "...", "consentimiento_version": "privacidad-v1" }
```

Límites de la tabla `contactos`: nombre 150, asunto 150, mensaje 4000, correo 254;
`consentimiento_version` hasta 100. La API acepta un envío por IP cada 60 segundos y responde 429
("Espera un minuto antes de volver a enviar.") al segundo. El registro de envíos vive en la
memoria del proceso y se pierde al reiniciar el servidor.

La vista 1.1 envía hoy `cooperativa_id: null` (`ContactoSeccion.tsx`) y la versión
`privacidad-borrador-2026-10`: los canales y la política dependen de #97, #120 y #96, #121.

## Mapeo de errores de las funciones SQL

Textos exactos de `prisma/migrations/0_base_transporte/migration.sql`. La API
traduce el error y no reenvía el texto de PostgreSQL.

| Origen | Mensaje o código | HTTP | `codigo` sugerido |
|---|---|---|---|
| `abrir_contexto` | `Sesion ausente, revocada o vencida` (28000) | 401 | `SESION_INVALIDA` |
| `reservar_asientos` | `Inicie sesion` (28000) | 401 | `SESION_REQUERIDA` |
| `reserva_autorizada` | `Reserva no accesible` (42501) | 404 | `RESERVA_NO_ENCONTRADA` |
| `exigir` | `Sin permiso: ...` (42501) | 403 | `SIN_PERMISO` |
| `reservar_asientos` | `Viaje no vendible` | 409 | `VIAJE_NO_VENDIBLE` |
| `reservar_asientos` | `Frecuencia inactiva` | 409 | `VIAJE_NO_VENDIBLE` |
| `reserva_asientos` | violación de `EXCLUDE` (23P01) | 409 | `ASIENTO_NO_DISPONIBLE` |
| `reservar_asientos` | `Cantidad o IDs de asiento invalidos` | 422 | `ASIENTOS_INVALIDOS` |
| `reservar_asientos` | `Tramo no valido` | 422 | `TRAMO_INVALIDO` |
| `reservar_asientos` | `Viaje directo no vende intermedias` | 422 | `TRAMO_INVALIDO` |
| `reservar_asientos` | `Asiento ajeno al plano o no vendible` | 422 | `ASIENTOS_INVALIDOS` |
| `guardar_pasajero` | `Reserva no editable; resuelva o anule el intento antes` | 409 | `RESERVA_NO_EDITABLE` |
| `guardar_pasajero` | `Nacimiento futuro` | 422 | `NACIMIENTO_FUTURO` |
| `cotizar` | `No puede recotizar esta reserva` | 409 | `RESERVA_NO_EDITABLE` |
| `cotizar` | `Complete un pasajero por asiento` | 422 | `PASAJEROS_INCOMPLETOS` |
| `cotizar` | `Beneficio no definido o inactivo` | 422 | `BENEFICIO_NO_VIGENTE` |
| `cotizar` | `Edad no elegible` | 422 | `EDAD_NO_ELEGIBLE` |
| `cotizar` | `Falta respaldo de beneficio` | 422 | `FALTA_RESPALDO` |
| `cotizar` | `Falta tarifa para tramo/clase/fecha` | 409 | `TARIFA_NO_DISPONIBLE` |
| `cotizar` | `Impuesto no definido` | 500 | `CONFIGURACION_INCOMPLETA` |
| `aceptar_cotizacion` | `Cotizacion vencida o version incorrecta` | 409 | `COTIZACION_DESACTUALIZADA` |
| `cancelar_reserva_pendiente` | `Debe conciliar el pago o usar solicitud de reembolso` | 409 | `RESERVA_CON_PAGO` |
| `enviar_contacto` | `Datos de contacto invalidos` | 422 | `CONTACTO_INVALIDO` |
| restricción `CHECK` o tipo | 23514, 22P02, 22007 | 422 | `DATOS_INVALIDOS` |

El código 42501 se usa tanto para recursos ajenos como para falta de permiso: la
API distingue por el mensaje (`Reserva no accesible` → 404; `Sin permiso` → 403).

En `develop` (`2610ce4`), `router.ts` responde `codigo` como `COMPRA_<estado HTTP>` (por ejemplo
`COMPRA_409`) y no usa los códigos sugeridos de la tabla. Traduce por código de PostgreSQL:
28000 → 401; 42501 y P0002 → 404; P0001, 23505 y 23P01 → 409; 22023, 23514, 22P02, 22007, 22008 y
22001 → 422; cualquier otro → 503. Los mensajes de la tabla con 422 o 500 se lanzan sin
`ERRCODE` (P0001), así que hoy responden 409 con "La reserva, disponibilidad o tarifa cambió.
Actualiza la consulta.", y `Sin permiso` (42501) responde 404. La columna "HTTP" es la respuesta
propuesta en la versión 0.3.0. El frontend valida antes los casos de 422 (nacimiento futuro,
pasajeros incompletos, contacto). <!-- PENDIENTE: issue para alinear router.ts con la tabla; revisión de Ángel -->.

En el frontend: 422 se muestra junto al campo (`errores_campo`); 401 pide iniciar
sesión; 403 informa falta de permiso; 409 pide actualizar disponibilidad o versión;
un error de red conserva lo escrito y permite reintentar.

## Decisiones

Estado al 16/11/2026 (`develop` en `2610ce4`). Las filas 1 a 13 son las de la versión 0.3.0.

| # | Tema | Situación | Estado | Responsable |
|---|---|---|---|---|
| 1 | Servidor Express | `backend/src/server.ts` monta las rutas de compra bajo `/api`. | Resuelta (#56, #84) | Ángel |
| 2 | Autenticación | Cookie `transporte_sesion` y `conSesion`; el JWT del PR #29 no se usa. | Resuelta (#56) | Matías y Ángel |
| 3 | Orden reserva → pasajeros → cotización | Implementado con la API real. | Resuelta (#38, #84) | Ángel y KT |
| 4 | Quién llama `POST /reservas` | `SeleccionAsientosPage.tsx` de Mikel usa `reservaApi.ts` de KT y navega a `/pasajeros?reserva_id=`. | Resuelta (#81) | Mikel y KT |
| 5 | Historial por pasajero | El docente pidió que un pasajero vea los viajes comprados por otro; el maestro prohíbe vincular por cédula sin identidad verificada. `misViajes.ts` filtra por `cliente_id`. | Abierta (#119, comité) | Ángel y KT |
| 6 | Filtros de búsqueda | `compra_buscar` filtra por hora y precio y ordena por salida o precio antes de paginar. | Resuelta (#84) | KT |
| 7 | Contacto de la reserva | `compra_guardar_pasajeros` guarda `contacto_email` y `contacto_telefono`. | Resuelta (#84) | KT |
| 8 | "Pago en verificación" en Mis viajes | `misViajes.ts` une compras y reservas pendientes con su intento de pago. | Resuelta (#84) | Ángel |
| 9 | Nombres de campos | Español y snake_case, como el contrato de flota. | Resuelta (#38) | Equipo |
| 10 | Beneficios | La categoría es fija (#85) y el descuento depende de una regla activa en `beneficios`. Tercera edad y discapacidad sin porcentaje aprobado; el repositorio no carga beneficios. | Abierta | Benjamín (vista 19.2) |
| 11 | Contacto de acompañantes | `20261105_compra_cliente` agrega `pasajeros.email` y `pasajeros.telefono`. | Resuelta (#84) | KT |
| 12 | Código de compra visible | Mis viajes muestra los 8 primeros caracteres del UUID en mayúsculas (`codigoCorto`). | Resuelta (#129, #95) | KT |
| 13 | Rutas entre módulos | Todas las rutas de la tabla "Rutas del frontend en el flujo" están en `App.tsx`. | Resuelta | Mikel, Ángel y KT |
| 14 | Canales de contacto públicos | `config_cooperativa` guarda WhatsApp, correo y teléfono desde #142, pero la política RLS exige `cooperativa.leer`: un visitante sin sesión no los lee. Falta una función pública y una ruta. | Abierta (#120, #97) | Ángel y KT |
| 15 | Política de privacidad | Sin texto aprobado; la vista 1.1 envía `privacidad-borrador-2026-10` y enlaza `/privacidad`, que no existe. | Abierta (#121, #96) | Matías y KT |
| 16 | Cooperativa del formulario de contacto | `POST /contacto` recibe `cooperativa_id: null` desde la vista 1.1. | Abierta | KT |
