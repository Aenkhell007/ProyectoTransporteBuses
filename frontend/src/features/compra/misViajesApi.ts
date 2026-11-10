import type { ListaPaginada } from "../../types/compra/api";
import type {
  EstadoMiViaje,
  FiltrosMisViajes,
  MiViaje,
  SeccionMisViajes,
} from "../../types/compra/misViajes";
import { apiCompra } from "./cliente";

import { esFechaValida } from "./fechas";


export const ESTADOS_POR_SECCION: Record<
  SeccionMisViajes,
  { valor: EstadoMiViaje; nombre: string }[]
> = {
  proximos: [
    { valor: "CONFIRMADA", nombre: "Confirmada" },
    { valor: "PAGO_EN_VERIFICACION", nombre: "Pago en verificación" },
    { valor: "PENDIENTE_PAGO", nombre: "Pendiente de pago" },
    { valor: "RECHAZADA", nombre: "Comprobante rechazado" },
  ],
  historial: [
    { valor: "FINALIZADO", nombre: "Finalizado" },
    { valor: "VENCIDA", nombre: "Reserva vencida" },
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

export async function listarMisViajes(
  filtros: FiltrosMisViajes,
  cursor: string | null,
): Promise<ListaPaginada<MiViaje>> {
  const p = filtrosMisViajesAUrl(filtros);
  if (cursor) p.set("cursor", cursor);
  return apiCompra(`/mis-viajes?${p}`);
}

export async function obtenerMiViaje(identificador: string): Promise<MiViaje> {
  return apiCompra(`/mis-viajes/${encodeURIComponent(identificador)}`);
}
