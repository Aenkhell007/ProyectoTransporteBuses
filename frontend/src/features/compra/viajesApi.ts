import type { ListaPaginada } from "../../types/compra/api";
import type {
  ClaseAsientoCodigo,
  Cooperativa,
  DetalleViaje,
  ViajeResultado,
} from "../../types/compra/viajes";
import type { ReservaPendiente } from "../../types/compra/reserva";
import { cooperativasMock, viajesMock } from "../../mocks/compra/viajes";
import type { ParadaSimulada, ViajeSimulado } from "../../mocks/compra/viajes";
import type { CriteriosBusqueda } from "./busqueda";
import { ErrorCompra } from "./errores";
import { hoyEnEcuador } from "./fechas";
import { FRANJAS } from "./filtrosViajes";
import type { FiltrosViajes } from "./filtrosViajes";
import { copiar, esperar } from "./simulacion";

// Servicio simulado de GET /viajes y GET /viajes/:id. Imita las reglas de buscar_viajes():
// solo viajes PUBLICADO con salida futura, origen antes que destino, viajes directos solo de
// la primera a la última parada, plazas suficientes en el tramo y tarifa vigente.
// La hora, el precio y el orden se filtran aquí porque buscar_viajes aún no los admite
// (decisión 6 de docs/api/compra-endpoints.md).

/** buscar_viajes devuelve 50; aquí se usa una página pequeña para poder probar la paginación. */
export const TAMANO_PAGINA_SIMULADA = 4;

// Viajes que ya cambiaron "en el servidor" después de que el cliente los vio.
const cambiados = new Set<string>();

// En la base, viaje_id ya identifica la fecha de salida; los viajes simulados no la tienen.
// Se recuerda la fecha con la que el cliente eligió el viaje para crear la reserva simulada.
const CLAVE_FECHAS = "gc.compra.fechas-viaje";

function fechasElegidas(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_FECHAS) ?? "{}");
  } catch {
    return {};
  }
}

function recordarFecha(viajeId: string, fecha: string) {
  try {
    sessionStorage.setItem(
      CLAVE_FECHAS,
      JSON.stringify({ ...fechasElegidas(), [viajeId]: fecha }),
    );
  } catch {
    // Sin almacenamiento, la reserva usa la salida de mañana.
  }
}

function salidaBase(fecha: string, hora: string) {
  return new Date(`${fecha}T${hora}:00-05:00`).getTime();
}

function iso(ms: number) {
  // Ecuador no tiene horario de verano: el desfase es siempre -05:00.
  return new Date(ms - 5 * 3600000).toISOString().slice(0, 19) + "-05:00";
}

function tarifaTramo(
  v: ViajeSimulado,
  clase: ClaseAsientoCodigo,
  o: number,
  d: number,
) {
  const completa = v.tarifa_completa[clase];
  if (completa === undefined) return null;
  const total = v.paradas[v.paradas.length - 1].minutos;
  const desde = v.paradas.find((x) => x.orden === o)!.minutos;
  const hasta = v.paradas.find((x) => x.orden === d)!.minutos;
  const precio = Math.round((completa * (hasta - desde)) / total / 25) * 25;
  return v.cambio_al_seleccionar === "PRECIO" && cambiados.has(v.viaje_id)
    ? precio + 200
    : precio;
}

function aResultado(
  v: ViajeSimulado,
  fecha: string,
  o: number,
  d: number,
  clase: ClaseAsientoCodigo | "",
): ViajeResultado | null {
  const origen = v.paradas.find((x) => x.orden === o)!;
  const destino = v.paradas.find((x) => x.orden === d)!;
  const clases = (
    Object.keys(v.tarifa_completa) as ClaseAsientoCodigo[]
  ).filter((c) => !clase || c === clase);
  const agotado =
    v.cambio_al_seleccionar === "AGOTADO" && cambiados.has(v.viaje_id);
  const plazas = agotado
    ? 0
    : clases.reduce((suma, c) => suma + (v.libres[c] ?? 0), 0);
  const precios = clases
    .map((c) => tarifaTramo(v, c, o, d))
    .filter((x): x is number => x !== null);
  if (precios.length === 0) return null;
  const base = salidaBase(fecha, v.hora_salida);
  return {
    viaje_id: v.viaje_id,
    cooperativa: cooperativasMock.find((c) => c.id === v.cooperativa_id)!
      .nombre,
    salida: iso(base + origen.minutos * 60000),
    llegada: iso(base + destino.minutos * 60000),
    origen_orden: o,
    destino_orden: d,
    tipo_viaje: v.tipo_viaje,
    clases,
    origen: { orden: o, ciudad: origen.ciudad, terminal: origen.terminal },
    destino: { orden: d, ciudad: destino.ciudad, terminal: destino.terminal },
    bus: v.bus,
    plazas_disponibles: plazas,
    tarifa_desde_centavos: Math.min(...precios),
  };
}

