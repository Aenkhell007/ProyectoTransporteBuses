import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import type { SiteHeaderProps } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import type { SiteFooterProps } from './SiteFooter';
import './site-shell.css';

export interface PublicLayoutProps {
  children: ReactNode;
  header?: SiteHeaderProps;
  footer?: SiteFooterProps;
}

/** Envolver una sola vez el contenido público/cliente. No usar dentro de un main existente. */
export function PublicLayout({ children, header, footer }: PublicLayoutProps) {
  return <div className="gc-shell gc-shell--public">
    <a className="gc-skip-link" href="#gc-main-content">Saltar al contenido</a>
    <SiteHeader {...header} />
    <main className="gc-main" id="gc-main-content" tabIndex={-1}>{children}</main>
    <SiteFooter {...footer} />
  </div>;
}
