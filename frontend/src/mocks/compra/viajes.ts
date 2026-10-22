import type {
  BusViaje,
  ClaseAsientoCodigo,
  Cooperativa,
  TipoViaje,
} from "../../types/compra/viajes";
import { CIUDAD } from "./catalogo";

// Datos simulados que imitan las tablas viajes, frecuencias, ruta_paradas, buses y tarifas.
// Las tarifas son de demostración; las reales las configura Benjamín.

export const COOPERATIVA = {
  granContinental: "00000000-0000-4000-8000-000000000501",
  expresoSierra: "00000000-0000-4000-8000-000000000502",
} as const;

export const cooperativasMock: Cooperativa[] = [
  { id: COOPERATIVA.granContinental, nombre: "Gran Continental" },
  { id: COOPERATIVA.expresoSierra, nombre: "Expreso Sierra (demo)" },
];

export interface ParadaSimulada {
  orden: number;
  ciudad_id: string;
  ciudad: string;
  terminal: string;
  /** Minutos desde la salida en la primera parada. */
  minutos: number;
}

export interface ViajeSimulado {
  viaje_id: string;
  cooperativa_id: string;
  estado: "PUBLICADO" | "BORRADOR";
  tipo_viaje: TipoViaje;
  hora_salida: string;
  paradas: ParadaSimulada[];
  bus: BusViaje;
  libres: Partial<Record<ClaseAsientoCodigo, number>>;
  /** Precio de la ruta completa por clase; los tramos son proporcionales al tiempo. */
  tarifa_completa: Partial<Record<ClaseAsientoCodigo, number>>;
  /** Simula lo que otro cliente hace mientras este mira la lista. */
  cambio_al_seleccionar?: "AGOTADO" | "PRECIO";
}

const p = (
  orden: number,
  ciudad_id: string,
  ciudad: string,
  terminal: string,
  minutos: number,
): ParadaSimulada => ({ orden, ciudad_id, ciudad, terminal, minutos });

const QUITO = p(1, CIUDAD.quito, "Quito", "Terminal Quitumbe", 0);
const GYE_DIRECTO = p(
  2,
  CIUDAD.guayaquil,
  "Guayaquil",
  "Terminal Terrestre",
  510,
);
const RUTA_SIERRA_COSTA = [
  QUITO,
  p(2, CIUDAD.latacunga, "Latacunga", "Terminal Latacunga", 90),
  p(3, CIUDAD.ambato, "Ambato", "Terminal Terrestre Ambato", 150),
  p(4, CIUDAD.riobamba, "Riobamba", "Terminal Riobamba", 240),
  p(5, CIUDAD.guayaquil, "Guayaquil", "Terminal Terrestre", 510),
];

let correlativo = 0;
function bus(
  unidad: string,
  placa: string,
  chasis: string,
  carroceria: string,
  grupo: string,
  pisos: number,
  servicios: BusViaje["servicios"],
): BusViaje {
  correlativo += 1;
  return {
    id: id(600 + correlativo),
    unidad,
    placa,
    chasis,
    carroceria,
    grupo,
    plano_id: id(700 + correlativo),
    pisos,
    foto_url: null,
    servicios,
  };
}

