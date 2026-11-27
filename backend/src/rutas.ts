import { Router, type Request, type Response } from "express";
import { pool } from "./database";

/** Imágenes públicas verificadas (logo de cooperativa y fotos de flota) con caché HTTP y ETag. */
export const publicoRouter = Router();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);

async function enviarImagen(req: Request, res: Response, sql: string) {
  const id = String(req.params.id ?? "");
  if (!UUID.test(id)) {
    res.status(404).json({ error: "Imagen no disponible." });
    return;
  }
  try {
    const fila = (await pool.query(sql, [id])).rows[0] as { mime: string; contenido: Buffer; sha256: string } | undefined;
    if (!fila?.contenido || !MIMES.has(fila.mime)) {
      res.status(404).json({ error: "Imagen no disponible." });
      return;
    }
    const etag = `"${fila.sha256}"`;
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }
    res.type(fila.mime).send(fila.contenido);
  } catch {
    res.status(503).json({ error: "No se pudo cargar la imagen." });
  }
}

publicoRouter.get("/cooperativas/:id/logo", (req, res) =>
  enviarImagen(req, res, "SELECT mime,contenido,sha256 FROM transporte.logo_publico_cooperativa($1::uuid)"),
);
publicoRouter.get("/imagenes/:id", (req, res) =>
  enviarImagen(req, res, "SELECT mime,contenido,sha256 FROM transporte.imagen_publica_flota($1::uuid)"),
);
