import type {
  BeneficioVigente,
  PasajeroDatos,
  TipoDocumento,
} from "../../types/compra/reserva";
import { esFechaValida } from "./fechas";

// Validaciones de la vista 4. El servidor vuelve a validar con guardar_pasajero() y cotizar().

export const LIMITES_PASAJERO = {
  nombres: 100,
  apellidos: 100,
  documento: 30,
  telefono: 25,
  email: 254,
} as const;

export const TIPOS_DOCUMENTO: { valor: TipoDocumento; nombre: string }[] = [
  { valor: "CEDULA", nombre: "Cédula" },
  { valor: "PASAPORTE", nombre: "Pasaporte" },
  { valor: "OTRO", nombre: "Otro" },
];

/** Valores de una ficha tal como se escriben. beneficio "" = adulto. */
export interface FichaPasajero {
  reserva_asiento_id: string;
  nombres: string;
  apellidos: string;
  tipo_documento: TipoDocumento;
  documento: string;
  nacimiento: string;
  telefono: string;
  email: string;
  beneficio: PasajeroDatos["beneficio_codigo"] | "";
  respaldo_nombre: string;
  respaldo_archivo_id: string | null;
}

export type CampoFicha =
  | keyof Omit<FichaPasajero, "reserva_asiento_id" | "respaldo_nombre">
  | "respaldo";
export type ErroresFicha = Partial<Record<CampoFicha, string>>;

export function fichaVacia(reservaAsientoId: string): FichaPasajero {
  return {
    reserva_asiento_id: reservaAsientoId,
    nombres: "",
    apellidos: "",
    tipo_documento: "CEDULA",
    documento: "",
    nacimiento: "",
    telefono: "",
    email: "",
    beneficio: "",
    respaldo_nombre: "",
    respaldo_archivo_id: null,
  };
}

/** Cédula ecuatoriana: 10 dígitos, provincia 01-24 o 30, tercer dígito < 6 y dígito verificador (módulo 10). */
export function esCedulaValida(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;
  if (Number(cedula[2]) >= 6) return false;
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(cedula[i]) * (i % 2 === 0 ? 2 : 1);
    if (d > 9) d -= 9;
    suma += d;
  }
  return (10 - (suma % 10)) % 10 === Number(cedula[9]);
}

export function esTelefonoValido(telefono: string): boolean {
  return /^\+?\d{7,15}$/.test(telefono.replace(/[\s-]/g, ""));
}

export function esCorreoPasajeroValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

