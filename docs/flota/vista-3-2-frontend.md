# Vista 3.2: selección Premium

La vista real de selección ya está implementada y se conserva sin alterar
reservas, disponibilidad ni consultas al servidor.

Se corrige la muestra `/vista-previa/mikel-v3/asientos-premium`: antes repetía
identificadores y códigos, utilizaba el prefijo U en ambos pisos y podía generar
menos asientos de los esperados. Ahora comparte la plantilla del editor:
dos pisos, 18 asientos por piso, pasillo después de la primera columna,
distribución 1+2, códigos L1–L18 y U1–U18.

Reutiliza `SelectorAsientos`, incluidas sus pestañas de piso en móvil, estados,
límite y selección entre pisos. Solo es una muestra: no retiene asientos reales.
