const ORIGEN_POR_DEFECTO = "http://127.0.0.1:5173";
const PATRON_TUNEL_CLOUDFLARE = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i;

function limpiarOrigen(valor: string | undefined): string | null {
  if (!valor) return null;
  const limpio = valor.trim().replace(/\/+$/, "");
  return limpio || null;
}

export function esProduccion(): boolean {
  return process.env.NODE_ENV === "production";
}

export function origenesBasePermitidos(): Set<string> {
  const frente = limpiarOrigen(process.env.FRONTEND_URL) ?? ORIGEN_POR_DEFECTO;
  const extras = [process.env.EXTRA_ORIGINS, process.env.FRONTEND_ORIGINS]
    .flatMap((v) => (v ?? "").split(","))
    .map(limpiarOrigen)
    .filter((v): v is string => Boolean(v));
  return new Set([
    frente,
    ORIGEN_POR_DEFECTO,
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    ...extras,
  ]);
}

/**
 * Valida que el header Origin corresponda al frontend configurado (o a un túnel
 * temporal *.trycloudflare.com únicamente fuera de producción).
 */
export function origenPermitido(origin: string | undefined): boolean {
  const normalizado = limpiarOrigen(origin);
  if (!normalizado) return false;
  if (origenesBasePermitidos().has(normalizado)) return true;
  if (!esProduccion() && PATRON_TUNEL_CLOUDFLARE.test(normalizado)) return true;
  return false;
}

export function ancestrosFramePermitidos(): string {
  const ancestros = new Set<string>([
    "'self'",
    ...origenesBasePermitidos(),
  ]);
  if (!esProduccion()) {
    ancestros.add("https://*.trycloudflare.com");
  }
  return [...ancestros].join(" ");
}