const EJECUTIVO_2P: BusViaje["servicios"] = [
  "AIRE",
  "ASIENTO_CAMA",
  "WIFI",
  "BANO",
  "PANTALLAS",
  "ENCHUFES",
];
const CONFORT: BusViaje["servicios"] = [
  "AIRE",
  "ASIENTO_RECLINABLE",
  "WIFI",
  "BANO",
  "PORTAEQUIPAJE",
  "ENCHUFES",
];

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(1000000000000 + n).slice(1)}`;

export const viajesMock: ViajeSimulado[] = [
  {
    viaje_id: id(101),
    cooperativa_id: COOPERATIVA.granContinental,
    estado: "PUBLICADO",
    tipo_viaje: "DIRECTO",
    hora_salida: "06:00",
    paradas: [QUITO, GYE_DIRECTO],
    bus: bus(
      "018",
      "PAB-1234",
      "Scania",
      "Marcopolo",
      "Ejecutivo",
      2,
      EJECUTIVO_2P,
    ),
    libres: { EJECUTIVO: 12 },
    tarifa_completa: { EJECUTIVO: 2800 },
  },
  {
    viaje_id: id(102),
    cooperativa_id: COOPERATIVA.granContinental,
    estado: "PUBLICADO",
    tipo_viaje: "CON_PARADAS",
    hora_salida: "08:00",
    paradas: RUTA_SIERRA_COSTA,
    bus: bus("025", "PAB-5678", "Volvo", "Irizar", "Confort", 1, CONFORT),
    libres: { NORMAL: 35 },
    tarifa_completa: { NORMAL: 2000 },
  },
  {
    viaje_id: id(103),
    cooperativa_id: COOPERATIVA.expresoSierra,
    estado: "PUBLICADO",
    tipo_viaje: "DIRECTO",
    hora_salida: "10:30",
    paradas: [QUITO, GYE_DIRECTO],
    bus: bus("104", "PCD-2201", "Volvo", "Irizar", "Confort", 1, [
      "AIRE",
      "ASIENTO_RECLINABLE",
      "BANO",
    ]),
    libres: { NORMAL: 18 },
    tarifa_completa: { NORMAL: 2200 },
  },
  {
    viaje_id: id(104),
    cooperativa_id: COOPERATIVA.granContinental,
    estado: "PUBLICADO",
    tipo_viaje: "CON_PARADAS",
    hora_salida: "13:00",
    paradas: RUTA_SIERRA_COSTA,
    bus: bus(
      "032",
      "PAB-9012",
      "Mercedes-Benz",
      "Busscar",
      "Confort",
      1,
      CONFORT,
    ),
    libres: { NORMAL: 22 },
    tarifa_completa: { NORMAL: 2000 },
  },
  {
    viaje_id: id(105),
    cooperativa_id: COOPERATIVA.expresoSierra,
    estado: "PUBLICADO",
    tipo_viaje: "CON_PARADAS",
    hora_salida: "16:00",
    paradas: RUTA_SIERRA_COSTA,
    bus: bus("110", "PCD-4410", "Scania", "Modasa", "Confort", 1, [
      "AIRE",
      "ASIENTO_RECLINABLE",
      "WIFI",
    ]),
    libres: { NORMAL: 5 },
    tarifa_completa: { NORMAL: 2100 },
    cambio_al_seleccionar: "PRECIO",
  },
  {
    viaje_id: id(106),
    cooperativa_id: COOPERATIVA.granContinental,
    estado: "PUBLICADO",
    tipo_viaje: "DIRECTO",
    hora_salida: "19:00",
    paradas: [QUITO, GYE_DIRECTO],
    bus: bus(
      "021",
      "PAB-3344",
      "Scania",
      "Marcopolo",
      "Ejecutivo",
      2,
      EJECUTIVO_2P,
    ),
    libres: { EJECUTIVO: 3 },
    tarifa_completa: { EJECUTIVO: 2900 },
    cambio_al_seleccionar: "AGOTADO",
  },
  {
    viaje_id: id(107),
    cooperativa_id: COOPERATIVA.granContinental,
    estado: "PUBLICADO",
    tipo_viaje: "DIRECTO",
    hora_salida: "22:00",
    paradas: [QUITO, GYE_DIRECTO],
    bus: bus(
      "040",
      "PAB-7788",
      "Hino",
      "Marcopolo",
      "Ejecutivo",
      2,
      EJECUTIVO_2P,
    ),
    libres: { EJECUTIVO: 8, NORMAL: 4 },
    tarifa_completa: { EJECUTIVO: 3000, NORMAL: 2300 },
  },
  // En borrador: buscar_viajes no lo devuelve.
  {
    viaje_id: id(108),
    cooperativa_id: COOPERATIVA.granContinental,
    estado: "BORRADOR",
    tipo_viaje: "DIRECTO",
    hora_salida: "05:00",
    paradas: [QUITO, GYE_DIRECTO],
    bus: bus(
      "050",
      "PAB-0001",
      "Scania",
      "Marcopolo",
      "Ejecutivo",
      2,
      EJECUTIVO_2P,
    ),
    libres: { EJECUTIVO: 40 },
    tarifa_completa: { EJECUTIVO: 1500 },
  },
  // Sentido inverso: para Quito -> Guayaquil el origen queda después del destino y no es vendible.
  {
    viaje_id: id(109),
    cooperativa_id: COOPERATIVA.granContinental,
    estado: "PUBLICADO",
    tipo_viaje: "CON_PARADAS",
    hora_salida: "09:00",
    paradas: [...RUTA_SIERRA_COSTA].reverse().map((parada, i, todas) => ({
      ...parada,
      orden: i + 1,
      minutos: 510 - todas[i].minutos,
    })),
    bus: bus("027", "PAB-2468", "Volvo", "Marcopolo", "Confort", 1, CONFORT),
    libres: { NORMAL: 30 },
    tarifa_completa: { NORMAL: 2000 },
  },
  {
    viaje_id: id(110),
    cooperativa_id: COOPERATIVA.granContinental,
    estado: "PUBLICADO",
    tipo_viaje: "DIRECTO",
    hora_salida: "21:00",
    paradas: [
      QUITO,
      p(2, CIUDAD.cuenca, "Cuenca", "Terminal Terrestre Cuenca", 480),
    ],
    bus: bus(
      "033",
      "PAB-1357",
      "Scania",
      "Marcopolo",
      "Ejecutivo",
      2,
      EJECUTIVO_2P,
    ),
    libres: { EJECUTIVO: 20 },
    tarifa_completa: { EJECUTIVO: 2500 },
  },
];
