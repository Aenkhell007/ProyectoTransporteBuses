# Vista 11.4: configuración del sistema

Ruta de desarrollo: `/vista-previa/mikel-v3/configuracion-global`.

Editor en `frontend/src/components/configuracion/EditorConfiguracionGlobal.tsx`.
Recibe la configuración, la versión, las capacidades de canales y un callback
asíncrono opcional. No contiene llamadas HTTP ni claves.

- General, seguridad, archivos y notificaciones conservan el mismo borrador.
- Cancelar restaura todos los valores confirmados.
- Requiere revisar el impacto antes de confirmar; cambiar un campo invalida esa revisión.
- Impide formatos vacíos, tamaños mayores de 5 MB y sesiones fuera de 1–24 horas.
- MFA y canales no disponibles permanecen deshabilitados.
- Un error de guardado conserva el formulario. La versión solo cambia con la respuesta.

Sin callback confirma únicamente un borrador en memoria y lo indica expresamente.
Pendiente: autorización, impacto real, persistencia y auditoría del servidor.
No reemplaza la configuración de pagos de Ángel ni conecta endpoints nuevos.
