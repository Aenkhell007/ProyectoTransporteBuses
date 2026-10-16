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


## Pisos y asientos

### GET /buses/:id/floors
Lista los pisos de un bus con sus asientos.

### POST /buses/:id/floors
Crea un piso para el bus.

### POST /floors/:id/seats
Crea un asiento en un piso.

Body:
{
  "number": "1",
  "type": "NORMAL",
  "row": 1,
  "column": 1
}

### PUT /seats/:id
Actualiza tipo o posición de un asiento.

Restricción: el número de asiento es único por bus y piso (error 409 si se repite).


## Mapa y disponibilidad

### GET /trips/:tripId/seat-map
Devuelve el mapa de asientos del bus asignado al viaje, con ocupación por tramo.
La respuesta sigue la estructura de docs/api/mapa-asientos.mock.json.

## Errores
- 400: datos inválidos
- 404: bus, piso, asiento o viaje inexistente
- 409: placa duplicada o número de asiento duplicado en el piso