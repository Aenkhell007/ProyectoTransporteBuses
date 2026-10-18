# Contrato de API: Flota y asientos (EC-004)

> Los campos siguen la base de datos real (esquema `transporte`, ver
> backend/conexion-bd). Los nombres en español/snake_case quedan pendientes de
> confirmar con Matías.

## Convenciones generales
- Los IDs son UUID (texto).
- La cooperativa NO se envía en el body: se toma de la sesión.
- Listas: { "data": [...] }.
- Un error de unicidad de la base de datos se responde 409.

## Buses

### GET /buses
Lista los buses de la cooperativa. Éxito: 200.
Por defecto solo activos; con ?activo=false lista los desactivados.

Respuesta:
{
  "data": [
    { "id": "uuid", "unidad": "12", "placa": "TBA-1234", "chasis": "Chasis",
      "carroceria": "Carrocería", "grupo_id": "uuid", "activo": true }
  ]
}

### GET /buses/:id
Detalle de un bus con sus planos. Éxito: 200.

### POST /buses
Crea un bus. Éxito: 201.

Body:
{
  "unidad": "12",
  "placa": "TBA-1234",
  "chasis": "Chasis",
  "carroceria": "Carrocería",
  "grupo_id": "uuid",
  "propietario": "opcional",
  "correo_contacto": "opcional"
}

Validaciones:
- unidad: obligatoria, única dentro de la cooperativa.
- placa: obligatoria, única en todo el sistema.
- chasis, carroceria: obligatorios, texto no vacío.
- grupo_id: obligatorio, debe ser un grupo de la misma cooperativa (módulo de Benjamín).
- Errores: 400, 409 (placa o unidad duplicada).

### PUT /buses/:id
Actualiza datos de un bus (al menos un campo). Éxito: 200.
Mismas validaciones que POST. Errores: 400, 404, 409.

### DELETE /buses/:id
Desactiva el bus (activo = false). No hay eliminación física (decisión de Matías).
- Éxito: 204.
- Con viajes programados o reservas asociadas: 409.
- Pendiente de confirmar si el 409 cuenta cualquier viaje o solo los futuros.

## Planos, pisos y asientos
Un bus tiene planos versionados (tabla planos); cada plano es una grilla de
celdas (tabla plano_celdas) con hasta 3 pisos.

### GET /clases-asiento
Catálogo de clases (Normal, VIP). Éxito: 200.
{ "data": [ { "id": "uuid", "codigo": "NORMAL", "nombre": "Normal" } ] }

### GET /buses/:id/planos
Lista las versiones de plano del bus (numero_version, nombre, pisos, publicado).

### POST /buses/:id/planos
Crea una nueva versión del plano (publicado = false). Éxito: 201.
Body: { "nombre": "Plano 2 pisos", "pisos": 2 }
- pisos: entero entre 1 y 3.

### GET /planos/:id
Plano con todas sus celdas. Éxito: 200.

### PUT /planos/:id/celdas
Reemplaza la grilla del plano (lo usa el editor visual). Éxito: 200.
Solo permitido si el plano no está publicado (propuesta, a confirmar).

Body:
{
  "celdas": [
    { "piso": 1, "fila": 1, "columna": 1, "tipo": "ASIENTO", "codigo": "1", "clase_id": "uuid" },
    { "piso": 1, "fila": 1, "columna": 3, "tipo": "PASILLO" }
  ]
}

Validaciones:
- piso: entre 1 y el número de pisos del plano.
- fila: mayor que 0. columna: entre 1 y 12.
- tipo: ASIENTO, PASILLO o BLOQUE.
- ASIENTO: codigo y clase_id obligatorios. PASILLO y BLOQUE: sin codigo ni clase_id.
- codigo único dentro del plano; la posición (piso, fila, columna) no se repite.
- Errores: 400, 404, 409.

### POST /planos/:id/publicar
Marca el plano como publicado; desde entonces no se edita, se crea otra versión
(propuesta, a confirmar con Matías).

## Disponibilidad de buses (para Benjamín)

### GET /buses/disponibles?desde=...&hasta=...
Buses activos sin viajes (no cancelados) ni indisponibilidades que se solapen
con el rango. Éxito: 200. Error 400 si desde >= hasta.

### GET /buses/:id/indisponibilidades
### POST /buses/:id/indisponibilidades
Body: { "desde": "ISO", "hasta": "ISO", "motivo": "Mantenimiento" }
- hasta debe ser posterior a desde (400).

## Mapa de asientos de un viaje (para KT)

### GET /viajes/:viajeId/mapa-asientos?origen_orden=1&destino_orden=3
Devuelve el plano del viaje (viajes.plano_id) con la ocupación. Éxito: 200.
Estructura: ver docs/api/mapa-asientos.mock.json.

Regla de ocupación:
- Las paradas se identifican por su orden en la ruta (ruta_paradas.orden).
- Cada celda trae ocupaciones: [{ origen_orden, destino_orden, estado }].
- Un asiento está libre para el recorrido o → d solo si ninguna ocupación
  cumple origen_orden < d y destino_orden > o.
- Una retención vencida (expires_at pasado) no cuenta. Qué estados cuentan
  como ocupados se confirma con KT y Matías.
- Es información de consulta: la disponibilidad real se verifica de nuevo, de forma
  transaccional, al crear la reserva.

Errores: 400 (orden inválido), 401, 404 (viaje inexistente o de otra cooperativa).

## Roles y control de acceso
Propuesta a alinear con las tablas roles, permisos y rol_permiso:
- Administrador de cooperativa: crea y modifica buses, planos y celdas.
- Oficinista: solo lectura de buses y mapa.
- Cliente: solo mapa de asientos de viajes publicados.
- Aislamiento por cooperativa: la sesión define cooperativa_id y un recurso de otra
  cooperativa responde 404. Errores: 401 sin sesión, 403 sin permiso.

## Pendiente
- Fotos del bus (bus_fotos + archivos): endpoint por definir.
- Equipamiento (bus_equipamiento): fuera de la primera entrega salvo que se pida.