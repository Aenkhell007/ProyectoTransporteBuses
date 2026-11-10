# Vista 17.1: grupos habilitados

Ruta de desarrollo: `/vista-previa/mikel-v3/grupos`.
`GruposHabilitadosEditor` recibe grupos, buses, frecuencias, compatibilidades,
versión y callback asíncrono. No hace llamadas HTTP.

Incluye búsqueda, detalle, pestañas, habilitación, revisión de cambios y cancelación.
Los conteos se derivan de los buses recibidos; no se inventan cifras.
Los grupos inactivos no se pueden habilitar y una frecuencia inactiva no admite cambios.
No elimina viajes ni añade capacidad. Guarda una sola frecuencia por operación y
envía la versión original. Conserva el borrador ante un error.

La ruta usa ejemplos identificados como vista previa. Confirmar sin callback solo
conserva cambios en memoria; la persistencia, permisos e impacto remoto quedan pendientes.
