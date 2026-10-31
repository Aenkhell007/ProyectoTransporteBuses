import type { MiViaje } from "../../types/compra/misViajes";

// Datos simulados que imitan v_mis_viajes (compras) y reservas con pago en verificación.
// cliente_id solo existe aquí, del lado del "servidor": la pantalla nunca lo envía.

export const CLIENTE_A = "00000000-0000-4000-8000-000000000a01";
export const CLIENTE_B = "00000000-0000-4000-8000-000000000b01";

export interface MiViajeSimulado {
  cliente_id: string;
  /** Estado guardado en la base; FINALIZADO se deriva de la fecha de salida. */
  estado_base:
    | "CONFIRMADA"
    | "PAGO_EN_VERIFICACION"
    | "CANCELADA"
    | "REEMBOLSADA";
  viaje: Omit<MiViaje, "estado">;
}

const QUITO = { ciudad: "Quito", terminal: "Terminal Quitumbe" };
const GYE = { ciudad: "Guayaquil", terminal: "Terminal Terrestre" };
const CUENCA = { ciudad: "Cuenca", terminal: "Terminal Terrestre" };
const AMBATO = { ciudad: "Ambato", terminal: "Terminal Terrestre" };
const LOJA = { ciudad: "Loja", terminal: "Terminal Terrestre" };
const ANGEL = "Ángel Matías Galarza";
const MARIA = "María Fernanda Galarza";

let n = 0;
function compra(
  cliente_id: string,
  estado_base: MiViajeSimulado["estado_base"],
  datos: Partial<Omit<MiViaje, "estado">> &
    Pick<MiViaje, "codigo" | "salida" | "llegada" | "origen" | "destino">,
): MiViajeSimulado {
  n += 1;
  const id = (base: number) =>
    `00000000-0000-4000-8000-${String(1000000000000 + base + n).slice(1)}`;
  const esReserva = estado_base === "PAGO_EN_VERIFICACION";
  return {
    cliente_id,
    estado_base,
    viaje: {
      tipo: esReserva ? "RESERVA" : "COMPRA",
      compra_id: esReserva ? null : id(3000),
      reserva_id: id(4000),
      grupo: "Confort",
      pisos: 1,
      pisos_asientos: [1],
      pasajeros: [ANGEL],
      asientos: ["12"],
      total_pagado_centavos: esReserva ? null : 2000,
      monto_reportado_centavos: null,
      boleto_id: esReserva ? null : id(5000),
      estado_documento: esReserva ? null : "LISTO",
      foto_url: null,
      ...datos,
    },
  };
}

export const misViajesMock: MiViajeSimulado[] = [
  compra(CLIENTE_A, "CONFIRMADA", {
    codigo: "GC-20261210-4587",
    salida: "2026-12-10T06:00:00-05:00",
    llegada: "2026-12-10T14:30:00-05:00",
    origen: QUITO,
    destino: GYE,
    grupo: "Ejecutivo",
    pisos: 2,
    pisos_asientos: [2],
    pasajeros: [ANGEL, MARIA],
    asientos: ["U8", "U9"],
    total_pagado_centavos: 4760,
  }),
  compra(CLIENTE_A, "PAGO_EN_VERIFICACION", {
    codigo: "GC-20261224-4621",
    salida: "2026-12-24T07:00:00-05:00",
    llegada: "2026-12-24T15:00:00-05:00",
    origen: QUITO,
    destino: CUENCA,
    monto_reportado_centavos: 2200,
  }),
  compra(CLIENTE_A, "CONFIRMADA", {
    codigo: "GC-20261231-5010",
    salida: "2026-12-31T08:00:00-05:00",
    llegada: "2026-12-31T11:00:00-05:00",
    origen: AMBATO,
    destino: QUITO,
    asientos: ["7C"],
    total_pagado_centavos: 1200,
    estado_documento: "PENDIENTE_EMISION",
  }),
  compra(CLIENTE_A, "CONFIRMADA", {
    codigo: "GC-20260920-4102",
    salida: "2026-09-20T06:00:00-05:00",
    llegada: "2026-09-20T14:30:00-05:00",
    origen: QUITO,
    destino: GYE,
    grupo: "Ejecutivo",
    pisos: 2,
    pisos_asientos: [2],
    pasajeros: [ANGEL, MARIA],
    asientos: ["U8", "U9"],
    total_pagado_centavos: 4760,
  }),
  compra(CLIENTE_A, "CONFIRMADA", {
    codigo: "GC-20260912-4001",
    salida: "2026-09-12T07:00:00-05:00",
    llegada: "2026-09-12T15:00:00-05:00",
    origen: QUITO,
    destino: CUENCA,
    asientos: ["7C"],
    total_pagado_centavos: 2000,
  }),
  compra(CLIENTE_A, "CANCELADA", {
    codigo: "GC-20260905-3982",
    salida: "2026-09-05T08:00:00-05:00",
    llegada: "2026-09-05T11:00:00-05:00",
    origen: AMBATO,
    destino: QUITO,
    asientos: ["5A"],
    total_pagado_centavos: 1200,
    estado_documento: "ANULADO",
  }),
  compra(CLIENTE_A, "REEMBOLSADA", {
    codigo: "GC-20260815-3301",
    salida: "2026-08-15T21:00:00-05:00",
    llegada: "2026-08-16T06:00:00-05:00",
    origen: QUITO,
    destino: LOJA,
    asientos: ["9"],
    total_pagado_centavos: 2500,
    estado_documento: "ANULADO",
  }),
  compra(CLIENTE_A, "CONFIRMADA", {
    codigo: "GC-20260720-2950",
    salida: "2026-07-20T13:00:00-05:00",
    llegada: "2026-07-20T21:30:00-05:00",
    origen: GYE,
    destino: QUITO,
    asientos: ["14"],
    total_pagado_centavos: 2000,
  }),
  // Compra de otro cliente: v_mis_viajes nunca la devuelve a CLIENTE_A.
  compra(CLIENTE_B, "CONFIRMADA", {
    codigo: "GC-20261211-9999",
    salida: "2026-12-11T06:00:00-05:00",
    llegada: "2026-12-11T14:30:00-05:00",
    origen: QUITO,
    destino: GYE,
    pasajeros: ["Otra Persona"],
    asientos: ["3"],
    total_pagado_centavos: 2000,
  }),
];

/** Sesión simulada. Las pruebas pueden cerrarla para comprobar el 401. */
export const sesionSimulada: { cliente_id: string | null } = {
  cliente_id: CLIENTE_A,
};
