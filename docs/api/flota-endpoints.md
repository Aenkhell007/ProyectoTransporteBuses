# Contrato de API: Flota y asientos (EC-004)

## Buses

### GET /buses
Lista los buses de la cooperativa del usuario.

### GET /buses/:id
Detalle de un bus con sus pisos.

### POST /buses
Crea un bus.

Body:
{
  "plate": "TBA-1234",
  "brand": "Marca",
  "chassis": "Chasis",
  "bodywork": "Carrocería"
}

### PUT /buses/:id
Actualiza datos de un bus.

### DELETE /buses/:id
Elimina o desactiva un bus (a acordar con Matías).


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