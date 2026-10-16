# Contrato de API: Flota y asientos (EC-004)

## Convenciones generales
- Los IDs son enteros (igual que en docs/api/mapa-asientos.mock.json).
- Los nombres de campos van en inglés y camelCase.
- La cooperativa NO se envía en el body: se toma de la sesión del usuario.

## Buses

### GET /buses
Lista los buses de la cooperativa del usuario. Éxito: 200.

Respuesta:
{
  "data": [
    { "id": 1, "plate": "TBA-1234", "brand": "Marca", "status": "ACTIVE" }
  ]
}

### GET /buses/:id
Detalle de un bus con sus pisos. Éxito: 200.

Respuesta:
{
  "id": 1,
  "plate": "TBA-1234",
  "brand": "Marca",
  "chassis": "Chasis",
  "bodywork": "Carrocería",
  "status": "ACTIVE",
  "floors": [ { "id": 10, "floorNumber": 1 } ]
}

### POST /buses
Crea un bus. Éxito: 201.

Body:
{
  "plate": "TBA-1234",
  "brand": "Marca",
  "chassis": "Chasis",
  "bodywork": "Carrocería"
}

Validaciones:
- plate: obligatoria, única, formato de placa válido.
- brand, chassis, bodywork: obligatorios, texto no vacío.
- Errores: 400 (datos inválidos), 409 (placa duplicada).

### PUT /buses/:id
Actualiza datos de un bus. Éxito: 200 (devuelve el bus actualizado).

Body (campos permitidos, al menos uno):
{
  "brand": "Marca",
  "chassis": "Chasis",
  "bodywork": "Carrocería",
  "plate": "TBA-1234"
}

Validaciones:
- Mismas reglas que en POST para los campos enviados.
- Si cambia plate, no puede coincidir con la de otro bus (409).
- Errores: 400, 404, 409.

### DELETE /buses/:id
Desactiva el bus (status = INACTIVE). No hay eliminación física.

Decisión confirmada por Matías (gestor de configuración): se conserva el
historial de viajes programados y reservas, por lo que un bus nunca se borra
de la base de datos.

Comportamiento:
- Éxito: 204 sin cuerpo; el bus queda con status INACTIVE.
- Un bus INACTIVE no se puede asignar a nuevos viajes.
- Si el bus tiene viajes programados o reservas asociadas, responde 409 y no
  se desactiva.
- Errores: 401, 403, 404 (bus inexistente o de otra cooperativa), 409.


## Pisos y asientos

### GET /buses/:id/floors
Lista los pisos de un bus con sus asientos. Éxito: 200.

Respuesta:
{
  "data": [
    {
      "id": 10,
      "floorNumber": 1,
      "seats": [
        { "id": 1, "number": "1", "type": "NORMAL", "row": 1, "column": 1 }
      ]
    }
  ]
}

### GET /buses
Lista los buses de la cooperativa del usuario. Éxito: 200.
Por defecto lista solo buses ACTIVE. Con ?status=INACTIVE lista los desactivados.

Respuesta:

### POST /buses/:id/floors
Crea un piso para el bus. Éxito: 201.

Body:
{ "floorNumber": 2 }

Validaciones:
- floorNumber: obligatorio, entero mayor o igual a 1.
- No puede repetirse dentro del mismo bus (409).
- Un bus tiene como máximo 2 pisos (a confirmar con el equipo).
- Errores: 400, 404 (bus inexistente), 409.

Respuesta:
{ "id": 11, "busId": 1, "floorNumber": 2 }

### POST /floors/:id/seats
Crea un asiento en un piso. Éxito: 201.

Body:
{
  "number": "1",
  "type": "NORMAL",
  "row": 1,
  "column": 1
}

Validaciones:
- number: obligatorio, texto, único por bus y piso (409 si se repite).
- type: NORMAL o VIP.
- row y column: enteros mayores o iguales a 1; la posición no puede repetirse en el piso (409).
- Errores: 400, 404, 409.

### PUT /seats/:id
Actualiza tipo o posición de un asiento. Éxito: 200.
Mismas validaciones que en POST /floors/:id/seats.

## Roles y control de acceso

> Los roles de esta tabla son una propuesta a confirmar con Matías (el PGCS
> prevé cinco roles pero aún no están nombrados en el esquema).

| Recurso | Consultar | Crear / modificar / desactivar |
|---|---|---|
| Buses, pisos, asientos | Administrador de cooperativa, oficinista (solo lectura) | Administrador de cooperativa |
| Mapa de asientos de un viaje | Cliente, oficinista, administrador | Nadie (solo lectura) |

Reglas de aislamiento por cooperativa:
- La cooperativa del usuario se obtiene de la sesión, nunca del body ni de la URL.
- Toda consulta filtra por cooperativa. Para bus, piso y asiento, el backend verifica la cadena asiento → piso → bus → cooperativa antes de leer o modificar.
- Si el ID existe pero pertenece a otra cooperativa, se responde 404 (no 403), para no revelar que existe.
- Excepción: el mapa de un viaje es de lectura pública para clientes autenticados y solo expone datos de ese viaje.

Errores de autorización:
- 401: sin sesión o sesión inválida.
- 403: el rol no tiene permiso para la operación.


## Mapa y disponibilidad

### GET /trips/:tripId/seat-map
Devuelve el mapa del bus asignado al viaje. Éxito: 200.
Lo consulta el cliente (autenticado), el oficinista y el administrador.

Parámetros opcionales (query):
- originStopId, destinationStopId: IDs de las paradas de subida y bajada.

Respuesta: misma estructura que docs/api/mapa-asientos.mock.json
(tripId, bus, stops, segments, seatTypes, floors[].seats[]).

Identificadores y tramos (ver docs/api/mapa-asientos.md):
- Los IDs de bus, viaje, parada y asiento son enteros.
- Los IDs de parada son los mismos que usa la reserva (originStopId y
  destinationStopId) y deben coincidir con la entidad Stop del modelo de rutas.
- Los tramos se numeran desde 1; cada tramo conecta dos paradas consecutivas
  (segments[].fromStopId y toStopId).
- occupiedSegments lista los tramos ocupados del asiento.
- Con originStopId y destinationStopId, un asiento está disponible solo si
  ninguno de los tramos de ese recorrido está en occupiedSegments.
- Es información de consulta: la disponibilidad real se vuelve a verificar en el
  backend, de forma transaccional, al crear la reserva.

Errores:
- 401: sin sesión.
- 404: el viaje no existe.
- 400: originStopId o destinationStopId no pertenecen al viaje o no están en orden.

## Errores comunes
- 400: datos inválidos
- 401: no autenticado
- 403: rol sin permiso
- 404: recurso inexistente o de otra cooperativa
- 409: conflicto (placa, número de asiento o posición duplicada)