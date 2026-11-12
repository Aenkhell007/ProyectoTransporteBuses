export interface SolicitudReembolso {
  id: string;
  reservaId: string;
  cliente: string;
  montoPagado: number;
  porcentajeDevolucion: number;
  montoDevolver: number;
  estado: 'Solicitado' | 'Completado' | 'Rechazado';
  anticipacion: string;
  versionPolitica: string;
  fechaViaje: string;
  notaInterna?: string;
  historial: {
    id: number;
    accion: string;
    fechaHora: string;
    descripcion: string;
  }[];
}

export interface ReembolsosResumenData {
  solicitudesHoy: number;
  solicitada: number;
  completadas: number;
  rechazadas: number;
  lista: SolicitudReembolso[];
}