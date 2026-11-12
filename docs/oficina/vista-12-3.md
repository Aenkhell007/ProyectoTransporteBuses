# Vista 12.3: reembolsos reales

Reutiliza el layout de oficina. Consulta solicitudes autorizadas, filtra y muestra los importes y la política registrados. Permite solicitar, aprobar o rechazar con motivo y registrar el abono con referencia y respaldo privado JPG/PNG/PDF de hasta 5 MB. Aprobar cancela la compra y libera los asientos; no confirma el abono.

Depende de las ramas de las vistas 11, 12, 12.1, 12.2 y 13 de esta serie. No aplica migraciones nuevas: utiliza las funciones existentes del esquema transporte.

Pruebas: revisión de tipos frontend/backend; las consultas SELECT se validaron con EXPLAIN contra Supabase en transacción de solo lectura. La prueba de pagos existente pasó en PostgreSQL y revirtió sus fixtures. Falta probar el recorrido completo de devolución con sesión de oficinista y comprobar visualmente escritorio/móvil. No se acredita finalizada ni lista para producción mientras falten esas pruebas.
