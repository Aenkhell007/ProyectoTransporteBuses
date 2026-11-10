# Vista 19: identidad y contacto

Ruta de desarrollo: `/vista-previa/mikel-v3/identidad`.
`EditorIdentidad` recibe identidad y versión; entrega datos y un archivo de logo
separado al callback asíncrono, para que la futura integración use su almacenamiento.

Incluye nombre comercial, razón social, RUC, lema, colores, contacto y redes.
La vista previa refleja los cambios sin modificar el sitio público. Cancelar
restaura los datos originales y libera la imagen temporal. Los errores no borran datos.

Logo PNG/SVG de hasta 2 MB: comprueba firma PNG, dimensiones y SVG estático sin
scripts ni enlaces externos. La versión definitiva se deberá validar también en
el servidor. Comprueba colores hexadecimales y contraste de texto, correo,
teléfonos internacionales y direcciones HTTPS de las redes admitidas.

En la ruta de vista previa no se llama al backend ni se publica la identidad.
RUC y contactos quedan vacíos para evitar presentar datos inventados como reales.
La pantalla antigua de configuración conectada se conserva hasta que se integre
el contrato completo; los campos nuevos no se envían a una API que aún no los admite.
