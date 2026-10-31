import type {
  Cotizacion,
  LineaCotizacion,
} from "../../types/compra/cotizacion";
import type {
  BeneficioVigente,
  PasajeroDatos,
  PerfilComprador,
  ReservaPendiente,
} from "../../types/compra/reserva";
import { ErrorCompra } from "../../features/compra/errores";
import { edadEnFecha, diaEnEcuador } from "../../features/compra/fechas";

// Datos simulados de la reserva de la maqueta (2 asientos Ejecutivo de $28.00, Quito -> Guayaquil).
// Este archivo hace de "servidor": aquí sí se calcula la cotización, imitando cotizar().

export const RESERVA_DEMO_ID = "00000000-0000-4000-8000-000000000901";
/** Reserva que el "servidor" da por vencida, para probar el 409. */
export const RESERVA_VENCIDA_ID = "00000000-0000-4000-8000-000000000902";

const reservaBase: Omit<ReservaPendiente, "reserva_id" | "expires_at"> = {
  estado: "PENDIENTE",
  cantidad: 2,
  viaje: {
    viaje_id: "00000000-0000-4000-8000-000000000101",
    cooperativa: "Gran Continental",
    salida: "2026-12-10T06:00:00-05:00",
    llegada: "2026-12-10T14:30:00-05:00",
    origen: {
      orden: 1,
      ciudad: "Quito",
      terminal: "Terminal Quitumbe",
      ciudad_id: "00000000-0000-4000-8000-000000000401",
    },
    destino: {
      orden: 2,
      ciudad: "Guayaquil",
      terminal: "Terminal Terrestre",
      ciudad_id: "00000000-0000-4000-8000-000000000402",
    },
  },
  bus: {
    id: "00000000-0000-4000-8000-000000000601",
    unidad: "018",
    placa: "PAB-1234",
    chasis: "Scania",
    carroceria: "Marcopolo",
    carroceria_modelo: "Paradiso 1800 DD",
    grupo: "Ejecutivo",
    plano_id: "00000000-0000-4000-8000-000000000701",
    pisos: 2,
    foto_url: null,
    servicios: [
      "AIRE",
      "ASIENTO_CAMA",
      "WIFI",
      "BANO",
      "PANTALLAS",
      "ENCHUFES",
    ],
  },
  asientos: [
    {
      reserva_asiento_id: "00000000-0000-4000-8000-000000000911",
      asiento_id: "00000000-0000-4000-8000-000000000921",
      codigo: "U8",
      piso: 2,
      clase: "EJECUTIVO",
      tarifa_centavos: 2800,
    },
    {
      reserva_asiento_id: "00000000-0000-4000-8000-000000000912",
      asiento_id: "00000000-0000-4000-8000-000000000922",
      codigo: "U9",
      piso: 2,
      clase: "EJECUTIVO",
      tarifa_centavos: 2800,
    },
  ],
  contacto: null,
  pasajeros: [],
  cotizacion: null,
  aceptada_version: null,
};

export const perfilDemo: PerfilComprador = {
  nombres: "Ángel Matías",
  apellidos: "Galarza",
  tipo_documento: "CEDULA",
  documento: "1723456784",
  nacimiento: "1992-03-15",
  telefono: "+593991234567",
  email: "angel.galarza@example.com",
};

/** Pasajeros de la maqueta, para abrir la vista 5 directamente. */
export const pasajerosDemo: PasajeroDatos[] = [
  {
    reserva_asiento_id: "00000000-0000-4000-8000-000000000911",
    nombres: "Ángel Matías",
    apellidos: "Galarza",
    tipo_documento: "CEDULA",
    documento: "1723456784",
    nacimiento: "1992-03-15",
    beneficio_codigo: null,
    respaldo_archivo_id: null,
  },
  {
    reserva_asiento_id: "00000000-0000-4000-8000-000000000912",
    nombres: "María Fernanda",
    apellidos: "Galarza",
    tipo_documento: "CEDULA",
    documento: "1729876548",
    nacimiento: "2018-07-22",
    beneficio_codigo: "NINO",
    respaldo_archivo_id: null,
  },
];