function vendibles(
  criterios: CriteriosBusqueda,
  filtros: FiltrosViajes,
): ViajeResultado[] {
  const ahora = Date.now();
  const resultados: ViajeResultado[] = [];
  for (const v of viajesMock) {
    if (v.estado !== "PUBLICADO") continue;
    const o = v.paradas.find((x) => x.ciudad_id === criterios.origen)?.orden;
    const d = v.paradas.find((x) => x.ciudad_id === criterios.destino)?.orden;
    if (o === undefined || d === undefined || o >= d) continue;
    const ultima = v.paradas[v.paradas.length - 1].orden;
    if (v.tipo_viaje === "DIRECTO" && (o !== 1 || d !== ultima)) continue;
    if (filtros.cooperativa && v.cooperativa_id !== filtros.cooperativa)
      continue;
    if (filtros.tipo_viaje && v.tipo_viaje !== filtros.tipo_viaje) continue;
    if (
      filtros.chasis &&
      !v.bus.chasis.toLowerCase().includes(filtros.chasis.toLowerCase())
    )
      continue;
    if (
      filtros.carroceria &&
      !v.bus.carroceria.toLowerCase().includes(filtros.carroceria.toLowerCase())
    )
      continue;
    const r = aResultado(v, criterios.fecha, o, d, filtros.clase);
    if (!r || new Date(r.salida).getTime() <= ahora) continue;
    if (r.plazas_disponibles < criterios.cantidad) continue;
    resultados.push(r);
  }
  return resultados;
}

function horaLocal(salida: string) {
  return Number(salida.slice(11, 13));
}

export async function buscarViajes(
  criterios: CriteriosBusqueda,
  filtros: FiltrosViajes,
  cursor: string | null,
): Promise<ListaPaginada<ViajeResultado>> {
  await esperar(500);
  if (criterios.origen === criterios.destino) {
    throw new ErrorCompra(422, {
      codigo: "DATOS_INVALIDOS",
      mensaje: "El destino debe ser distinto del origen.",
      errores_campo: [
        {
          campo: "destino_ciudad_id",
          mensaje: "Debe ser distinto del origen.",
        },
      ],
    });
  }
  const franja = FRANJAS.find((f) => f.valor === filtros.hora);
  const lista = vendibles(criterios, filtros)
    .filter(
      (r) =>
        !franja ||
        (horaLocal(r.salida) >= franja.desde &&
          horaLocal(r.salida) < franja.hasta),
    )
    .filter(
      (r) =>
        filtros.precio_min === null ||
        r.tarifa_desde_centavos >= filtros.precio_min,
    )
    .filter(
      (r) =>
        filtros.precio_max === null ||
        r.tarifa_desde_centavos <= filtros.precio_max,
    )
    .sort((a, b) =>
      filtros.orden === "precio"
        ? a.tarifa_desde_centavos - b.tarifa_desde_centavos ||
          a.salida.localeCompare(b.salida) ||
          a.viaje_id.localeCompare(b.viaje_id)
        : a.salida.localeCompare(b.salida) ||
          a.viaje_id.localeCompare(b.viaje_id),
    );
  const inicio = cursor ? Number(cursor) : 0;
  const pagina = lista.slice(inicio, inicio + TAMANO_PAGINA_SIMULADA);
  const siguiente = inicio + TAMANO_PAGINA_SIMULADA;
  return {
    data: copiar(pagina),
    next_cursor: siguiente < lista.length ? String(siguiente) : null,
  };
}

/** GET /viajes/:id con el tramo: datos actuales del viaje y del bus. */
export async function obtenerDetalleViaje(
  viajeId: string,
  fecha: string,
  origenOrden: number,
  destinoOrden: number,
  clase: ClaseAsientoCodigo | "",
): Promise<DetalleViaje> {
  await esperar(400);
  const v = viajesMock.find(
    (x) => x.viaje_id === viajeId && x.estado === "PUBLICADO",
  );
  const r = v && aResultado(v, fecha, origenOrden, destinoOrden, clase);
  if (!v || !r)
    throw new ErrorCompra(404, {
      codigo: "VIAJE_NO_ENCONTRADO",
      mensaje: "Viaje no disponible",
    });
  const base = salidaBase(fecha, v.hora_salida);
  return copiar({
    viaje_id: v.viaje_id,
    tipo_viaje: v.tipo_viaje,
    salida: r.salida,
    llegada: r.llegada,
    bus: v.bus,
    paradas: v.paradas.map((x) => ({
      orden: x.orden,
      ciudad: x.ciudad,
      terminal: x.terminal,
      hora: iso(base + x.minutos * 60000),
    })),
    plazas_disponibles: r.plazas_disponibles,
    tarifa_desde_centavos: r.tarifa_desde_centavos,
  });
}

