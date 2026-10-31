import { useId, useState } from 'react';
import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../features/auth/AuthContext';
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
  /** Destino del enlace de cuenta; los datos y el estado proceden de la sesión. */
  account?: { label: string; href: string };
}

export function SiteHeader({
  logoSrc = '/images/Logo G-C.png',
  homeHref = '/', links = DEFAULT_NAVIGATION, activeItem,
  loginHref = '/iniciar-sesion', registerHref = '/registrarse', account,
}: SiteHeaderProps) {
  const { usuario, cargando, logout } = useAuth();
  const [saliendo, setSaliendo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const nombreCompleto = usuario ? `${usuario.nombres} ${usuario.apellidos}`.trim() : '';

  async function cerrarSesion() {
    if (saliendo) return;
    setSaliendo(true);
    try {
      await logout();
    } catch {
      window.alert('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    } finally {
      setSaliendo(false);
    }
  }
  const navigationId = useId();

  return (
    <header className="gc-header" onKeyDown={(event) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        event.currentTarget.querySelector<HTMLButtonElement>('.gc-menu-toggle')?.focus();
      }
    }}>
      <div className="gc-header__inner">
        <HeaderLink className="gc-brand" href={homeHref} aria-label="Gran Continental, inicio"
          onClick={() => setMenuOpen(false)}>
          <img
            src={logoSrc}
            alt="Gran Continental — El camino merece grandeza"
            width="216"
            height="88"
          />
        </HeaderLink>
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
                <HeaderLink href={link.href} aria-current={activeItem === link.id
                  ? (link.href.includes('#') ? 'location' : 'page') : undefined}>
                  {link.label}
                </HeaderLink>
              </li>
            ))}
          </ul>
          <div className="gc-header__actions" aria-busy={cargando}
            style={{ visibility: cargando ? 'hidden' : undefined }}>
            <HeaderLink className="gc-button gc-button--login"
              href={usuario ? (account?.href ?? '/mi-cuenta') : loginHref}
              title={usuario ? nombreCompleto : undefined}>
              <PersonIcon />
              <ActionLabel espacio="Iniciar sesión" texto={usuario ? nombreCompleto : 'Iniciar sesión'} />
            </HeaderLink>
            {usuario ? (
              <button className="gc-button gc-button--register" type="button"
                onClick={cerrarSesion} disabled={saliendo} aria-busy={saliendo}
                style={{ fontFamily: 'inherit', fontSize: '14px', lineHeight: 'inherit', cursor: 'pointer' }}>
                <PersonIcon />
                <ActionLabel espacio="Registrarse" texto={saliendo ? 'Saliendo…' : 'Salir'} />
              </button>
            ) : (
              <HeaderLink className="gc-button gc-button--register" href={registerHref}>
                <PersonIcon /> <ActionLabel espacio="Registrarse" texto="Registrarse" />
              </HeaderLink>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

// Los enlaces internos mantienen montado el proveedor de sesión. Los externos conservan su comportamiento.
function HeaderLink({ href = '/', onClick, ...props }: ComponentProps<'a'>) {
  const interno = (href.startsWith('/') && !href.startsWith('//')) || href.startsWith('#');
  if (!interno) return <a href={href} onClick={onClick} {...props} />;
  return <Link to={href} {...props} onClick={(event) => {
    onClick?.(event);
    if (!event.defaultPrevented && event.button === 0 &&
        !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey &&
        (!props.target || props.target === '_self') && href === '/') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }} />;
}

// El texto original reserva el mismo ancho en ambos estados, también en móvil.
function ActionLabel({ espacio, texto }: { espacio: string; texto: string }) {
  return <span style={{ position: 'relative', display: 'inline-block', minWidth: 0 }}>
    <span aria-hidden="true" style={{ visibility: 'hidden' }}>{espacio}</span>
    <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{texto}</span>
  </span>;
}

function PersonIcon() {
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="7" r="4" /><path d="M3 22v-3a9 9 0 0 1 18 0v3z" />
  </svg>;
}
