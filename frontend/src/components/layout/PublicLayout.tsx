import { Suspense, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { CargaSeccion } from '../ui/CargaSeccion';
import type { ReactNode } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { Icono } from '../compra/Icono';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pathname, hash } = useLocation();
  const { usuario } = useAuth();
  const mostrarBarraMovil = pathname === '/' || pathname === '/mis-viajes' || pathname === '/mi-cuenta';

  useEffect(() => {
    if (hash) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return <div className={`gc-shell gc-shell--public gc-shell--fixed gc-print-unclip${mostrarBarraMovil ? ' gc-shell--with-tabbar' : ''}`}>
    <a className="gc-skip-link" href="#gc-main-content">Saltar al contenido</a>
    <SiteHeader {...header} />
    <div ref={scrollRef} id="gc-public-scroll" className="gc-public-scroll gc-print-unclip">
      <main className="gc-main" id="gc-main-content" tabIndex={-1}><Suspense fallback={<CargaSeccion />}>{children}</Suspense></main>
      <SiteFooter {...footer} />
    </div>
    {mostrarBarraMovil && (
      <nav aria-label="Navegación rápida móvil" className="gc-mobile-tabbar">
        <Link
          to="/"
          aria-current={pathname === '/' && hash !== '#rutas' ? 'page' : undefined}
          onClick={() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          }}
        >
          <Icono nombre="inicio" className="h-5 w-5" />
          <span>Inicio</span>
        </Link>
        <Link
          to="/#rutas"
          aria-current={pathname === '/' && hash === '#rutas' ? 'location' : undefined}
          onClick={() => {
            document.getElementById('rutas')?.scrollIntoView({ block: 'start' });
          }}
        >
          <Icono nombre="ubicacion" className="h-5 w-5" />
          <span>Rutas</span>
        </Link>
        <Link
          to="/mis-viajes"
          aria-current={pathname === '/mis-viajes' ? 'page' : undefined}
        >
          <Icono nombre="calendario" className="h-5 w-5" />
          <span>Mis viajes</span>
        </Link>
        <Link
          to={usuario ? '/mi-cuenta' : '/iniciar-sesion'}
          aria-current={pathname === '/mi-cuenta' ? 'page' : undefined}
        >
          <Icono nombre="persona" className="h-5 w-5" />
          <span>Perfil</span>
        </Link>
      </nav>
    )}
  </div>;
}