export function validarFicha(
  f: FichaPasajero,
  esComprador: boolean,
  hoy: string,
  beneficios: BeneficioVigente[],
): ErroresFicha {
  const e: ErroresFicha = {};
  if (!f.nombres.trim()) e.nombres = "Escribe los nombres.";
  else if (f.nombres.trim().length > LIMITES_PASAJERO.nombres)
    e.nombres = `Máximo ${LIMITES_PASAJERO.nombres} caracteres.`;
  if (!f.apellidos.trim()) e.apellidos = "Escribe los apellidos.";
  else if (f.apellidos.trim().length > LIMITES_PASAJERO.apellidos)
    e.apellidos = `Máximo ${LIMITES_PASAJERO.apellidos} caracteres.`;

  const doc = f.documento.trim();
  if (!doc) e.documento = "Escribe el número de documento.";
  else if (doc.length > LIMITES_PASAJERO.documento)
    e.documento = `Máximo ${LIMITES_PASAJERO.documento} caracteres.`;
  else if (f.tipo_documento === "CEDULA" && !esCedulaValida(doc))
    e.documento = "La cédula no es válida.";
  else if (f.tipo_documento === "PASAPORTE" && !/^[A-Za-z0-9]{5,20}$/.test(doc))
    e.documento = "El pasaporte debe tener entre 5 y 20 letras o números.";

  if (!f.nacimiento) e.nacimiento = "Escribe la fecha de nacimiento.";
  else if (!esFechaValida(f.nacimiento))
    e.nacimiento = "La fecha no es válida.";
  else if (f.nacimiento > hoy)
    e.nacimiento = "La fecha de nacimiento no puede ser futura.";
  else if (f.nacimiento < "1900-01-01")
    e.nacimiento = "Revisa el año de nacimiento.";

  if (esComprador || f.telefono.trim()) {
    if (!f.telefono.trim())
      e.telefono = "Escribe un teléfono o WhatsApp de contacto.";
    else if (!esTelefonoValido(f.telefono))
      e.telefono = "Escribe un teléfono válido, por ejemplo +593991234567.";
  }
  if (esComprador || f.email.trim()) {
    if (!f.email.trim()) e.email = "Escribe un correo electrónico de contacto.";
    else if (
      !esCorreoPasajeroValido(f.email) ||
      f.email.trim().length > LIMITES_PASAJERO.email
    )
      e.email = "Escribe un correo válido.";
  }

  if (f.beneficio) {
    const regla = beneficios.find((b) => b.codigo === f.beneficio);
    if (!regla?.activo)
      e.beneficio =
        "Este beneficio no tiene una regla vigente; elige otro tipo de pasajero.";
    else if (regla.requiere_respaldo && !f.respaldo_archivo_id)
      e.respaldo = "Adjunta el documento de respaldo del beneficio.";
  }
  return e;
}

/** Valida todas las fichas: una por asiento, sin asientos repetidos ni la misma persona dos veces. */
export function validarFichas(
  fichas: FichaPasajero[],
  asientos: string[],
  hoy: string,
  beneficios: BeneficioVigente[],
): { porFicha: ErroresFicha[]; general: string | null } {
  const porFicha = fichas.map((f, i) =>
    validarFicha(f, i === 0, hoy, beneficios),
  );
  let general: string | null = null;
  const ids = fichas.map((f) => f.reserva_asiento_id);
  if (new Set(ids).size !== ids.length)
    general =
      "Hay dos fichas para el mismo asiento. Cada asiento admite un solo pasajero.";
  else if (
    ids.length !== asientos.length ||
    !asientos.every((a) => ids.includes(a))
  )
    general = "Completa una ficha por cada asiento reservado.";

  const vistos = new Map<string, number>();
  fichas.forEach((f, i) => {
    const clave = `${f.tipo_documento}:${f.documento.trim().toUpperCase()}`;
    if (!f.documento.trim()) return;
    if (vistos.has(clave))
      porFicha[i].documento ??=
        `Este documento ya está en la ficha del pasajero ${vistos.get(clave)! + 1}.`;
    else vistos.set(clave, i);
  });
  return { porFicha, general };
}

export function fichaAPasajero(f: FichaPasajero): PasajeroDatos {
  return {
    reserva_asiento_id: f.reserva_asiento_id,
    nombres: f.nombres.trim(),
    apellidos: f.apellidos.trim(),
    tipo_documento: f.tipo_documento,
    documento: f.documento.trim(),
    nacimiento: f.nacimiento || null,
    beneficio_codigo: f.beneficio || null,
    respaldo_archivo_id: f.beneficio ? f.respaldo_archivo_id : null,
    telefono: f.telefono.trim() || null,
    email: f.email.trim() || null,
  };
}

export function pasajeroAFicha(p: PasajeroDatos): FichaPasajero {
  return {
    reserva_asiento_id: p.reserva_asiento_id,
    nombres: p.nombres,
    apellidos: p.apellidos,
    tipo_documento: p.tipo_documento,
    documento: p.documento,
    nacimiento: p.nacimiento ?? "",
    telefono: p.telefono ?? "",
    email: p.email ?? "",
    beneficio: p.beneficio_codigo ?? "",
    respaldo_nombre: "",
    respaldo_archivo_id: p.respaldo_archivo_id,
  };
}
