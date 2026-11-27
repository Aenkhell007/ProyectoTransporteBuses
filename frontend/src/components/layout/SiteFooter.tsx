import './site-shell.css';

export const APP_VERSION =
  (import.meta.env?.VITE_APP_VERSION as string | undefined)?.trim() || 'v2.0.0';

export interface SiteFooterProps {
  brandName?: string;
  year?: number;
  version?: string;
  variant?: "public" | "admin";
}

/** Pie compartido por páginas de cliente y paneles internos. */
export function SiteFooter({
  brandName = 'Gran Continental',
  year = new Date().getFullYear(),
  version = APP_VERSION,
  variant = 'public',
}: SiteFooterProps) {
  return <footer className={variant === 'admin' ? 'gc-footer gc-footer--admin' : 'gc-footer'}>
    <p>© {year} {brandName}. Todos los derechos reservados. · {version}</p>
  </footer>;
}
