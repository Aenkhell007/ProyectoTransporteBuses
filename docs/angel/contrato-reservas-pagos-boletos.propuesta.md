# Propuesta de integración: reservas, pagos y boletos

Responsable: Ángel. Estado: borrador para revisión del equipo. Versión: 0.1.0.
Este documento define mi parte antes de implementarla. Las rutas y estados nuevos son propuestas; no son endpoints disponibles ni decisiones ya aprobadas.

## 1. Alcance y tecnologías

Mi módulo gestiona la reserva temporal, su importe y vencimiento, la recepción de comprobantes, la consulta del pago y la emisión/descarga de boletos después de aprobar el pago. KT mantiene búsqueda, pasajeros, selección de asientos y resumen; Pablo mantiene su bandeja de revisión y la venta presencial. Coordinar los contratos no implica modificar las pantallas de otro integrante.

Se conserva React, TypeScript, Vite, Tailwind CSS y shadcn/ui para mis vistas; Node.js, Express y TypeScript para API; PostgreSQL y Prisma para datos. pgAdmin 4 administra el entorno local y Supabase PostgreSQL la integración compartida. No se añaden pasarelas ni otra arquitectura. Librerías de QR/PDF y almacenamiento de archivos pendientes de acuerdo.

## 2. Dependencias que debemos acordar

- KT: su POST /bookings solicita passengerIds, pero POST /bookings/{bookingId}/passengers solicita bookingId. Existe una dependencia circular para pasajeros nuevos. Propuesta para discutir: crear la reserva con selecciones explícitas asiento-pasajero y datos de invitados en una operación; alternativa: registrar los pasajeros antes de reservar. No implementar una opción hasta acordarla con KT y Matías. No modificar silenciosamente sus contratos.
- Mikel: IDs y distribución de asientos, mapa del viaje y ocupación por tramo. La disponibilidad definitiva se valida en servidor, en una transacción que impida dobles reservas con segmentos superpuestos.
- Benjamín: viaje publicado, paradas autorizadas y ordenadas, tarifas por tramo/clase y reglas de descuentos aprobadas. No fijar porcentajes, edades ni precios por nuestra cuenta.
- Matías: identidad, roles, cooperativa, modelo Prisma, migraciones y relación de invitados con usuarios. No crear cuentas activas automáticamente para acompañantes.
- Pablo: permiso y alcance para revisar comprobantes, motivos de rechazo y contrato común para notificar aprobación y emitir boletos. Mi módulo no implementa su bandeja.
- Equipo: acordar el ID del elemento de configuración de este módulo; no inventar uno a partir de EC-004 o EC-007.

## 3. Propuesta de estados separados

Los nombres deben revisarse junto con PENDING_PAYMENT del contrato de KT y PENDING_PROOF/UNDER_REVIEW del mock de Pablo. No tratarlos como equivalentes sin definir qué entidad representan.

| Entidad | Estados propuestos | Significado |
| --- | --- | --- |
| Reserva | PENDING_PAYMENT, CONFIRMED, EXPIRED | Espera pago; venta confirmada; vencida y sin retención activa. Cancelación/reprogramación y sus políticas quedan pendientes. |
| Pago | PENDING_PROOF, UNDER_REVIEW, APPROVED, REJECTED | Falta comprobante; revisión pendiente; aceptado por oficinista autorizado; rechazado con motivo. |
| Boleto | NOT_ISSUED, ISSUED | Sin emisión; documento emitido y recuperable. Son estados del dominio; la descarga no crea otro boleto. |

