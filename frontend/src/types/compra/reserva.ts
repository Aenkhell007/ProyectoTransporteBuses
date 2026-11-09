// Reserva pendiente y pasajeros (POST /reservas, PUT /reservas/:id/pasajeros,
// GET /reservas/:id/resumen). Ver docs/api/compra-endpoints.md.
import type { BusViaje, ClaseAsientoCodigo, ParadaViaje } from "./viajes";
import type { Cotizacion } from "./cotizacion";

export type TipoDocumento = "CEDULA" | "PASAPORTE" | "OTRO";
export type BeneficioCodigo = "NINO" | "TERCERA_EDAD" | "DISCAPACIDAD";
export type EstadoReserva =
  | "PENDIENTE"
  | "CONFIRMADA"
  | "VENCIDA"
  | "CANCELADA";

export interface AsientoReservado {
  reserva_asiento_id: string;
  asiento_id: string;
  codigo: string;
  piso: number;
  clase: ClaseAsientoCodigo;
  /** Tarifa vigente del tramo para la clase del asiento (referencial hasta cotizar). */
  tarifa_centavos: number;
}

/** POST /reservas: viaje, tramo y asientos elegidos en la selección de asientos (vistas 3.1/3.2). */
export interface SolicitudReserva {
  viaje_id: string;
  origen_orden: number;
  destino_orden: number;
  asiento_ids: string[];
}

/** Respuesta 201 de POST /reservas. */
export interface ReservaCreada {
  reserva_id: string;
  expires_at: string;
  asientos: Pick<
    AsientoReservado,
    "reserva_asiento_id" | "asiento_id" | "codigo"
  >[];
}

export interface PasajeroDatos {
  reserva_asiento_id: string;
  nombres: string;
  apellidos: string;
  tipo_documento: TipoDocumento;
  documento: string;
  nacimiento: string | null;
  beneficio_codigo: BeneficioCodigo | null;
  respaldo_archivo_id: string | null;
  /** Contactos opcionales del pasajero; no crean una cuenta de usuario. */
  telefono?: string | null;
  email?: string | null;
}

export interface ContactoReserva {
  email: string;
  telefono: string;
}

export interface SolicitudPasajeros {
  contacto: ContactoReserva;
  pasajeros: PasajeroDatos[];
}

export interface ReservaPendiente {
  reserva_id: string;
  estado: EstadoReserva;
  expires_at: string;
  cantidad: number;
  viaje: {
    viaje_id: string;
    cooperativa: string;
    salida: string;
    llegada: string;
    origen: ParadaViaje & { ciudad_id: string };
    destino: ParadaViaje & { ciudad_id: string };
  };
  bus: BusViaje & { carroceria_modelo: string | null };
  asientos: AsientoReservado[];
  contacto: ContactoReserva | null;
  pasajeros: PasajeroDatos[];
  cotizacion: Cotizacion | null;
  aceptada_version: number | null;
}

/** Regla vigente de un beneficio (tabla beneficios). */
export interface BeneficioVigente {
  codigo: BeneficioCodigo;
  nombre: string;
  activo: boolean;
  descuento_bp: number | null;
  edad_min: number | null;
  edad_max_exclusiva: number | null;
  condiciones: string | null;
  requiere_respaldo: boolean;
}

/** Datos del perfil del comprador (módulo de Matías). */
export interface PerfilComprador {
  nombres: string;
  apellidos: string;
  tipo_documento: TipoDocumento;
  documento: string;
  nacimiento: string | null;
  telefono: string;
  email: string;
}
