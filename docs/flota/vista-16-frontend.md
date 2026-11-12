# Vista 16: editor de bus Ejecutivo

Ruta de desarrollo: `/vista-previa/mikel-v3/buses`.
`EditorBus` recibe bus, catálogos, clases, servicios, buses existentes y callback
asíncrono opcional. No contiene servicios HTTP ni incorpora dependencias nuevas.

- Datos del bus, estado, grupo, propietario y correo.
- Fotografías con vista previa, quitar y límites de tipo, tamaño y cantidad.
- Servicios seleccionables y plano editable por celda.
- Capacidad calculada del plano; plantilla de dos pisos 1+2 con L1–L18/U1–U18.
- Si el plano está en uso, el cambio se entrega como una nueva versión.
- Cancelar restaura datos, fotos, servicios y plano; un error conserva el borrador.

El callback recibe los archivos separados, versión y señal de nueva versión.
La API actual no admite el contrato completo: fotos, servicios y planos siguen
sin conectar por pedido del coordinador. La vista previa lo indica expresamente.
La validación definitiva de pertenencia, disponibilidad, unicidad y versiones
corresponde al servidor.

Se conserva el CRUD existente. Su formulario ahora espera la respuesta antes de
limpiarse, y conserva los datos si la operación falla.
