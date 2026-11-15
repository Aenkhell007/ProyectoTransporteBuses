# Vista 12.3: reembolsos reales

Reutiliza el layout de oficina. Consulta solicitudes autorizadas, filtra y muestra los importes y la política registrados. Permite solicitar, aprobar o rechazar con motivo y registrar el abono con referencia y respaldo privado JPG/PNG/PDF de hasta 5 MB. Aprobar cancela la compra y libera los asientos; no confirma el abono.

Depende de las ramas de las vistas 11, 12, 12.1, 12.2 y 13 de esta serie. No aplica migraciones nuevas: utiliza las funciones existentes del esquema transporte.

Pruebas: revisión de tipos y compilación del frontend. La integración en PostgreSQL comprueba solicitud, decisión, registro del abono con respaldo, idempotencia y rechazo del acceso desde otra oficina. Los datos temporales y la migración de prueba se revierten al terminar. Falta la revisión visual completa con una sesión de oficinista en escritorio y móvil.