// Según GUIA_COMPLETA.md §10, la demo solo activa niño 30 %; tercera edad y discapacidad
// no tienen tasa aprobada. Las edades del beneficio niño no están definidas en el repositorio.
export const beneficiosDemo: BeneficioVigente[] = [
  {
    codigo: "NINO",
    nombre: "Niño",
    activo: true,
    descuento_bp: 3000,
    edad_min: null,
    edad_max_exclusiva: null,
    condiciones: "Presentar documento de identidad al abordar.",
    requiere_respaldo: false,
  },
  {
    codigo: "TERCERA_EDAD",
    nombre: "Tercera edad",
    activo: false,
    descuento_bp: null,
    edad_min: null,
    edad_max_exclusiva: null,
    condiciones: null,
    requiere_respaldo: false,
  },
  {
    codigo: "DISCAPACIDAD",
    nombre: "Persona con discapacidad",
    activo: false,
    descuento_bp: null,
    edad_min: null,
    edad_max_exclusiva: null,
    condiciones: null,
    requiere_respaldo: true,
  },
];

/** Impuesto del pasaje terrestre en la demo: 0 %. */
const IVA_PASAJE_BP = 0;

const almacen = new Map<string, ReservaPendiente>();

/** Devuelve la reserva simulada; se crea con 15 minutos de retención la primera vez. */
export function reservaSimulada(reservaId: string): ReservaPendiente {
  if (reservaId === RESERVA_VENCIDA_ID) {
    throw new ErrorCompra(409, {
      codigo: "RESERVA_NO_EDITABLE",
      mensaje: "La reserva venció y los asientos se liberaron.",
    });
  }
  if (reservaId !== RESERVA_DEMO_ID) {
    throw new ErrorCompra(404, {
      codigo: "RESERVA_NO_ENCONTRADA",
      mensaje: "Reserva no encontrada",
    });
  }
  let r = almacen.get(reservaId);
  if (!r) {
    r = {
      ...structuredClone(reservaBase),
      reserva_id: reservaId,
      expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
    };
    almacen.set(reservaId, r);
  }
  if (r.estado !== "PENDIENTE") {
    throw new ErrorCompra(409, {
      codigo: "RESERVA_NO_EDITABLE",
      mensaje: "La reserva ya no está pendiente.",
    });
  }
  return r;
}

export function cancelarSimulada(reservaId: string) {
  const r = almacen.get(reservaId);
  if (r) r.estado = "CANCELADA";
  almacen.delete(reservaId);
}

/** Imita guardar_pasajero(): guarda o reemplaza cada pasajero y anula la aceptación. */
export function guardarPasajerosSimulado(
  r: ReservaPendiente,
  pasajeros: PasajeroDatos[],
) {
  const errores: { campo: string; mensaje: string }[] = [];
  const hoy = diaEnEcuador(new Date().toISOString());
  pasajeros.forEach((p, i) => {
    if (
      !r.asientos.some((a) => a.reserva_asiento_id === p.reserva_asiento_id)
    ) {
      errores.push({
        campo: `pasajeros[${i}].reserva_asiento_id`,
        mensaje: "El asiento no pertenece a la reserva.",
      });
    }
    if (p.nacimiento && p.nacimiento > hoy)
      errores.push({
        campo: `pasajeros[${i}].nacimiento`,
        mensaje: "Nacimiento futuro",
      });
  });
  if (
    new Set(pasajeros.map((p) => p.reserva_asiento_id)).size !==
    pasajeros.length
  ) {
    errores.push({
      campo: "pasajeros",
      mensaje: "Cada asiento admite un solo pasajero.",
    });
  }
  if (errores.length)
    throw new ErrorCompra(422, {
      codigo: "DATOS_INVALIDOS",
      mensaje: "Revisa los datos marcados.",
      errores_campo: errores,
    });
  r.pasajeros = structuredClone(pasajeros);
  r.aceptada_version = null;
}

