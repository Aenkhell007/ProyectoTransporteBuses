# Vista 16.1: bus Normal

Ruta: `/vista-previa/mikel-v3/bus-normal` (solo desarrollo).

Utiliza el mismo `EditorBus` de la vista 16: no hay un segundo formulario ni
servicio. La plantilla de un piso tiene diez filas, cuatro asientos por fila,
pasillo central y códigos 1A–10D. La capacidad se calcula; no es un campo manual.

El editor admite quitar/agregar celdas, seleccionar su clase, previsualizar,
cancelar y validar el borrador. Las mismas validaciones de bus, fotografías y
versiones se aplican a ambos tipos de unidad. El diseño se adapta a móvil.

Sin callback de guardado, ningún cambio se envía al servidor. La pantalla muestra
esta condición; la conexión completa de los nuevos campos se hará después.
