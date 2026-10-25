# Contrato de API: Flota y asientos (EC-004)

> Los campos siguen la base de datos real (esquema `transporte`, ver
> backend/conexion-bd). Los nombres en español/snake_case quedan pendientes de
> confirmar con Matías.

## Convenciones generales
- Los IDs son UUID (texto).
- La cooperativa NO se envía en el body: se toma de la sesión.
- Las listas responden { "data": [...] }.
- Un error de unicidad de la base de datos se responde 409.

## Buses

### GET /buses
Lista los buses de la cooperativa. Éxito: 200.
Por defecto lista solo los activos; con ?activo=false lista los desactivados.

Respuesta:
{
  "data": [
    {
      "id": "uuid",
      "unidad": "12",
      "placa": "TBA-1234",
      "chasis": "Chasis",
      "carroceria": "Carrocería",
      "grupo_id": "uuid",
      "activo": true
    }
  ]
}

### GET /buses/:id
Detalle de un bus con sus planos. Éxito: 200.
Errores: 401, 404 (bus inexistente o de otra cooperativa).

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
- chasis y carroceria: obligatorios, texto no vacío.
- grupo_id: obligatorio, debe ser un grupo de la misma cooperativa (módulo de Benjamín).
- correo_contacto: opcional, con formato de correo.
- Errores: 400 (datos inválidos), 409 (placa o unidad duplicada).

### PUT /buses/:id
Actualiza datos de un bus (al menos un campo). Éxito: 200 (devuelve el bus actualizado).
Mismas validaciones que POST para los campos enviados.
Errores: 400, 404, 409.

### DELETE /buses/:id
Desactiva el bus (activo = false). No hay eliminación física.

Decisión confirmada por Matías (gestor de configuración): se conserva el
historial de viajes y reservas, por lo que un bus nunca se borra de la base.

Comportamiento:
- Éxito: 204 sin cuerpo.
- Un bus desactivado no se puede asignar a nuevos viajes.
- Si el bus tiene viajes programados o reservas asociadas, responde 409 y no se desactiva.
- Errores: 401, 403, 404 (bus inexistente o de otra cooperativa), 409.
- Pendiente de confirmar: si el 409 cuenta cualquier viaje o solo los futuros.

## Planos, pisos y asientos
Un bus tiene planos versionados (tabla planos). Cada plano es una grilla de
celdas (tabla plano_celdas) con hasta 3 pisos.

### GET /clases-asiento
Catálogo de clases de asiento. Éxito: 200.

Respuesta:
{
  "data": [
    { "id": "uuid", "codigo": "NORMAL", "nombre": "Normal" },
    { "id": "uuid", "codigo": "EJECUTIVO", "nombre": "Ejecutivo" }
  ]
}

Los códigos reales de clases_asiento se confirman con el equipo (según las vistas aprobadas).

### GET /buses/:id/planos
Lista las versiones de plano del bus (numero_version, nombre, pisos, publicado). Éxito: 200.

### POST /buses/:id/planos
Crea una nueva versión del plano (publicado = false). Éxito: 201.

Body:
{ "nombre": "Plano 2 pisos", "pisos": 2 }

Validaciones:
- nombre: obligatorio.
- pisos: entero entre 1 y 3.
- Errores: 400, 404.

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
- El codigo no se repite dentro del plano; la posición (piso, fila, columna) tampoco.
- Errores: 400, 404, 409.

### POST /planos/:id/publicar
Marca el plano como publicado. Desde entonces no se edita: se crea otra versión
(propuesta, a confirmar con Matías). Éxito: 200. Errores: 404, 409 (ya publicado).

## Disponibilidad de buses (para Benjamín)

### GET /buses/disponibles?desde=...&hasta=...
Buses activos sin viajes (no cancelados) ni indisponibilidades que se solapen
con el rango. Éxito: 200.
Error 400 si desde es mayor o igual que hasta.

### GET /buses/:id/indisponibilidades
Lista las indisponibilidades del bus. Éxito: 200.

### POST /buses/:id/indisponibilidades
Registra un período en que el bus no está disponible. Éxito: 201.

Body:
{ "desde": "2026-11-01T08:00:00-05:00", "hasta": "2026-11-02T08:00:00-05:00", "motivo": "Mantenimiento" }

Validaciones:
- hasta debe ser posterior a desde (400).
- motivo: obligatorio.

## Mapa de asientos de un viaje (para KT)

### GET /viajes/:viajeId/mapa-asientos?origen_orden=1&destino_orden=3
Llama a la función transporte.plano_disponible(viaje, origen, destino). Éxito: 200.
Solo responde para viajes PUBLICADO con salida futura.

Respuesta:
{
  "planoId": "uuid",
  "celdas": [
    { "id": "uuid", "piso": 1, "fila": 1, "columna": 1, "tipo": "ASIENTO",
      "codigo": "1", "clase": "NORMAL", "estado": "DISPONIBLE" },
    { "id": "uuid", "piso": 1, "fila": 1, "columna": 3, "tipo": "PASILLO",
      "codigo": null, "clase": null, "estado": "DISPONIBLE" }
  ]
}

Detalles:
- El id de cada celda es el que se envía como asiento_ids en POST /reservas.
- No hay lista de pisos ni de clases: los pisos se deducen de las celdas y la clase es
  el código de clases_asiento (NORMAL o EJECUTIVO).
- tipo es ASIENTO, PASILLO o BLOQUE. Solo los ASIENTO se pueden reservar.

Estados de una celda para el tramo pedido:
- DISPONIBLE: sin reserva en el tramo.
- OCUPADO: una compra confirmada cubre el tramo.
- RESERVADO: otra persona lo tiene retenido y la retención no ha vencido.
- SELECCIONADO: la retención es de quien consulta.

Regla del tramo: dos rangos [origen, destino) que se cruzan cuentan como ocupación. Una
retención vencida (expires_at pasado) no cuenta.

Sesión: la función no la exige. Sin sesión ningún asiento sale SELECCIONADO, porque no se
sabe quién consulta. Si la API exige sesión en esta ruta es una decisión pendiente.

Es información de consulta: la disponibilidad real se verifica de nuevo, de forma
transaccional, al crear la reserva (reservar_asientos), y una restricción de la base
impide que dos retenciones del mismo asiento se crucen en un tramo.

Errores: un viaje inexistente, no publicado, ya salido o un tramo inválido hace que la
función lance "Viaje o tramo no disponible"; el código HTTP (404 o 422) está pendiente de
confirmar con Matías.

## Roles y control de acceso
Propuesta, a alinear con las tablas roles, permisos y rol_permiso:
- Administrador de cooperativa: crea y modifica buses, planos y celdas.
- Oficinista: solo lectura de buses y mapa.
- Cliente: solo mapa de asientos de viajes publicados.

Aislamiento por cooperativa:
- La sesión define cooperativa_id.
- Un recurso de otra cooperativa responde 404 (no 403), para no revelar que existe.
- Errores: 401 sin sesión, 403 sin permiso.

## Errores comunes
- 400: datos inválidos
- 401: no autenticado
- 403: rol sin permiso
- 404: recurso inexistente o de otra cooperativa
- 409: conflicto (placa, unidad, código de asiento o posición duplicados)

## Pendiente
- Nombres de los campos (español como la base, o con traducción).
- Si un plano publicado o con viajes es inmutable.
- Estados de reserva_asientos que cuentan como ocupados.
- Códigos reales de las clases de asiento (Normal / Ejecutivo).
- Fotos del bus (bus_fotos y archivos): endpoint por definir.
- Equipamiento (bus_equipamiento): fuera de la primera entrega salvo que se pida.