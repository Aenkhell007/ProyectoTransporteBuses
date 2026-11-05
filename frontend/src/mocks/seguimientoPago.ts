export type EscenarioPago = 'revision' | 'aprobado' | 'rechazado' | 'vencida';

// Datos ficticios de la Vista 7.1. No representan una reserva ni un pago registrados.
export const seguimientoPagoDemo = {
  reservaId: 'demo-reserva-pago',
  codigo: 'GC-20261010-4587',
  montoReportadoCentavos: 4760,
  tamanoArchivo: '1.2 MB',
  recibido: '31 oct. 2026, 10:15',
  revisado: '31 oct. 2026, 10:30',
  archivo: 'comprobante.jpg',
  referencia: 'DEMO-OPERACION-001',
  motivoRechazo: 'El valor de la operación no se distingue en el comprobante. Adjunta una imagen completa y legible donde se vean la fecha, el valor y la referencia.',
};

export const escenariosPago: { id: EscenarioPago; nombre: string }[] = [
  { id: 'revision', nombre: 'Pago en revisión' },
  { id: 'aprobado', nombre: 'Pago aprobado' },
  { id: 'rechazado', nombre: 'Comprobante rechazado' },
  { id: 'vencida', nombre: 'Reserva vencida' },
];
