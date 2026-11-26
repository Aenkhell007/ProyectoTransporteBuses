import sharp from "sharp";
import type { PoolClient } from "pg";

export interface MarcaBoleto {
  colorPrimario?: string | null;
  colorSecundario?: string | null;
  logo?: Buffer | null;
}

type Colores = Pick<MarcaBoleto, "colorPrimario" | "colorSecundario">;

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

async function normalizarLogo(contenido: unknown): Promise<Buffer | null> {
  if (!Buffer.isBuffer(contenido) || !contenido.length || contenido.length > MAX_LOGO_BYTES) {
    return null;
  }
  try {
    const imagen = sharp(contenido, { limitInputPixels: 8192 * 8192 });
    const meta = await imagen.metadata();
    if (!meta.format || !["png", "jpeg", "webp"].includes(meta.format) || (meta.pages ?? 1) !== 1) {
      return null;
    }
    return await imagen.rotate().resize(360, 144, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  } catch {
    return null;
  }
}

export async function leerMarcaBoleto(db: PoolClient, reservaId: string): Promise<MarcaBoleto> {
  const { nueva, anterior } = (await db.query(
    "SELECT to_regprocedure('transporte.marca_boleto_reserva(uuid)') IS NOT NULL AS nueva, " +
    "(to_regprocedure('transporte.reserva_detalle_vip_marca(uuid)') IS NOT NULL " +
    "AND to_regprocedure('transporte.logo_cooperativa_reserva(uuid)') IS NOT NULL) AS anterior",
  )).rows[0];

  if (nueva) {
    const result = (await db.query<Colores & { logo: Buffer | null }>(
      'SELECT color_primario AS "colorPrimario", color_secundario AS "colorSecundario", logo ' +
      'FROM transporte.marca_boleto_reserva($1)',
      [reservaId],
    )).rows[0];
    if (!result) return {};
    return { ...result, logo: await normalizarLogo(result.logo) };
  }

  if (anterior) {
    const result = (await db.query<{ colores: Colores | null; logo: Buffer | null }>(
      "SELECT transporte.reserva_detalle_vip_marca($1)->'marca' AS colores, " +
      "transporte.logo_cooperativa_reserva($1) AS logo",
      [reservaId],
    )).rows[0];
    return { ...result?.colores, logo: await normalizarLogo(result?.logo) };
  }

  return {};
}
