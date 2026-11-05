import type {
  Cotizacion,
  LineaCotizacion,
} from "../../types/compra/cotizacion";
import type {
  BeneficioVigente,
  PasajeroDatos,
  PerfilComprador,
  ReservaPendiente,
  SolicitudReserva,
} from "../../types/compra/reserva";
import type { ClaseAsientoCodigo } from "../../types/compra/viajes";
import { ErrorCompra } from "../../features/compra/errores";
import { FOTOS_BUS } from "../../features/compra/fotos";
import { edadEnFecha, diaEnEcuador } from "../../features/compra/fechas";
import type { ViajeReservable } from "../../features/compra/viajesApi";
import { mapaAsientosMock } from "../mapaAsientos";

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
    foto_url: FOTOS_BUS.dosPisos.tarjeta,
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

/** config_global: retención de asientos y máximo de pasajeros por reserva. */
const RETENCION_MINUTOS = 15;
const LIMITE_PASAJEROS = 10;

// Las reservas simuladas se guardan en sessionStorage para que viaje, tramo, asientos y
// pasajeros se conserven al recargar, como lo hará la base. Si no hay almacenamiento,
// quedan solo en memoria.
const CLAVE_ALMACEN = "gc.compra.reservas";
const almacen = cargarAlmacen();

function cargarAlmacen(): Map<string, ReservaPendiente> {
  try {
    const guardado = sessionStorage.getItem(CLAVE_ALMACEN);
    return new Map(guardado ? JSON.parse(guardado) : []);
  } catch {
    return new Map();
  }
}

/** Guarda los cambios hechos sobre una reserva simulada. */
export function persistirSimuladas() {
  try {
    sessionStorage.setItem(CLAVE_ALMACEN, JSON.stringify([...almacen]));
  } catch {
    // Sin almacenamiento la reserva sigue en memoria hasta recargar.
  }
}

/**
 * Imita reservar_asientos(): crea la reserva PENDIENTE con el viaje, el tramo y los asientos
 * elegidos y los retiene 15 minutos. El plano simulado de flota (mocks/mapaAsientos.ts) es el
 * mismo para todos los buses; si el viaje no vende la clase del asiento, se usa la del viaje.
 */
export function crearReservaSimulada(
  solicitud: SolicitudReserva,
  datos: ViajeReservable,
): ReservaPendiente {
  const { asiento_ids, origen_orden: o, destino_orden: d } = solicitud;
  if (
    asiento_ids.length === 0 ||
    asiento_ids.length > LIMITE_PASAJEROS ||
    new Set(asiento_ids).size !== asiento_ids.length
  ) {
    throw new ErrorCompra(422, {
      codigo: "ASIENTOS_INVALIDOS",
      mensaje: "Cantidad o IDs de asiento inválidos.",
      errores_campo: [
        {
          campo: "asiento_ids",
          mensaje: `Elige entre 1 y ${LIMITE_PASAJEROS} asientos sin repetir.`,
        },
      ],
    });
  }
  const clases = new Map(
    mapaAsientosMock.clases.map((c) => [c.id, c.codigo as ClaseAsientoCodigo]),
  );
  const celdas = asiento_ids.map((id) =>
    mapaAsientosMock.celdas.find(
      (c) => c.id === id && c.tipo === "ASIENTO" && c.activa,
    ),
  );
  if (celdas.some((c) => !c)) {
    throw new ErrorCompra(422, {
      codigo: "ASIENTOS_INVALIDOS",
      mensaje: "Cantidad o IDs de asiento inválidos.",
      errores_campo: [
        { campo: "asiento_ids", mensaje: "Asiento fuera del plano del bus." },
      ],
    });
  }
  // Mismo cruce de tramos que la restricción EXCLUDE de reserva_asientos (23P01).
  const cruza = (a: number, b: number) => a < d && b > o;
  const retenidos = new Set(
    [...almacen.values()]
      .filter(
        (r) =>
          r.estado === "PENDIENTE" &&
          r.viaje.viaje_id === solicitud.viaje_id &&
          new Date(r.expires_at).getTime() > Date.now() &&
          cruza(r.viaje.origen.orden, r.viaje.destino.orden),
      )
      .flatMap((r) => r.asientos.map((a) => a.asiento_id)),
  );
  if (
    celdas.some(
      (c) =>
        retenidos.has(c!.id) ||
        c!.ocupaciones.some((x) => cruza(x.origen_orden, x.destino_orden)),
    )
  ) {
    throw new ErrorCompra(409, {
      codigo: "ASIENTO_NO_DISPONIBLE",
      mensaje:
        "Uno de los asientos ya no está disponible. Actualiza la disponibilidad y elige otro.",
    });
  }
  const claseViaje = Object.keys(datos.tarifas)[0] as ClaseAsientoCodigo;
  const reserva: ReservaPendiente = {
    reserva_id: crypto.randomUUID(),
    estado: "PENDIENTE",
    expires_at: new Date(Date.now() + RETENCION_MINUTOS * 60000).toISOString(),
    cantidad: asiento_ids.length,
    viaje: datos.viaje,
    bus: datos.bus,
    asientos: celdas.map((c) => {
      const propia = clases.get(c!.clase_id ?? "");
      const clase =
        propia && datos.tarifas[propia] !== undefined ? propia : claseViaje;
      return {
        reserva_asiento_id: crypto.randomUUID(),
        asiento_id: c!.id,
        codigo: c!.codigo ?? "",
        piso: c!.piso,
        clase,
        tarifa_centavos: datos.tarifas[clase]!,
      };
    }),
    contacto: null,
    pasajeros: [],
    cotizacion: null,
    aceptada_version: null,
  };
  almacen.set(reserva.reserva_id, reserva);
  persistirSimuladas();
  return reserva;
}

/** Devuelve la reserva simulada. La de la maqueta se crea con 15 minutos de retención la primera vez. */
export function reservaSimulada(reservaId: string): ReservaPendiente {
  if (reservaId === RESERVA_VENCIDA_ID) {
    throw new ErrorCompra(409, {
      codigo: "RESERVA_NO_EDITABLE",
      mensaje: "La reserva venció y los asientos se liberaron.",
    });
  }
  let r = almacen.get(reservaId);
  if (!r && reservaId !== RESERVA_DEMO_ID) {
    throw new ErrorCompra(404, {
      codigo: "RESERVA_NO_ENCONTRADA",
      mensaje: "Reserva no encontrada",
    });
  }
  if (!r) {
    r = {
      ...structuredClone(reservaBase),
      reserva_id: reservaId,
      expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
    };
    almacen.set(reservaId, r);
    persistirSimuladas();
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
  persistirSimuladas();
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
  persistirSimuladas();
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
  persistirSimuladas();
  return cotizacion;
}