- Crear reserva: estado PENDING_PAYMENT, pago PENDING_PROOF y sin boletos. El servidor devuelve total y expiresAt; no se fija aquí una duración arbitraria.
- Adjuntar comprobante válido no aprueba el pago ni confirma la venta: cambia el pago a UNDER_REVIEW.
- Aprobar: verificar autorización, cooperativa, estado, importe y retención válida. Registrar revisor/fecha e iniciar confirmación y emisión sin duplicados. Un fallo técnico de PDF requiere reintento controlado, no una nueva venta ni un segundo cargo.
- Rechazar: registrar motivo y revisor; no emitir boleto. Definir con el equipo si se permite otro comprobante y hasta cuándo; no liberar automáticamente asientos si sigue existiendo una retención válida.
- Vencer: liberar la retención pendiente sin pago aprobado. Un trabajo de expiración no puede competir con la aprobación y dejar boletos emitidos sobre un asiento liberado.
- Comprobante UNDER_REVIEW: la política de vencimiento y tiempo máximo de revisión está pendiente. La implementación deberá aplicar una única regla acordada; no mantener plazas indefinidamente ni aprobar una retención vencida sin revalidar disponibilidad.

## 4. Rutas propuestas para mi módulo

El contrato POST /bookings ya existe como borrador en la rama de KT. Debemos acordar su responsabilidad de servidor y el cambio de pasajeros antes de duplicarlo. Las demás rutas son propuestas de coordinación, no implementaciones.

| Método y ruta | Entrada | Salida y permisos |
| --- | --- | --- |
| POST /bookings | Viaje, tramo y asociación explícita de cada asiento con pasajero, según contrato acordado con KT | 201: bookingId, estado, expiresAt, currency, total e items calculados. Cliente autenticado para su compra; oficina solo según alcance autorizado. |
| GET /bookings/:bookingId | ID de reserva | 200: resumen autorizado, estados separados y vencimiento; datos de instrucciones de pago cuando corresponda. Comprador propietario u oficinista de la cooperativa con permiso. |
| POST /bookings/:bookingId/payment-proofs | multipart/form-data: archivo y referencia de transferencia si se acuerda | 201: proofId, bookingId, paymentStatus UNDER_REVIEW y receivedAt. Solo comprador propietario o personal autorizado; no acepta un importe definitivo enviado por el cliente. |
| GET /bookings/:bookingId/payment | ID de reserva | 200: paymentStatus, referencia del comprobante actual y motivo público de rechazo si existe. Sin exponer notas internas ni datos de otras compras. |
| POST /payment-proofs/:proofId/review | decision APPROVE o REJECT; motivo obligatorio para rechazo | 200: resultado e IDs relacionados. Contrato compartido con Pablo: solo oficinista con permiso de revisión en la cooperativa. El comprador no puede invocarlo. |
| GET /bookings/:bookingId/tickets | ID de reserva | 200: boletos emitidos para esa reserva; lista vacía antes de emisión, con estado que lo explique. Acceso por propiedad y alcance autorizado. |
| GET /tickets/:ticketId/pdf | ID de boleto emitido | 200 application/pdf. Verificar autorización también en la descarga; no basta con ocultar el botón. |

Los nombres y tipos definitivos de IDs deben coincidir entre flota, viajes, usuarios y reservas. No asumir que el número visible del asiento es su ID global.

### Ejemplo ilustrativo de consulta de reserva

Ejemplo de campos propuestos, no respuesta de una API ejecutada:

- bookingId: booking-001; bookingStatus: PENDING_PAYMENT.
- paymentStatus: UNDER_REVIEW; ticketStatus: NOT_ISSUED.
- tripId, originStopId y destinationStopId: IDs acordados con viajes.
- currency: USD; total: importe definitivo calculado por servidor.
- expiresAt: fecha/hora con zona, según política acordada.
- items: lista explícita de seatId, passengerId, clase, tarifa, descuento autorizado e importe aplicado. No relacionar dos arrays por su posición sin documentarlo.

Representación monetaria pendiente de acuerdo (centavos enteros o decimal exacto serializado). No calcular importes de cobro con redondeos de coma flotante no controlados. Acordar adaptación con el total numérico del borrador de KT antes de cambiar su formato.

### Errores mínimos propuestos

