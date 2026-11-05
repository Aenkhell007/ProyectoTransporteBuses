# Mapa de asientos: cómo leer el mock

Archivo de ejemplo: docs/api/mapa-asientos.mock.json. Imita la respuesta de
plano_disponible(viaje, origen, destino) para el tramo de la parada 1 a la 3.

## Estructura
- planoId: el plano del viaje.
- celdas: la grilla completa. Cada celda tiene id, piso, fila, columna, tipo, codigo,
  clase y estado.
- Solo las celdas de tipo ASIENTO se reservan. Su id es el que va en asiento_ids de
  POST /reservas. PASILLO y BLOQUE no llevan código ni clase.

## Estados
- DISPONIBLE: libre para el tramo (asientos 1, 3 y 5).
- RESERVADO: otra persona lo retiene y la retención no ha vencido (asiento 2).
- OCUPADO: una compra confirmada lo cubre (asiento 4).
- SELECCIONADO: lo retiene quien consulta (asiento 6).

## El tramo
Las paradas se identifican por su orden en la ruta (ruta_paradas.orden), que empieza en 1.
El servidor calcula el estado para el tramo pedido: un asiento reservado de la parada 1 a la
2 aparece libre si se consulta de la 2 a la 3, y ocupado si se consulta de la 1 a la 3.

## Pendiente
- Código HTTP cuando el viaje o el tramo no están disponibles.
- Si un asiento SELECCIONADO se puede volver a elegir (acordar con KT).