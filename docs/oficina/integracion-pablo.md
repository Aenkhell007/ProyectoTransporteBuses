# Integración de las vistas de Pablo

## Alcance

Las vistas 11, 12, 12.1, 12.2, 12.3, 13 y 14 consumen el backend con sesión cookie y PostgreSQL. Reutilizan los layouts de administración y oficina; los datos no se sustituyen por ejemplos cuando falla la API.

- Administración: resumen, indicadores, altas por fecha y cooperativas autorizadas.
- Oficina: resumen, reservas, comprobantes, revisión, solicitudes de reembolso y venta presencial.
- La venta permite buscar un viaje, reservar asientos, registrar pasajeros, cotizar, aceptar el precio y cobrar efectivo. El cambio se calcula en centavos y el servidor confirma el pago y emite el PDF/QR.
- La transferencia continúa mediante el flujo existente de comprobantes; tarjeta permanece pendiente.
- Aprobar un reembolso y registrar su abono son operaciones diferentes. El abono documenta una devolución externa con referencia y respaldo privado; no realiza una transferencia bancaria.
- No se confirma el envío automático de boletos por correo o WhatsApp.

## Instalación

Desde la raíz del checkout de esta serie:

```sh
npm --prefix frontend ci
npm --prefix backend ci
npm --prefix backend/conexion-bd ci
npm --prefix backend/conexion-bd run db:generate
```

Usar las plantillas de entorno del proyecto y completar las credenciales en privado. La conexión debe utilizar el certificado CA y mantener la verificación TLS. No subir archivos .env, tokens, certificados privados ni credenciales.

La vista 14 añade la migración 20261112_venta_oficina_idempotente para conservar la reserva ante reintentos de la misma petición. En una base compartida, un responsable aplica las migraciones una sola vez con npm --prefix backend/conexion-bd run db:deploy. Los demás verifican el estado y generan el cliente; no deben reiniciar la base ni volver a registrar el baseline. El 14 de noviembre de 2026 se comprobó que esta tabla faltaba en la base compartida. Se aplicó su SQL de forma transaccional y se registró la migración con su checksum en transporte._prisma_migrations. La venta presencial se probó después desde la interfaz hasta la cotización. No volver a aplicar el mismo SQL manualmente.

## Acceso y prueba

Iniciar backend y frontend en terminales separadas:

```sh
npm --prefix backend run dev
npm --prefix frontend run dev -- --host 127.0.0.1 --port 4192
```

FRONTEND_URL debe coincidir con el origen usado por el navegador. Iniciar sesión desde /iniciar-sesion. El servidor decide los permisos y el ámbito de cooperativa/oficina. Una ruta de vista previa no concede permisos.

Vista previa de oficina: /vista-previa/oficinista; venta: /vista-previa/oficinista/ventas. Las opciones del panel navegan dentro del layout compartido.

## Validación realizada

- Compilación del frontend y revisión de tipos del backend correctas.
- Diez pruebas de compra y pagos correctas, incluida una integración PostgreSQL con datos temporales revertidos.
- La integración cubre permisos por oficina, reserva idempotente, cotización, cobro en efectivo, PDF, listado de reservas, revisión de comprobantes y solicitud/decisión/abono de reembolso.
- No se enviaron notificaciones externas ni se realizaron cobros o transferencias bancarias reales durante estas pruebas.

Pendiente: comprobar visualmente las siete vistas con cuentas autorizadas en escritorio y móvil, comparar con las referencias y verificar los recorridos manuales completos. La compilación y las pruebas de API no sustituyen esa aceptación visual.


## Comprobación del 14 de noviembre de 2026

- Cabecera fija, panel lateral y pie compartidos originales conservados. Los ajustes de estilo se limitan al contenido.
- Se revisaron en navegador autenticado resumen, reservas, comprobantes, reembolsos y venta; también el menú y el contenido en ancho móvil.
- Reserva confirmada: detalle con pasajero, asiento e importe correctos.
- Venta DEMO: búsqueda Ambato–Quito del 15/11, buses normal y VIP, selección de 2A, alta de pasajero ficticio, cotización de USD 12, rechazo de efectivo insuficiente y cambio de USD 3 con USD 15.
- La reserva DEMO f956c980-b6bf-4b5e-8d63-d827c69c14da se canceló mediante la función de negocio, tras comprobar su documento ficticio y ausencia de pagos. Estado final CANCELADA y cero asientos retenidos. No hubo pago ni notificaciones externas.
- La primera integración transaccional pasó, incluida venta, permisos, comprobante, PDF/QR y reembolso. Nueve pruebas de compra y pagos y tipos del backend también pasaron.
- Se corrigió la migración faltante en la base real, se compactó el desglose de cobro y se integraron sus confirmaciones en Dialogo accesible.
- Pendiente de aceptación visual: administración con su cuenta autorizada y revisión de comprobante con un adjunto disponible. La cuenta de oficinista tiene cero comprobantes; no se añadieron documentos bancarios ficticios al listado real.
- La automatización del navegador se bloqueó al gestionar una confirmación nativa. No acredita una revisión visual completa de las siete vistas; no se afirma igualdad exacta ni se ocultan esos límites.