/**
 * Vuelve a consultar el viaje antes de pasar a los asientos. En la simulación, los viajes
 * marcados cambian en este momento, como si otro cliente hubiera comprado o la tarifa cambiara.
 */
export async function verificarViaje(
  viaje: ViajeResultado,
  fecha: string,
  clase: ClaseAsientoCodigo | "",
): Promise<DetalleViaje> {
  const simulado = viajesMock.find((x) => x.viaje_id === viaje.viaje_id);
  if (simulado?.cambio_al_seleccionar) cambiados.add(simulado.viaje_id);
  recordarFecha(viaje.viaje_id, fecha);
  return obtenerDetalleViaje(
    viaje.viaje_id,
    fecha,
    viaje.origen_orden,
    viaje.destino_orden,
    clase,
  );
}

/** Datos del viaje y del tramo que la reserva simulada copia, como hace reservar_asientos(). */
export interface ViajeReservable {
  viaje: ReservaPendiente["viaje"];
  bus: ReservaPendiente["bus"];
  /** Tarifa vigente del tramo por clase de asiento, en centavos. */
  tarifas: Partial<Record<ClaseAsientoCodigo, number>>;
}

/** Valida el viaje y el tramo igual que reservar_asientos(): publicado, tramo válido y directo completo. */
export function viajeParaReserva(
  viajeId: string,
  origenOrden: number,
  destinoOrden: number,
): ViajeReservable {
  const v = viajesMock.find(
    (x) => x.viaje_id === viajeId && x.estado === "PUBLICADO",
  );
  if (!v)
    throw new ErrorCompra(409, {
      codigo: "VIAJE_NO_VENDIBLE",
      mensaje: "El viaje ya no está a la venta.",
    });
  const origen = v.paradas.find((x) => x.orden === origenOrden);
  const destino = v.paradas.find((x) => x.orden === destinoOrden);
  const directoIncompleto =
    v.tipo_viaje === "DIRECTO" &&
    (origenOrden !== v.paradas[0].orden ||
      destinoOrden !== v.paradas[v.paradas.length - 1].orden);
  if (!origen || !destino || origen.orden >= destino.orden || directoIncompleto)
    throw new ErrorCompra(422, {
      codigo: "TRAMO_NO_VALIDO",
      mensaje: "Tramo no válido.",
      errores_campo: [{ campo: "destino_orden", mensaje: "Tramo no valido" }],
    });
  const manana = new Date(Date.now() + 86400000);
  const fecha = fechasElegidas()[viajeId] ?? hoyEnEcuador(manana);
  const base = salidaBase(fecha, v.hora_salida);
  const tarifas: ViajeReservable["tarifas"] = {};
  for (const clase of Object.keys(v.tarifa_completa) as ClaseAsientoCodigo[]) {
    const tarifa = tarifaTramo(v, clase, origen.orden, destino.orden);
    if (tarifa !== null) tarifas[clase] = tarifa;
  }
  const parada = (x: ParadaSimulada) => ({
    orden: x.orden,
    ciudad: x.ciudad,
    terminal: x.terminal,
    ciudad_id: x.ciudad_id,
  });
  return copiar({
    viaje: {
      viaje_id: v.viaje_id,
      cooperativa: cooperativasMock.find((c) => c.id === v.cooperativa_id)!
        .nombre,
      salida: iso(base + origen.minutos * 60000),
      llegada: iso(base + destino.minutos * 60000),
      origen: parada(origen),
      destino: parada(destino),
    },
    bus: { ...v.bus, carroceria_modelo: null },
    tarifas,
  });
}

export async function obtenerOpcionesFiltro(): Promise<{
  cooperativas: Cooperativa[];
  chasis: string[];
  carrocerias: string[];
}> {
  await esperar(200);
  const unicos = (valores: string[]) =>
    [...new Set(valores)].sort((a, b) => a.localeCompare(b));
  return {
    cooperativas: copiar(cooperativasMock),
    chasis: unicos(viajesMock.map((v) => v.bus.chasis)),
    carrocerias: unicos(viajesMock.map((v) => v.bus.carroceria)),
  };
}
