# Contrato de API: Compra del cliente (KT)

> Estado: propuesta para revisión del equipo. Versión 0.3.0 (03/11/2026, issue #75).
> Los campos siguen la base real (esquema `transporte`, ver `backend/conexion-bd`)
> y la convención ya fusionada en `docs/api/flota-endpoints.md`: español y snake_case.
> Ninguna ruta de compra está implementada todavía. El servidor Express se propone en
> el PR #56 (`backend/src/server.ts`); las rutas de compra se montarán en él.

Reemplaza los borradores `booking.contract.json`, `passengers.contract.json` y
`search-trips.contract.json` de la rama `feature/6-compra-kt`.

## Convenciones generales

- Rutas escritas sin prefijo. El servidor las monta bajo `/api` (como `/api/auth` en
  `server.ts`) y el frontend lo pone con `VITE_API_URL=/api` en el cliente `http()`.
- Los IDs son UUID (texto).
- El usuario, su rol y la cooperativa se toman de la sesión. Ninguna ruta acepta
  `usuario_id`, `cliente_id`, rol ni `cooperativa_id` en el body como autorización.
- Sesión: cookie `transporte_sesion` (httpOnly), emitida por `/api/auth` (PR #56). El
  frontend la envía con `credentials: "include"`, como ya hace `http()`.
- Cada endpoint autenticado abre el contexto con `abrir_contexto(hash del token)` en la
  misma transacción que sus consultas (`conSesion`; se propone compartirlo desde
  `backend/src/sesion.ts`) y llama la función SQL indicada. La lógica de
  disponibilidad, tarifas, descuentos e impuestos no se reescribe en TypeScript.
- Rutas públicas (catálogo, búsqueda, contacto) consultan sin sesión.
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
Vista 2  GET  /viajes                         buscar_viajes
Vista 3  POST /reservas                       reservar_asientos     (retiene asientos 15 min)
Vista 4  PUT  /reservas/:id/pasajeros         guardar_pasajero x N  (una transacción)
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

Las rutas de Mikel y Ángel están en PR abiertos; si cambian, se actualiza esta tabla.

## Catálogo

### GET /catalogos/ciudades

Ciudades activas para el formulario de búsqueda. Pública. Éxito: 200.

Fuente: tabla `ciudades` (`activa = true`), ordenadas por nombre.

```json
{ "data": [ { "id": "uuid", "nombre": "Quito", "provincia": "Pichincha" } ] }
```

## Búsqueda

### GET /viajes

Pública. Éxito: 200. Llama a `buscar_viajes`.

| Parámetro | Obligatorio | Argumento SQL | Regla |
|---|---|---|---|
| `origen_ciudad_id` | sí | `p_origen_ciudad` | UUID de `ciudades` |
| `destino_ciudad_id` | sí | `p_destino_ciudad` | distinto del origen |
| `fecha` | sí | `p_fecha` | `YYYY-MM-DD`, no anterior a hoy en Ecuador |
| `cantidad` | sí | `p_cantidad` | entero entre 1 y `limite_pasajeros` |
| `cooperativa_id` | no | `p_cooperativa` | |
| `clase` | no | `p_clase` | `NORMAL` o `EJECUTIVO` (códigos de `clases_asiento`) |
| `chasis` | no | `p_chasis` | coincidencia parcial sin mayúsculas |
| `carroceria` | no | `p_carroceria` | coincidencia parcial sin mayúsculas |
| `tipo_viaje` | no | `p_tipo` | `DIRECTO` o `CON_PARADAS` |
| `cursor` | no | `p_desde` | `next_cursor` de la página anterior |

La función devuelve solo viajes `PUBLICADO` con salida futura, cooperativa,
frecuencia y bus activos, tramo con origen antes que destino (en viajes directos,
solo de la primera a la última parada), plazas libres del tramo suficientes y
tarifa vigente. Ordena por `viaje_id` y devuelve como máximo 50.

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

Errores: 422 (parámetros inválidos, origen igual a destino, fecha pasada).

Limitaciones conocidas (ver decisión 6): `buscar_viajes` no filtra por hora de
salida ni por rango de precio y solo ordena por `viaje_id`. Aplicar esos filtros en
la API sobre las 50 filas rompe la paginación. Se pedirá el cambio de la función
mediante solicitud de cambio.

### GET /viajes/:id

Detalle del viaje y del bus para "Ver detalles del bus". Pública mientras el viaje
esté publicado. Éxito: 200. Fuente: `viajes`, `buses`, `bus_fotos`,
`bus_equipamiento`, `frecuencias`, `ruta_paradas`, `terminales`.

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

Errores: 404 (no existe o no está publicado).

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

### DELETE /reservas/:id

Cancela una reserva pendiente y libera sus asientos. Éxito: 204. Llama a
`cancelar_reserva_pendiente`. Es idempotente si ya estaba cancelada.

## Pasajeros

### PUT /reservas/:id/pasajeros

Cliente autenticado dueño de la reserva. Éxito: 200. Guarda todos los pasajeros
en una sola transacción, llamando a `guardar_pasajero(reserva_asiento_id, datos)`
por cada asiento.

```json
{
  "contacto": { "email": "comprador@example.com", "telefono": "+593991234567" },
  "pasajeros": [
    {
      "reserva_asiento_id": "uuid",
      "nombres": "Ángel Matías",
      "apellidos": "Galarza",
      "tipo_documento": "CEDULA",
      "documento": "1723456789",
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
- El contacto del comprador es obligatorio. La tabla `pasajeros` no tiene teléfono
  ni correo por pasajero, así que el teléfono y correo opcionales de los acompañantes
  que muestra la vista 4 no tienen dónde guardarse (decisión 11).
- `guardar_pasajero` no guarda el contacto de la reserva y el rol de la API no tiene
  permiso de `UPDATE` sobre `reservas` (decisión 7).

Respuesta: `{ "data": [ { "pasajero_id", "reserva_asiento_id", ... } ] }`.

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
- `v_mis_viajes` expone `codigo` como UUID; el formato `GC-AAAAMMDD-NNNN` del diseño está por acordar con Ángel.

## Contacto

### POST /contacto

Pública. Éxito: 201. Llama a `enviar_contacto`. No crea reservas.

```json
{ "cooperativa_id": "uuid-o-null", "nombre": "Ana Pérez", "email": "ana@example.com", "asunto": "Equipaje", "mensaje": "...", "consentimiento_version": "privacidad-v1" }
```

Límites de la tabla `contactos`: nombre 150, asunto 150, mensaje 4000, correo 254.
Requiere limitar la frecuencia de envíos en la API (la base no lo hace).

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

En el frontend: 422 se muestra junto al campo (`errores_campo`); 401 pide iniciar
sesión; 403 informa falta de permiso; 409 pide actualizar disponibilidad o versión;
un error de red conserva lo escrito y permite reintentar.

## Decisiones abiertas

Estado al 03/11/2026.

| # | Tema | Situación | Estado | Responsable |
|---|---|---|---|---|
| 1 | Servidor Express | `backend/src/server.ts` propuesto en el PR #56 (Express, `/api/auth`, `/api/health`). Las rutas de compra se montarán ahí cuando se fusione. | En curso (#56) | Ángel |
| 2 | Autenticación | El PR #56 usa la cookie `transporte_sesion` y `abrir_contexto`; coincide con `http()` (`credentials: "include"`, PR #34). Queda por confirmar que reemplaza al JWT del PR #29. | Propuesta: cookie | Matías y Ángel |
| 3 | Orden reserva → pasajeros → cotización | Aprobado con este contrato (#38) e implementado con datos simulados en las vistas 4 y 5 (#51, #53). | Acordada | Ángel y KT |
| 4 | Quién llama `POST /reservas` | La pantalla de asientos de Mikel (#47) lo llama al confirmar y navega a `/pasajeros?reserva_id=`. | Acordada (#47) | Mikel y KT |
| 5 | Historial por pasajero | El docente pidió que un pasajero vea los viajes comprados por otro; el maestro prohíbe vincular por cédula sin identidad verificada. Propuesta: mostrarlos solo si Matías marca la identidad como verificada. Mientras tanto, solo compras propias. | Abierta (comité) | Equipo |
| 6 | Filtros de `buscar_viajes` | Faltan hora de salida, rango de precio y orden. Solicitud de cambio a la función. | Abierta | Matías |
| 7 | Contacto de la reserva | `reservar_asientos` y `guardar_pasajero` no guardan `contacto_email` ni `contacto_telefono`, y el rol de la API no puede actualizar `reservas`. Hace falta una función nueva. | Abierta | Matías |
| 8 | "Pago en verificación" en Mis viajes | `v_mis_viajes` solo trae compras. Consultar reservas e intentos de pago aparte o crear una vista. | Abierta | Ángel |
| 9 | Nombres de campos | Español y snake_case, como el contrato de flota. | Acordada (#38) | Equipo |
| 10 | Beneficios | Solo niño 30 % está en la demo y sus edades no están definidas. Tercera edad y discapacidad sin porcentaje aprobado: se muestra lo que devuelva `cotizar`. | Abierta | Benjamín |
| 11 | Contacto de acompañantes | La vista 4 pide teléfono y correo opcionales por acompañante, pero `pasajeros` no tiene esas columnas. Quitar los campos o agregar columnas. | Abierta | Matías y equipo |
| 12 | Código de compra visible | `compras.codigo` es UUID; el diseño muestra `GC-AAAAMMDD-NNNN`. | Abierta | Ángel |
| 13 | Rutas entre módulos | Tabla "Rutas del frontend en el flujo". Falta registrar `/asientos` (#47); las vistas de Ángel leen `reserva_id` (#69, #70, #71). | En curso | Mikel, Ángel y KT |
