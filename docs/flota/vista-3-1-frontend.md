# Vista 3.1: selección Normal

La ruta real `/asientos` ya incorpora la vista de tres columnas, información del
viaje, selector, disponibilidad y resumen. Se conserva su integración existente:
no se cambia la lógica de retención, reservas ni datos del servidor.

Se corrige únicamente la muestra de desarrollo
`/vista-previa/mikel-v3/asientos-normal`: utiliza un piso, 40 asientos,
pasillo central, 2+2, códigos 1A–10D e identificadores únicos. La muestra usa
el mismo `SelectorAsientos`, pero no crea reservas ni cobra.

La cantidad del ejemplo es dos; los asientos elegidos y el límite se reflejan en
el contador. En la ruta real la cantidad y los asientos provienen del viaje.
