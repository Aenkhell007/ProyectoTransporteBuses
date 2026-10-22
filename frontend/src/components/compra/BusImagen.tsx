import { Icono } from './Icono';

interface BusImagenProps {
  /** Foto del bus (bus_fotos). Mientras no haya fotos se muestra una ilustración neutra. */
  src?: string | null;
  alt: string;
  className?: string;
}

export function BusImagen({ src, alt, className = '' }: BusImagenProps) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
  }
  return (
    <div role="img" aria-label={alt}
      className={`flex items-center justify-center bg-linear-to-br from-green-700 via-slate-800 to-red-700 text-white ${className}`}>
      <Icono nombre="bus" className="h-1/2 max-h-16 w-1/2 max-w-16 opacity-90" />
    </div>
  );
}
