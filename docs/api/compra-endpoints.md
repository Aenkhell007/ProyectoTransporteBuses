# Contrato de API: Compra del cliente (KT)

> Estado: propuesta para revisión del equipo. Versión 0.2.0.
> Los campos siguen la base real (esquema `transporte`, ver `backend/conexion-bd`)
> y la convención ya fusionada en `docs/api/flota-endpoints.md`: español y snake_case.
> Ninguna ruta está implementada: el servidor Express todavía no existe (issue #11).

Reemplaza los borradores `booking.contract.json`, `passengers.contract.json` y
`search-trips.contract.json` de la rama `feature/6-compra-kt`.

## Convenciones generales

- Rutas sin prefijo `/api`; el prefijo va en `VITE_API_URL`, como en el cliente HTTP de flota.
- Los IDs son UUID (texto).
- El usuario, su rol y la cooperativa se toman de la sesión. Ninguna ruta acepta
  `usuario_id`, `cliente_id`, rol ni `cooperativa_id` en el body como autorización.
- Cada endpoint autenticado trabaja dentro de `conSesion(token, trabajo)` de
  `backend/conexion-bd/src/db.ts` y llama la función SQL indicada. La lógica de
  disponibilidad, tarifas, descuentos e impuestos no se reescribe en TypeScript.
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
      "bus": {
        "id": "uuid", "unidad": "018", "placa": "PAB-1234",
        "chasis": "Scania", "carroceria": "Marcopolo", "grupo": "Ejecutivo", "plano_id": "uuid"
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

Errores: 422 (parámetros inválidos, origen igual a destino, fecha pasada).

Limitaciones conocidas (ver decisión 6): `buscar_viajes` no filtra por hora de
salida ni por rango de precio y solo ordena por `viaje_id`. Aplicar esos filtros en
la API sobre las 50 filas rompe la paginación. Se pedirá el cambio de la función
mediante solicitud de cambio. Tampoco devuelve terminales, duración, clase ni
servicios: se completan con `GET /viajes/:id`.

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
  "expires_at": "2026-10-09T10:15:00-05:00",
  "lineas": [
    {
      "reserva_asiento_id": "uuid",
      "asiento_codigo": "U8",
      "pasajero": "Ángel Matías Galarza",
      "clase": "EJECUTIVO",
      "beneficio_codigo": null,
      "base_centavos": 2800,
      "descuento_centavos": 0,
      "servicio_centavos": 0,
      "impuesto_bp": 0,
      "impuesto_servicio_bp": 0,
      "iva_centavos": 0
    }
  ]
}
```

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

- `total_pagado_centavos` sale de `compras` y `monto_reportado_centavos` del
  comprobante: no son lo mismo y se muestran con etiquetas distintas.
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

| # | Tema | Situación | Responsable |
|---|---|---|---|
| 1 | Servidor Express | No existe en ninguna rama. Hasta entonces, frontend con datos simulados. | Ángel (#11) y equipo |
| 2 | Autenticación | JWT en `Authorization: Bearer` (PR #29), cookie en el cliente HTTP (PR #34) y `conSesion` espera un token de sesión. Hay que unificarlo. | Matías |
| 3 | Orden reserva → pasajeros → cotización | Propuesto en este documento, alineado con la base. Reemplaza `passengerIds` en la reserva. | Ángel y KT |
| 4 | Quién llama `POST /reservas` | Propuesta: la pantalla de asientos de Mikel llama al servicio de reservas de KT al confirmar. | Mikel y KT |
| 5 | Historial por pasajero | El docente pidió que un pasajero vea los viajes comprados por otro; el maestro prohíbe vincular por cédula sin identidad verificada. Propuesta: mostrarlos solo si Matías marca la identidad como verificada. Mientras tanto, solo compras propias. | Equipo / comité de cambios |
| 6 | Filtros de `buscar_viajes` | Faltan hora de salida, rango de precio y orden. Solicitud de cambio a la función. | Matías |
| 7 | Contacto de la reserva | `reservar_asientos` y `guardar_pasajero` no guardan `contacto_email` ni `contacto_telefono`, y el rol de la API no puede actualizar `reservas`. Hace falta una función nueva. | Matías |
| 8 | "Pago en verificación" en Mis viajes | `v_mis_viajes` solo trae compras. Consultar reservas e intentos de pago aparte o crear una vista. | Ángel |
| 9 | Nombres de campos | Se sigue español y snake_case como el contrato de flota. | Equipo |
| 10 | Porcentajes de beneficios | Solo niño 30 % está en la demo. Tercera edad y discapacidad sin porcentaje aprobado: se muestra lo que devuelva `cotizar`. | Benjamín |
| 11 | Contacto de acompañantes | La vista 4 pide teléfono y correo opcionales por acompañante, pero `pasajeros` no tiene esas columnas. Quitar los campos o agregar columnas. | Matías y equipo |
| 12 | Código de compra visible | `compras.codigo` es UUID; el diseño muestra `GC-AAAAMMDD-NNNN`. | Ángel |
