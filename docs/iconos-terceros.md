# Iconos del proyecto

Los módulos de compra, pagos, autenticación, administración, oficina, cooperativa, configuración y flota utilizan los iconos originales de **Font Awesome Free**, de Fonticons, Inc. Se importan individualmente desde los paquetes oficiales `@fortawesome/free-solid-svg-icons` y `@fortawesome/free-brands-svg-icons`; no requieren un CDN, fuentes remotas ni un Kit de pago. Tailwind controla su tamaño y color. El componente de presentación no dibuja ni modifica las geometrías de los iconos.

- Repositorio oficial: https://github.com/FortAwesome/Font-Awesome
- Licencia de los iconos: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
- Texto de licencia del proveedor: https://fontawesome.com/license/free
- WhatsApp utiliza su icono de marca del paquete oficial; la marca pertenece a su titular.

El rol de personal del bus usa el pictograma gratuito de autobús. No se presenta como una reproducción exacta del volante de la referencia.

El logo de Gran Continental se reutiliza desde `frontend/public/images/Logo G-C.png`. Las demás cooperativas sin logo disponible muestran un pictograma genérico de edificio; no se inventan logotipos. La nueva cooperativa muestra la imagen que el usuario seleccione.

El catálogo compartido está en `frontend/src/components/ui/IconoBiblioteca.tsx`. Los componentes anteriores delegan a este catálogo para preservar sus interfaces y accesibilidad. Los gráficos de datos y las ilustraciones de seguimiento de pagos siguen siendo SVG propios: son contenido visual, no pictogramas de la interfaz.
