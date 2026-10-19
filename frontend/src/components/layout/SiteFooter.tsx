import './site-shell.css';

export interface SiteFooterProps {
  brandName?: string;
  year?: number;
}

/** Pie compartido por páginas de cliente y paneles internos. */
export function SiteFooter({ brandName = 'Gran Continental', year = new Date().getFullYear() }: SiteFooterProps) {
  return <footer className="gc-footer">
    <p>© {year} {brandName}. Todos los derechos reservados.</p>
  </footer>;
}
