import { BusImagen } from '../BusImagen';
import { Icono } from '../Icono';
import type { NombreIcono } from '../Icono';
import { EncabezadoSeccion } from './EncabezadoSeccion';

const pilares: { icono: NombreIcono; color: string; titulo: string; texto: string }[] = [
  { icono: 'escudo', color: 'bg-red-600', titulo: 'Seguridad', texto: 'Unidades modernas y mantenimiento constante para tu tranquilidad.' },
  { icono: 'bus', color: 'bg-green-600', titulo: 'Comodidad', texto: 'Asientos amplios, climatización y servicios pensados para un viaje agradable.' },
  { icono: 'personas', color: 'bg-red-600', titulo: 'Atención al pasajero', texto: 'Un equipo siempre dispuesto a ayudarte antes, durante y después de tu viaje.' },
];

export function SobreNosotrosSeccion() {
  return (
    <section id="sobre-nosotros" aria-labelledby="nosotros-titulo" className="py-8">
      <EncabezadoSeccion idTitulo="nosotros-titulo" antetitulo="Sobre nosotros" titulo="Conectamos destinos, acercamos personas" />
      <div className="grid items-center gap-5 md:grid-cols-[1.1fr_1fr]">
        <BusImagen alt="Bus de Gran Continental en carretera andina" className="aspect-[16/9] w-full rounded-lg" />
        <div className="space-y-4 text-slate-600 md:text-lg">
          <p>En Gran Continental trabajamos cada día para que cada viaje sea una experiencia segura, cómoda y confiable. Conectamos las principales ciudades del Ecuador, ofreciendo un servicio de transporte moderno, con unidades equipadas y un equipo comprometido con tu bienestar.</p>
          <p>El camino merece grandeza, y nosotros nos esforzamos por hacer de cada trayecto una historia positiva.</p>
        </div>
      </div>
      <ul className="mt-5 grid gap-3 md:grid-cols-3">
        {pilares.map((p) => (
          <li key={p.titulo} className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${p.color}`}>
              <Icono nombre={p.icono} className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-semibold text-slate-900">{p.titulo}</span>
              <span className="text-sm text-slate-600">{p.texto}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