- 400: petición mal formada.
- 401: sesión no válida; 403: permiso insuficiente. Para recursos ajenos, acordar uso consistente de 403 o 404 sin filtrar información.
- 404: recurso inexistente o no visible según política.
- 409: conflicto de disponibilidad, reserva vencida, transición inválida o revisión concurrente. Incluir un code estable para distinguir el motivo.
- 413: archivo demasiado grande; 415: tipo de archivo no admitido.
- 422: datos de pasajeros, selección o comprobante inválidos, con errores de campo útiles.
- 5xx: fallo técnico; nunca mostrar éxito ni duplicar reserva/aprobación por un reintento.

## 5. Reglas de datos y seguridad

- Confirmar N pasajeros para N asientos, sin asignar dos pasajeros a la misma plaza. Validar origen anterior a destino, paradas permitidas y viaje publicado.
- Calcular importe en servidor desde tarifas y descuentos acordados; mostrar el desglose al cliente. El total enviado por el navegador no es fuente de verdad.
- Comprobar propiedad y ámbito de cooperativa en cada petición, incluidos consulta de comprobante, revisión y PDF. No confiar en cooperativeId o rol enviados por el cliente.
- Guardar comprobantes en acceso privado. Validar contenido y tipo real del archivo, nombre seguro y límites acordados. No publicar archivos ni credenciales en Git. Tipos y tamaño máximo por definir; no fijar cifras arbitrarias.
- Mantener historial de intentos de comprobante y revisiones; sustituir un archivo no borra el rastro anterior.
- Confirmar/aprobar con transacción y controles de unicidad. Reintentar una misma operación no crea otra venta ni otro boleto. Acordar la clave de idempotencia y su alcance antes de implementar.
- El QR identifica/verifica el boleto mediante un mecanismo seguro acordado; no contiene datos personales completos ni se basa únicamente en un ID predecible. El escaneo operativo del chofer sigue fuera de esta entrega.
- Emitir un boleto individual por pasajero/asiento de la reserva confirmada, con cooperativa, viaje, tramo, fecha/hora, asiento/clase e importe aplicable. Descargarlo otra vez recupera el mismo boleto.
- Persistir historial y auditoría de creación, carga, revisión y emisión. Notificar por correo o en la aplicación según el canal acordado; no suponer servicios externos ya contratados.

## 6. Vistas que prepararé

- V08: instrucciones de transferencia, referencia de reserva, carga de comprobante y validaciones.
- V09: seguimiento de reserva/pago, aviso de vencimiento según política y motivo de rechazo; sin botón para autoaprobarse.
- V10: detalle e historial de boletos, visualización QR y descarga PDF autorizada. Coordinar navegación con KT para evitar dos historiales distintos.
- Las vistas de compra de KT y de oficina de Pablo se conectan mediante estos contratos; no se recrean en este módulo.

## 7. Criterios de aceptación para implementar después

- Dos compras simultáneas del mismo asiento y tramo no crean dos retenciones incompatibles.
- El mismo asiento puede venderse en tramos contiguos sin superposición, según paradas autorizadas.
- Cambiar el total en el navegador no altera el importe calculado por servidor.
- Subir comprobante muestra UNDER_REVIEW y todavía no habilita boleto.
- Un cliente y un oficinista sin permiso no pueden aprobar pagos; uno de otra cooperativa tampoco.
- Rechazo exige motivo; conserva auditoría y no emite boleto.
- Aprobación y expiración concurrentes producen un único resultado consistente, conforme a la política acordada.
- Repetir aprobación o reintentar emisión no duplica boletos.
- Una descarga posterior conserva el mismo boleto y deniega acceso ajeno, incluso con la URL directa.
- Se rechazan archivos no admitidos y se mantienen privados los comprobantes válidos.
- Pasajeros invitados no reciben cuentas activas automáticamente.

Estos criterios son comprobaciones futuras, no pruebas ejecutadas. En este entregable solo hay documentación.

## 8. Próximos pasos

Revisar la propuesta con los responsables de integración; resolver las decisiones pendientes; acordar contratos y esquema; preparar mocks coherentes; implementar únicamente mi módulo y verificarlo. Registrar cada avance mediante Conventional Commits y PR a develop con dos aprobaciones. No cerrar el issue del módulo completo solo por integrar esta propuesta.
