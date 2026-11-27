import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PoolClient } from "pg";
import sharp from "sharp";
import type { DatosPago, MarcaCooperativaPago } from "../../../shared/pagos";

export interface DesgloseVipLinea {
  esVip: boolean;
  tarifaNormalCentavos: number;
  recargoVipCentavos: number;
  recargoVipPct: number;
}

export interface MarcaBoleto {
  colorPrimario?: string;
  colorSecundario?: string;
  colorTexto?: string;
  logoBuffer?: Buffer | null;
}

interface DetalleVipMarcaDB {
  tarifaNormalCentavos: number | null;
  asientos: { asiento: string; piso: number; clase: string }[];
  marca: MarcaCooperativaPago & { cooperativa?: string };
}

const MARCA_POR_DEFECTO: MarcaCooperativaPago = {
  colorPrimario: "#CB102E",
  colorSecundario: "#00833E",
  colorTexto: "#1A2A33",
  tieneLogo: false,
};

let cacheLogoFallback: Buffer | null | undefined;

export function calcularDesgloseVipLinea(
  baseCentavos: number,
  clase: string | null | undefined,
  tarifaNormalCentavos: number | null | undefined,
): DesgloseVipLinea {
  const codigo = String(clase ?? "").toUpperCase();
  const esVip = codigo === "VIP" || codigo === "EJECUTIVO";
  if (
    esVip &&
    tarifaNormalCentavos !== null &&
    tarifaNormalCentavos !== undefined &&
    tarifaNormalCentavos > 0 &&
    baseCentavos > tarifaNormalCentavos
  ) {
    const recargoVipCentavos = baseCentavos - tarifaNormalCentavos;
    const recargoVipPct = Math.round(
      (recargoVipCentavos * 100) / tarifaNormalCentavos,
    );
    return {
      esVip: true,
      tarifaNormalCentavos,
      recargoVipCentavos,
      recargoVipPct,
    };
  }
  return {
    esVip,
    tarifaNormalCentavos: baseCentavos,
    recargoVipCentavos: 0,
    recargoVipPct: 0,
  };
}

async function conSavepoint<T>(
  db: PoolClient,
  nombre: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    await db.query(`SAVEPOINT ${nombre}`);
    const res = await fn();
    await db.query(`RELEASE SAVEPOINT ${nombre}`);
    return res;
  } catch {
    await db.query(`ROLLBACK TO SAVEPOINT ${nombre}`).catch(() => {});
    return fallback;
  }
}

export async function obtenerDetalleVipMarca(
  db: PoolClient,
  reservaId: string,
): Promise<DetalleVipMarcaDB | null> {
  return conSavepoint(
    db,
    "sp_detalle_vip_marca",
    async () => {
      const r = await db.query(
        "SELECT transporte.reserva_detalle_vip_marca($1) AS datos",
        [reservaId],
      );
      return (r.rows[0]?.datos as DetalleVipMarcaDB | undefined) ?? null;
    },
    null,
  );
}

export function enriquecerCotizacionConVip<T>(
  cotizacion: T,
  tarifaNormalCentavos: number | null | undefined,
): T {
  if (!cotizacion || typeof cotizacion !== "object") return cotizacion;
  const c = cotizacion as Record<string, unknown>;
  if (!Array.isArray(c.lineas)) return cotizacion;
  let totalNormal = 0;
  let totalRecargo = 0;
  const lineas = c.lineas.map((linea) => {
    if (!linea || typeof linea !== "object") return linea;
    const l = linea as Record<string, unknown>;
    const base = Number(l.base_centavos ?? 0);
    const desglose = calcularDesgloseVipLinea(
      base,
      typeof l.clase === "string" ? l.clase : undefined,
      tarifaNormalCentavos,
    );
    totalNormal += desglose.tarifaNormalCentavos;
    totalRecargo += desglose.recargoVipCentavos;
    return {
      ...l,
      tarifa_normal_centavos: desglose.tarifaNormalCentavos,
      recargo_vip_centavos: desglose.recargoVipCentavos,
      recargo_vip_pct: desglose.recargoVipPct,
    };
  });
  return {
    ...c,
    tarifa_normal_centavos: totalNormal,
    recargo_vip_centavos: totalRecargo,
    lineas,
  } as T;
}

