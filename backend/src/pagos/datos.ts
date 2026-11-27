import type {PoolClient} from 'pg';
import type { DatosPago } from "../../../shared/pagos";
import { consultarLote } from "../lecturas";

// Una compra conserva la identidad del servicio vendido aunque después se edite el catálogo.
export function conservarDatosCompra(datos: DatosPago): DatosPago {
  const s = datos.compra?.viajeSnapshot;
  if (!s) return datos;
  const objeto = (v: unknown) =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const texto = (v: unknown, anterior: string) =>
    typeof v === "string" ? v : anterior;
  const bus = objeto(s.bus),
    coop = objeto(s.cooperativa),
    origen = objeto(s.terminalOrigen),
    destino = objeto(s.terminalDestino),
    v = datos.viaje;
  return {
    ...datos,
    viaje: {
      ...v,
      cooperativa: texto(coop.nombre, v.cooperativa),
      origen: texto(origen.ciudad, v.origen),
      destino: texto(destino.ciudad, v.destino),
      terminalOrigen: texto(origen.terminal, v.terminalOrigen),
      terminalDestino: texto(destino.terminal, v.terminalDestino),
      unidad: texto(bus.unidad, v.unidad),
      placa: texto(bus.placa, v.placa),
      chasis: texto(bus.chasis, v.chasis),
      carroceria: texto(bus.carroceria, v.carroceria),
      servicio: texto(bus.grupo, v.servicio),
    },
  };
}

export function aplicarEstadoReembolsos(
  datos: DatosPago,
  filas: { estado: string; codigo: string; piso: number }[],
  totales: { pendiente?: string | number; ejecutado?: string | number } | undefined,
): DatosPago {
  if (!datos.compra) return datos;
  const cancelados = filas
    .filter((f) => f.estado === "LIBERADO")
    .map((f) => f.piso + ":" + f.codigo);
  return {
    ...datos,
    pasajeros:
      datos.compra.estado === "CONFIRMADA"
        ? datos.pasajeros.filter(
            (p) => !cancelados.includes(p.piso + ":" + p.asiento),
          )
        : datos.pasajeros,
    reembolsos: {
      cancelados,
      enTramiteCentavos: Number(totales?.pendiente ?? 0),
      ejecutadoCentavos: Number(totales?.ejecutado ?? 0),
    },
  };
}

export async function conEstadoReembolsos(
  db: PoolClient,
  datos: DatosPago,
): Promise<DatosPago> {
  if (!datos.compra) return datos;
  const [asientosRes, totalesRes] = await consultarLote(db, [
    {
      sql: "SELECT transporte.asientos_reembolso($1) AS datos",
      valores: [datos.reserva.id],
    },
    {
      sql: "SELECT coalesce(sum(monto_centavos) FILTER (WHERE estado IN('SOLICITADO','APROBADO')),0) AS pendiente, coalesce(sum(monto_centavos) FILTER (WHERE estado='EJECUTADO'),0) AS ejecutado FROM transporte.solicitudes_reembolso WHERE compra_id=$1",
      valores: [datos.compra.id],
    },
  ]);
  const filas = (asientosRes[0]?.datos ?? []) as {
    estado: string;
    codigo: string;
    piso: number;
  }[];
  return aplicarEstadoReembolsos(
    datos,
    filas,
    totalesRes[0] as { pendiente?: string | number; ejecutado?: string | number } | undefined,
  );
}

export async function conEstadoReembolsosLote(
  db: PoolClient,
  lista: DatosPago[],
): Promise<DatosPago[]> {
  const conCompra = lista.filter((d) => Boolean(d.compra));
  if (!conCompra.length) return lista;
  const reservaIds = conCompra.map((d) => d.reserva.id);
  const compraIds = conCompra.map((d) => d.compra!.id);
  const [asientosRows, totalesRows] = await consultarLote(db, [
    {
      sql: "SELECT r_id AS reserva_id, transporte.asientos_reembolso(r_id) AS datos FROM unnest($1::uuid[]) AS r_id",
      valores: [reservaIds],
    },
    {
      sql: "SELECT compra_id, coalesce(sum(monto_centavos) FILTER (WHERE estado IN('SOLICITADO','APROBADO')),0) AS pendiente, coalesce(sum(monto_centavos) FILTER (WHERE estado='EJECUTADO'),0) AS ejecutado FROM transporte.solicitudes_reembolso WHERE compra_id = ANY($1::uuid[]) GROUP BY compra_id",
      valores: [compraIds],
    },
  ]);
  const asientosPorReserva = new Map<
    string,
    { estado: string; codigo: string; piso: number }[]
  >();
  for (const row of asientosRows) {
    asientosPorReserva.set(
      String(row.reserva_id),
      (row.datos ?? []) as { estado: string; codigo: string; piso: number }[],
    );
  }
  const totalesPorCompra = new Map<
    string,
    { pendiente?: string | number; ejecutado?: string | number }
  >();
  for (const row of totalesRows) {
    totalesPorCompra.set(String(row.compra_id), {
      pendiente: row.pendiente,
      ejecutado: row.ejecutado,
    });
  }
  return lista.map((d) =>
    d.compra
      ? aplicarEstadoReembolsos(
          d,
          asientosPorReserva.get(d.reserva.id) ?? [],
          totalesPorCompra.get(d.compra.id),
        )
      : d,
  );
}
