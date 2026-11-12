import type { ReactNode } from 'react';
import { NavLink } from 'react-router';

export function ConfiguracionCooperativaTabs() {
  const base = '/vista-previa/cooperativa/configuracion';
  return <nav aria-label="Secciones de configuración" className="grid grid-cols-3 gap-1 overflow-hidden rounded-lg bg-blue-50 text-center text-xs sm:text-sm">
    {[[base, 'Identidad y contacto', 'identidad'], [`${base}/pagos`, 'Pagos', 'pagos'], [`${base}/tarifas`, 'Tarifas y descuentos', 'tarifas']].map(([ruta, nombre, icono]) => <NavLink key={ruta} to={ruta} end className={({ isActive }) => `flex min-h-12 items-center justify-center gap-2 border-b-2 px-2 py-2 ${isActive ? 'border-blue-700 bg-white font-bold' : 'border-transparent hover:bg-blue-100'}`}><IconoConfiguracion nombre={icono} /><span>{nombre}</span></NavLink>)}
  </nav>;
}

export function IconoConfiguracion({ nombre, className = 'h-6 w-6 shrink-0' }: { nombre: string; className?: string }) {
  const trazos: Record<string, ReactNode> = {
    identidad: <><path d="M5 21V7h10v14M9 7V3h6v4M15 12h4v9M3 21h18M8 10h1m2 0h1m-4 4h1m2 0h1m-4 4h1m2 0h1" /></>,
    pagos: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></>,
    tarifas: <><path d="M3 4h8l10 10-7 7L3 10V4Z"/><circle cx="7.5" cy="8" r="1"/></>,
    ojo: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    colores: <><path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h3a5 5 0 0 0 0-10h-4Z"/><path d="M7 8h.01M6 12h.01M10 6h.01M15 6h.01"/></>,
    telefono: <path d="m6 3 4 5-3 3c2 3 3 4 6 6l3-3 5 4c-2 6-6 3-10 1S2 10 3 6l3-3Z"/>,
    redes: <><circle cx="5" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8 10 7-4M8 14l7 4"/></>,
    guardar: <><path d="M4 3h13l4 4v14H3V3h1ZM7 3v6h10V3M7 21v-8h10v8"/></>,
    subir: <><path d="M12 16V3m-5 5 5-5 5 5M3 14v7h18v-7"/></>,
    personas: <><circle cx="9" cy="7" r="3"/><circle cx="18" cy="8" r="2"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M18 14a4 4 0 0 1 4 4v3"/></>,
    bus: <><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 10h16M7 21v-3m10 3v-3M8 14h1m6 0h1"/></>,
    lupa: <><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
    info: <><circle cx="12" cy="12" r="10"/><path d="M12 10v7m0-11v1"/></>,
    ajustes: <><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 4h4l2-3 3-1 3-3-2-3 1-3-3-2-2-3H9Z"/><circle cx="11" cy="12" r="3"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{trazos[nombre] ?? trazos.ajustes}</svg>;
}
