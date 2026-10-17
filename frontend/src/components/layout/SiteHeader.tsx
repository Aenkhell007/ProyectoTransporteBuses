import { useId, useState } from 'react';
import './site-shell.css';

export interface NavigationLink {
  id: string;
  label: string;
  href: string;
}

export const DEFAULT_NAVIGATION: readonly NavigationLink[] = [
  { id: 'inicio', label: 'Inicio', href: '/' },
  { id: 'rutas', label: 'Rutas', href: '/#rutas' },
  { id: 'servicios', label: 'Servicios', href: '/#servicios' },
  { id: 'nosotros', label: 'Sobre nosotros', href: '/#sobre-nosotros' },
  { id: 'contacto', label: 'Contacto', href: '/#contacto' },
];

export interface SiteHeaderProps {
  /** Logo alternativo. Si se omite, se muestra el logo exacto de la referencia aprobada. */
  logoSrc?: string;
  homeHref?: string;
  links?: readonly NavigationLink[];
  activeItem?: string;
  loginHref?: string;
  registerHref?: string;
  /** Si hay sesión, sustituye los botones de acceso por el enlace del cliente. */
  account?: { label: string; href: string };
}

export function SiteHeader({
  logoSrc = '/images/Logo G-C.png',
  homeHref = '/', links = DEFAULT_NAVIGATION, activeItem,
  loginHref = '/iniciar-sesion', registerHref = '/registrarse', account,
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigationId = useId();

  return (
    <header className="gc-header" onKeyDown={(event) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        event.currentTarget.querySelector<HTMLButtonElement>('.gc-menu-toggle')?.focus();
      }
    }}>
      <div className="gc-header__inner">
        <a className="gc-brand" href={homeHref} aria-label="Gran Continental, inicio"
          onClick={() => setMenuOpen(false)}>
          {logoSrc ? <img src={logoSrc} alt="Gran Continental — El camino merece grandeza" width="216" height="88" />
            : <span className="gc-brand__reference" aria-hidden="true" />}
        </a>
        <button className="gc-menu-toggle" type="button" aria-controls={navigationId}
          aria-expanded={menuOpen} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen(!menuOpen)}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
            strokeWidth="2" aria-hidden="true">
            {menuOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
        <nav id={navigationId} className={`gc-navigation${menuOpen ? ' gc-navigation--open' : ''}`}
          aria-label="Navegación principal" onClick={() => setMenuOpen(false)}>
          <ul className="gc-navigation__links">
            {links.map((link) => (
              <li key={link.id}>
                <a href={link.href} aria-current={activeItem === link.id
                  ? (link.href.includes('#') ? 'location' : 'page') : undefined}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="gc-header__actions">
            {account ? <a className="gc-button gc-button--account" href={account.href}>{account.label}</a> : <>
              <a className="gc-button gc-button--login" href={loginHref}>
                <PersonIcon /> Iniciar sesión
              </a>
              <a className="gc-button gc-button--register" href={registerHref}>
                <PersonIcon /> Registrarse
              </a>
            </>}
          </div>
        </nav>
      </div>
    </header>
  );
}

function PersonIcon() {
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="7" r="4" /><path d="M3 22v-3a9 9 0 0 1 18 0v3z" />
  </svg>;
}
