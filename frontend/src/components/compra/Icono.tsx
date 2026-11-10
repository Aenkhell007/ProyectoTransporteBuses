// Iconos de trazo en SVG para el módulo de compra, sin librerías externas.
const trazos = {
  ubicacion: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  intercambiar: <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  persona: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  personas: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  lupa: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  montana: <path d="m3 20 6.5-11 4 6.5L16 12l5 8H3Z" />,
  asiento: (
    <path d="M7 3v10a2 2 0 0 0 2 2h6l2 6M7 13h9a2 2 0 0 1 2 2v1M5 21h4" />
  ),
  escudo: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  soporte: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  corona: <path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z" />,
  bus: (
    <>
      <rect x="4" y="3" width="16" height="15" rx="2.5" />
      <path d="M4 11h16M8 21v-3M16 21v-3M8 14.5h.01M16 14.5h.01M4 7h16" />
    </>
  ),
  clima: (
    <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
  ),
  wifi: (
    <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a4.5 4.5 0 0 1 6.4 0M12 19.5h.01" />
  ),
  bano: (
    <>
      <circle cx="7" cy="4.5" r="1.5" />
      <circle cx="17" cy="4.5" r="1.5" />
      <path d="M5 8h4l1 6H8v7H6v-7H4l1-6ZM15 8h4v7h-1v6h-2v-6h-1V8Z" />
    </>
  ),
  enchufe: <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4" />,
  pantalla: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  maleta: (
    <>
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M9 7V4h6v3M9 11v5M15 11v5" />
    </>
  ),
  flechaDerecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  flechaIzquierda: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chevronAbajo: <path d="m6 9 6 6 6-6" />,
  chevronArriba: <path d="m6 15 6-6 6 6" />,
  chevronDerecha: <path d="m9 6 6 6-6 6" />,
  chevronIzquierda: <path d="m15 6-6 6 6 6" />,
  whatsapp: (
    <>
      <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Z" />
      <path d="M9 9.5c.3 2.3 2.2 4.2 4.5 4.5l1-1.2 2 .9c-.2 1-1 1.8-2 1.8A6.5 6.5 0 0 1 8 9c0-1 .8-1.8 1.8-2l.9 2-1.2 1" />
    </>
  ),
  correo: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </>
  ),
  enviar: <path d="M21 3 3 10.5l7 2.5 2.5 7L21 3ZM10 13l4-4" />,
  externo: (
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checkCirculo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16.5 9.5" />
    </>
  ),
  xCirculo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4.5M12 17.5h.01" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  filtros: (
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4" />
  ),
  ordenar: <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />,
  editar: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  porcentaje: (
    <path d="M19 5 5 19M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM16.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
  ),
  documento: (
    <>
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  calculadora: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01" />
    </>
  ),
  boleto: (
    <>
      <path d="M3 8a2 2 0 0 0 0 4v-0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3v2Z" />
      <path d="M14 6v12" strokeDasharray="2 2" />
    </>
  ),
  descarga: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  usuarioCuenta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18.5a6 6 0 0 1 11 0" />
    </>
  ),
  accesibilidad: (
    <>
      <circle cx="12" cy="4.5" r="1.5" />
      <path d="M5 8l7 1 7-1M12 9v5l-3 6M12 14l3 6" />
    </>
  ),
} as const;

export type NombreIcono = keyof typeof trazos;

interface IconoProps {
  nombre: NombreIcono;
  className?: string;
  /** Texto para lectores de pantalla. Sin él, el icono es decorativo. */
  titulo?: string;
}

export function Icono({ nombre, className = "h-5 w-5", titulo }: IconoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden={titulo ? undefined : true}
      role={titulo ? "img" : undefined}
    >
      {titulo && <title>{titulo}</title>}
      {trazos[nombre]}
    </svg>
  );
}