/** Imita cotizar(): tarifa por asiento, beneficio a la fecha de salida e IVA redondeado por línea. */
export function cotizarSimulado(r: ReservaPendiente): Cotizacion {
  if (r.pasajeros.length !== r.cantidad) {
    throw new ErrorCompra(422, {
      codigo: "PASAJEROS_INCOMPLETOS",
      mensaje: "Complete un pasajero por asiento.",
    });
  }
  const salida = diaEnEcuador(r.viaje.salida);
  const lineas: LineaCotizacion[] = r.asientos.map((a, i) => {
    const p = r.pasajeros.find(
      (x) => x.reserva_asiento_id === a.reserva_asiento_id,
    )!;
    let descuento = 0;
    let beneficio: BeneficioVigente | undefined;
    if (p.beneficio_codigo) {
      beneficio = beneficiosDemo.find(
        (b) => b.codigo === p.beneficio_codigo && b.activo,
      );
      if (!beneficio || beneficio.descuento_bp === null) {
        throw new ErrorCompra(422, {
          codigo: "BENEFICIO_NO_VIGENTE",
          mensaje: "El beneficio elegido no tiene una regla vigente.",
          errores_campo: [
            {
              campo: `pasajeros[${i}].beneficio_codigo`,
              mensaje: "Beneficio no definido o inactivo",
            },
          ],
        });
      }
      const edad = p.nacimiento ? edadEnFecha(p.nacimiento, salida) : null;
      if (
        (beneficio.edad_min !== null ||
          beneficio.edad_max_exclusiva !== null) &&
        (edad === null ||
          edad < (beneficio.edad_min ?? 0) ||
          edad >= (beneficio.edad_max_exclusiva ?? 1000))
      ) {
        throw new ErrorCompra(422, {
          codigo: "EDAD_NO_ELEGIBLE",
          mensaje: "Edad no elegible para el beneficio.",
          errores_campo: [
            {
              campo: `pasajeros[${i}].beneficio_codigo`,
              mensaje: "Edad no elegible",
            },
          ],
        });
      }
      if (beneficio.requiere_respaldo && !p.respaldo_archivo_id) {
        throw new ErrorCompra(422, {
          codigo: "FALTA_RESPALDO",
          mensaje: "Falta el respaldo del beneficio.",
          errores_campo: [
            {
              campo: `pasajeros[${i}].respaldo_archivo_id`,
              mensaje: "Falta respaldo de beneficio",
            },
          ],
        });
      }
      descuento = Math.round(
        (a.tarifa_centavos * beneficio.descuento_bp) / 10000,
      );
    }
    const servicio = 0;
    const iva = Math.round(
      ((a.tarifa_centavos - descuento) * IVA_PASAJE_BP) / 10000,
    );
    return {
      reserva_asiento_id: a.reserva_asiento_id,
      asiento_codigo: a.codigo,
      pasajero: `${p.nombres} ${p.apellidos}`,
      clase: a.clase,
      beneficio_codigo: p.beneficio_codigo,
      beneficio_nombre: beneficio?.nombre ?? null,
      descuento_bp: beneficio?.descuento_bp ?? null,
      base_centavos: a.tarifa_centavos,
      descuento_centavos: descuento,
      servicio_centavos: servicio,
      impuesto_bp: IVA_PASAJE_BP,
      impuesto_servicio_bp: 0,
      iva_centavos: iva,
      subtotal_neto_centavos: a.tarifa_centavos - descuento + servicio,
      total_centavos: a.tarifa_centavos - descuento + servicio + iva,
    };
  });
  const suma = (campo: keyof LineaCotizacion) =>
    lineas.reduce((t, l) => t + (l[campo] as number), 0);
  const cotizacion: Cotizacion = {
    version: (r.cotizacion?.version ?? 0) + 1,
    moneda: "USD",
    base_centavos: suma("base_centavos"),
    descuento_centavos: suma("descuento_centavos"),
    servicio_centavos: suma("servicio_centavos"),
    subtotal_neto_centavos: suma("subtotal_neto_centavos"),
    iva_centavos: suma("iva_centavos"),
    total_centavos: suma("total_centavos"),
    impuesto_bp: IVA_PASAJE_BP,
    expires_at: r.expires_at,
    lineas,
  };
  r.cotizacion = cotizacion;
  r.aceptada_version = null;
  return cotizacion;
}
