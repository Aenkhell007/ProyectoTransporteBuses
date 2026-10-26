# Registro: diseño e integración

La ruta `/registrarse` utiliza `frontend/src/pages/identidad/RegistroPage.tsx`, basada en la vista controlada de Matías de `feature/frontend-identidad` (a6b37bd). `pages/auth/Register.tsx` conserva una reexportación por compatibilidad, sin otro formulario.

El registro envía los datos a `POST /api/auth/register` mediante `authApi`. Se conservan validación de cédula, confirmación de contraseña, normalización del teléfono ecuatoriano, consentimiento, bloqueo de envíos simultáneos y mensajes del servidor.

El diseño usa dos columnas en escritorio y oculta la portada por debajo de 760 px. Los campos de contraseña se apilan en móvil. Los controles y sus etiquetas son accesibles por teclado. Los textos de términos y privacidad identifican el alcance académico; los textos legales definitivos siguen pendientes. El teléfono no promete notificaciones por WhatsApp, que no están implementadas.

## Imagen de portada

Archivo: `frontend/public/images/registro-bus-andino.png`.

Preparada con la herramienta integrada de generación de imágenes a partir de la referencia proporcionada por el usuario; es una recreación de la portada y no una fotografía original suministrada por la cooperativa.

Prompt utilizado:

> Edit target: attached Gran Continental registration website reference. Create ONLY the left promotional photographic panel as a clean portrait image asset, approximately 7:10 aspect ratio. Preserve closely the white green red Gran Continental double-decker coach in bottom half, front three-quarter view, Andean snow mountain, blue sky clouds and green mountain valley behind. Top 40 percent is mostly sky/clouds with room for HTML title overlay. REMOVE headline 'Crea tu cuenta y viaja con nosotros', REMOVE subtitle, green user icon. No UI, no webpage border, no registration form, no phone mockup, no added text. Keep branding on bus itself. The result must be a single full bleed scenic portrait promotional photograph matching the reference left panel composition.

## Validación

- Frontend: `npm --prefix frontend run build`.
- Backend activo: `npm --prefix backend run check:api`.
- Pruebas unitarias: `npm --prefix backend run test:auth` (6 pruebas).
- Revisión visual en navegador: formulario, portada, términos y alternancia de visibilidad de contraseña.

La entrega de correos y la creación de una cuenta real requieren la prueba manual con la configuración privada de Brevo. No se han creado cuentas ni enviado correos reales durante esta comprobación. La comprobación de tipos del backend se limita al servidor de integración y sus importaciones, no a los controladores antiguos que aún no están montados.
