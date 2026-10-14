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