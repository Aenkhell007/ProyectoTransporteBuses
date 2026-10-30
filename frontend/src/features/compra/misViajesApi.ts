import type { ListaPaginada } from "../../types/compra/api";
import type {
  EstadoMiViaje,
  FiltrosMisViajes,
  MiViaje,
  SeccionMisViajes,
} from "../../types/compra/misViajes";
import { misViajesMock, sesionSimulada } from "../../mocks/compra/misViajes";
import { ErrorCompra } from "./errores";
import { diaEnEcuador, esFechaValida } from "./fechas";
import { copiar, esperar } from "./simulacion";

// Servicio simulado de GET /mis-viajes. Imita v_mis_viajes: filtra por el cliente de la
// sesión (nunca por un correo o cédula escritos), PROXIMOS = compra CONFIRMADA con salida
// futura, el resto es HISTORIAL. Las reservas con pago en verificación se suman aparte
// (decisión 8 de docs/api/compra-endpoints.md).

/** v_mis_viajes no pagina; aquí se usa una página pequeña para poder probar el cursor. */
export const TAMANO_PAGINA_MIS_VIAJES = 3;

export const ESTADOS_POR_SECCION: Record<
  SeccionMisViajes,
  { valor: EstadoMiViaje; nombre: string }[]
> = {
  proximos: [
    { valor: "CONFIRMADA", nombre: "Confirmada" },
    { valor: "PAGO_EN_VERIFICACION", nombre: "Pago en verificación" },
  ],
  historial: [
    { valor: "FINALIZADO", nombre: "Finalizado" },
    { valor: "CANCELADA", nombre: "Cancelado" },
    { valor: "REEMBOLSADA", nombre: "Reembolsado" },
  ],
};

export function filtrosMisViajesDesdeUrl(
  params: URLSearchParams,
): FiltrosMisViajes {
  const seccion: SeccionMisViajes =
    params.get("seccion") === "historial" ? "historial" : "proximos";
  const estado = params.get("estado");
  const fecha = (clave: string) => {
    const valor = params.get(clave) ?? "";
    return seccion === "historial" && esFechaValida(valor) ? valor : "";
  };
  return {
    seccion,
    estado: ESTADOS_POR_SECCION[seccion].some((e) => e.valor === estado)
      ? (estado as EstadoMiViaje)
      : "",
    q: (params.get("q") ?? "").slice(0, 60),
    desde: fecha("desde"),
    hasta: fecha("hasta"),
  };
}

export function filtrosMisViajesAUrl(f: FiltrosMisViajes): URLSearchParams {
  const params = new URLSearchParams({ seccion: f.seccion });
  if (f.estado) params.set("estado", f.estado);
  if (f.q.trim()) params.set("q", f.q.trim());
  if (f.seccion === "historial" && f.desde) params.set("desde", f.desde);
  if (f.seccion === "historial" && f.hasta) params.set("hasta", f.hasta);
  return params;
}

export function validarFiltrosMisViajes(f: FiltrosMisViajes): string | null {
  if (f.desde && f.hasta && f.desde > f.hasta)
    return "La fecha «Desde» no puede ser posterior a «Hasta».";
  return null;
}

const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function propios(): MiViaje[] {
  if (!sesionSimulada.cliente_id) {
    throw new ErrorCompra(401, {
      codigo: "SESION_REQUERIDA",
      mensaje: "Inicie sesión",
    });
  }
  const ahora = Date.now();
  return misViajesMock
    .filter((m) => m.cliente_id === sesionSimulada.cliente_id)
    .map((m) => {
      const futura = new Date(m.viaje.salida).getTime() > ahora;
      const estado: EstadoMiViaje =
        m.estado_base === "CONFIRMADA" && !futura
          ? "FINALIZADO"
          : m.estado_base;
      return { ...m.viaje, estado };
    });
}

function seccionDe(v: MiViaje): SeccionMisViajes {
  const futura = new Date(v.salida).getTime() > Date.now();
  return futura &&
    (v.estado === "CONFIRMADA" || v.estado === "PAGO_EN_VERIFICACION")
    ? "proximos"
    : "historial";
}

export async function listarMisViajes(
  filtros: FiltrosMisViajes,
  cursor: string | null,
): Promise<ListaPaginada<MiViaje>> {
  await esperar(450);
  const q = normalizar(filtros.q);
  const lista = propios()
    .filter((v) => seccionDe(v) === filtros.seccion)
    .filter((v) => !filtros.estado || v.estado === filtros.estado)
    .filter(
      (v) =>
        !q ||
        normalizar(v.codigo).includes(q) ||
        normalizar(v.destino.ciudad).includes(q),
    )
    .filter((v) => !filtros.desde || diaEnEcuador(v.salida) >= filtros.desde)
    .filter((v) => !filtros.hasta || diaEnEcuador(v.salida) <= filtros.hasta)
    // Orden estable: próximos del más cercano al más lejano; historial del más reciente al más antiguo.
    .sort((a, b) => {
      const orden =
        a.salida.localeCompare(b.salida) ||
        a.reserva_id.localeCompare(b.reserva_id);
      return filtros.seccion === "proximos" ? orden : -orden;
    });
  const inicio = cursor ? Number(cursor) : 0;
  const siguiente = inicio + TAMANO_PAGINA_MIS_VIAJES;
  return {
    data: copiar(lista.slice(inicio, siguiente)),
    next_cursor: siguiente < lista.length ? String(siguiente) : null,
  };
}

/** Detalle por código o ID. Una compra de otro cliente responde 404, no 403. */
export async function obtenerMiViaje(identificador: string): Promise<MiViaje> {
  await esperar(300);
  const viaje = propios().find(
    (v) =>
      v.codigo === identificador ||
      v.compra_id === identificador ||
      v.reserva_id === identificador,
  );
  if (!viaje)
    throw new ErrorCompra(404, {
      codigo: "NO_ENCONTRADO",
      mensaje: "Compra no encontrada",
    });
  return copiar(viaje);
}
