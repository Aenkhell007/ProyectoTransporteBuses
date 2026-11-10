import './site-shell.css';

export interface SiteFooterProps {
  brandName?: string;
  year?: number;
  variant?: "public" | "admin";
}

/** Pie compartido por páginas de cliente y paneles internos. */
export function SiteFooter({ brandName = 'Gran Continental', year = new Date().getFullYear(), variant = 'public' }: SiteFooterProps) {
  return <footer className={variant === 'admin' ? 'gc-footer gc-footer--admin' : 'gc-footer'}>
    <p>© {year} {brandName}. Todos los derechos reservados.</p>
  </footer>;
}
