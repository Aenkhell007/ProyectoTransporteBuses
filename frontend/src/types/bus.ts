export interface GrupoBus {
  id: string;
  nombre: string;
}

export interface Bus {
  id: string;
  unidad: string;
  placa: string;
  chasis: string;
  carroceria: string;
  grupo_id: string;
  propietario: string | null;
  correo_contacto: string | null;
  activo: boolean;
}

export interface BusFormData {
  unidad: string;
  placa: string;
  chasis: string;
  carroceria: string;
  grupo_id: string;
  propietario: string;
  correo_contacto: string;
}