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