export async function enriquecerDatosPagoConVip(
  db: PoolClient,
  datos: DatosPago,
): Promise<DatosPago> {
  const detalle = await obtenerDetalleVipMarca(db, datos.reserva.id);
  if (!detalle) return datos;

  const clasesPorPisoAsiento = new Map<string, string>();
  const clasesPorAsiento = new Map<string, string>();
  for (const a of detalle.asientos ?? []) {
    clasesPorPisoAsiento.set(`${a.piso}:${a.asiento}`, a.clase);
    clasesPorAsiento.set(a.asiento, a.clase);
  }

  let totalNormal = 0;
  let totalRecargo = 0;
  const pasajeros = datos.pasajeros.map((p) => {
    const clase =
      clasesPorPisoAsiento.get(`${p.piso}:${p.asiento}`) ??
      clasesPorAsiento.get(p.asiento) ??
      p.clase ??
      "NORMAL";
    const desglose = calcularDesgloseVipLinea(
      p.tarifaCentavos,
      clase,
      detalle.tarifaNormalCentavos,
    );
    totalNormal += desglose.tarifaNormalCentavos;
    totalRecargo += desglose.recargoVipCentavos;
    return {
      ...p,
      clase,
      tarifaNormalCentavos: desglose.tarifaNormalCentavos,
      recargoVipCentavos: desglose.recargoVipCentavos,
      recargoVipPct: desglose.recargoVipPct,
    };
  });

  const m = detalle.marca ?? MARCA_POR_DEFECTO;
  return {
    ...datos,
    viaje: {
      ...datos.viaje,
      marca: {
        colorPrimario: m.colorPrimario || MARCA_POR_DEFECTO.colorPrimario,
        colorSecundario: m.colorSecundario || MARCA_POR_DEFECTO.colorSecundario,
        colorTexto: m.colorTexto || MARCA_POR_DEFECTO.colorTexto,
        tieneLogo: Boolean(m.tieneLogo),
      },
    },
    cotizacion: datos.cotizacion
      ? {
          ...datos.cotizacion,
          tarifa_normal_centavos: totalNormal,
          recargo_vip_centavos: totalRecargo,
        }
      : null,
    pasajeros,
  };
}

export async function normalizarLogoParaBoleto(
  raw: Buffer | null | undefined,
): Promise<Buffer | null> {
  if (!raw || raw.length === 0) return null;
  try {
    return await sharp(raw)
      .resize({ width: 320, height: 140, fit: "inside", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch {
    return null;
  }
}

export async function cargarLogoGranContinentalFallback(): Promise<Buffer | null> {
  if (cacheLogoFallback !== undefined) return cacheLogoFallback;
  try {
    // backend/assets funciona en desarrollo (src) y en la imagen Docker compilada (dist); el frontend es respaldo local.
    const candidatos = [
      resolve(__dirname, "../../assets/logo-gran-continental.png"),
      resolve(__dirname, "../../../../assets/logo-gran-continental.png"),
      resolve(__dirname, "../../../frontend/public/images/Logo G-C.png"),
    ];
    let raw: Buffer | null = null;
    for (const ruta of candidatos) {
      try { raw = await readFile(ruta); break; } catch { /* siguiente candidato */ }
    }
    if (!raw) throw new Error("Logo no disponible");
    cacheLogoFallback = await normalizarLogoParaBoleto(raw);
  } catch {
    cacheLogoFallback = null;
  }
  return cacheLogoFallback;
}

export async function obtenerMarcaBoleto(
  db: PoolClient,
  datos: DatosPago,
): Promise<MarcaBoleto> {
  const m = datos.viaje.marca ?? MARCA_POR_DEFECTO;
  const logoRaw = await conSavepoint(
    db,
    "sp_logo_coop_reserva",
    async () => {
      const r = await db.query(
        "SELECT transporte.logo_cooperativa_reserva($1) AS contenido",
        [datos.reserva.id],
      );
      const val = r.rows[0]?.contenido;
      return Buffer.isBuffer(val) ? val : null;
    },
    null as Buffer | null,
  );

  let logoBuffer = await normalizarLogoParaBoleto(logoRaw);
  if (!logoBuffer && /gran continental/i.test(datos.viaje.cooperativa ?? "")) {
    logoBuffer = await cargarLogoGranContinentalFallback();
  }

  return {
    colorPrimario: m.colorPrimario || MARCA_POR_DEFECTO.colorPrimario,
    colorSecundario: m.colorSecundario || MARCA_POR_DEFECTO.colorSecundario,
    colorTexto: m.colorTexto || MARCA_POR_DEFECTO.colorTexto,
    logoBuffer,
  };
}
