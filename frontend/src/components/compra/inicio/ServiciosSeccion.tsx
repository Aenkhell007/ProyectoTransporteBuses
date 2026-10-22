import { Icono } from '../Icono';
import type { NombreIcono } from '../Icono';
import { EncabezadoSeccion } from './EncabezadoSeccion';

export type ClaseServicio = 'EJECUTIVO' | 'NORMAL';

interface Servicio {
  clase: ClaseServicio;
  nombre: string;
  pisos: string;
  icono: NombreIcono;
  descripcion: string;
  caracteristicas: [NombreIcono, string][];
}

// Contenido comercial de la maqueta. La disponibilidad real depende del bus de cada viaje.
const servicios: Servicio[] = [
  {
    clase: 'EJECUTIVO', nombre: 'Ejecutivo', pisos: 'Dos pisos', icono: 'corona',
    descripcion: 'Máximo confort, asientos tipo cama, entretenimiento y un viaje más placentero.',
    caracteristicas: [['asiento', 'Asientos reclinables tipo cama'], ['pantalla', 'Pantallas individuales'], ['wifi', 'WiFi a bordo'],
      ['clima', 'Climatización'], ['bano', 'Baño'], ['enchufe', 'Enchufes USB']],
  },
  {
    clase: 'NORMAL', nombre: 'Confort', pisos: 'Un piso', icono: 'bus',
    descripcion: 'Comodidad y economía para tu viaje, con unidades modernas y seguras.',
    caracteristicas: [['asiento', 'Asientos cómodos'], ['clima', 'Climatización'], ['wifi', 'WiFi (según unidad)'],
      ['bano', 'Baño'], ['enchufe', 'Carga USB'], ['maleta', 'Amplio maletero']],
  },
];

export function ServiciosSeccion({ onElegir }: { onElegir: (clase: ClaseServicio, nombre: string) => void }) {
  return (
    <section id="servicios" aria-labelledby="servicios-titulo" className="py-8">
      <EncabezadoSeccion idTitulo="servicios-titulo" antetitulo="Nuestros servicios" titulo="Elige tu forma de viajar"
        descripcion="Contamos con unidades modernas y seguras, para que llegues a tu destino con total comodidad." />
      <div className="grid gap-4 lg:grid-cols-2">
        {servicios.map((s) => (
          <article key={s.clase} className="grid overflow-hidden rounded-lg bg-slate-900 text-white sm:grid-cols-[1.3fr_1fr]">
            <div className="relative flex min-h-48 flex-col justify-between gap-4 p-5">
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-br from-green-800/60 via-slate-900 to-red-800/60" />
              <div className="relative">
                <h3 className="flex items-center gap-3 text-xl font-bold">
                  <Icono nombre={s.icono} className="h-8 w-8 text-amber-400" />
                  <span>{s.nombre} <span className="block text-base font-semibold text-slate-200">({s.pisos})</span></span>
                </h3>
                <p className="mt-3 max-w-xs text-sm text-slate-100">{s.descripcion}</p>
              </div>
              <button type="button" onClick={() => onElegir(s.clase, `${s.nombre} (${s.pisos})`)}
                className="relative inline-flex min-h-11 w-fit items-center rounded-md bg-red-600 px-6 text-sm font-semibold hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Buscar en {s.nombre}<span className="sr-only"> ({s.pisos})</span>
              </button>
            </div>
            <ul className="grid content-center gap-2 bg-slate-950/60 p-5 text-sm">
              {s.caracteristicas.map(([icono, texto]) => (
                <li key={texto} className="flex items-center gap-2.5"><Icono nombre={icono} className="h-4 w-4 text-slate-200" />{texto}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
