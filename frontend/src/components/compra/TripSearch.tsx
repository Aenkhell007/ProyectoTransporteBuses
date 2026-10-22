import { useId } from 'react';
import type { ReactNode, Ref } from 'react';
import type { Ciudad } from '../../types/compra/catalogo';
import { LIMITE_PASAJEROS } from '../../features/compra/busqueda';
import type { ErroresBusqueda, FormularioBusqueda } from '../../features/compra/busqueda';
import { Icono } from './Icono';
import type { NombreIcono } from './Icono';

export type EstadoCarga = 'cargando' | 'listo' | 'error';

interface TripSearchProps {
  ciudades: Ciudad[];
  estadoCiudades: EstadoCarga;
  onReintentar: () => void;
  valores: FormularioBusqueda;
  onCambiar: (valores: FormularioBusqueda) => void;
  errores: ErroresBusqueda;
  onBuscar: () => void;
  hoy: string;
  /** Contenido extra bajo el formulario, por ejemplo el servicio precargado. */
  aviso?: ReactNode;
  ref?: Ref<HTMLFormElement>;
}

const control = 'peer h-11 w-full appearance-none rounded-md border bg-white pr-9 pl-3 text-[15px] text-slate-800 outline-none transition focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400';

/** Formulario de búsqueda de pasajes (vista 1). Controlado por la página. */
export function TripSearch({
  ciudades, estadoCiudades, onReintentar, valores, onCambiar, errores, onBuscar, hoy, aviso, ref,
}: TripSearchProps) {
  const id = useId();
  const ids = new Set(ciudades.map((c) => c.id));
  const puedeIntercambiar = ids.has(valores.origen) && ids.has(valores.destino);
  const sinCiudades = estadoCiudades !== 'listo';
  const textoCiudad = estadoCiudades === 'cargando' ? 'Cargando ciudades…' : 'Ciudades no disponibles';

  const cambiar = (campo: keyof FormularioBusqueda, valor: string) => onCambiar({ ...valores, [campo]: valor });

  const opcionesCiudad = ciudades.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.provincia})</option>);

  return (
    <form ref={ref} noValidate aria-label="Buscar pasajes" id="buscar"
      onSubmit={(e) => { e.preventDefault(); onBuscar(); }}
      className="rounded-lg bg-white p-4 shadow-lg ring-1 ring-slate-200 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_1fr_0.8fr_auto] lg:items-start">
        <Campo id={`${id}-origen`} etiqueta="Origen" icono="ubicacion" error={errores.origen}>
          <select id={`${id}-origen`} value={valores.origen} disabled={sinCiudades}
            aria-invalid={!!errores.origen} aria-describedby={errores.origen ? `${id}-origen-error` : undefined}
            onChange={(e) => cambiar('origen', e.target.value)}
            className={`${control} ${errores.origen ? 'border-red-500' : 'border-slate-300'}`}>
            <option value="">{sinCiudades ? textoCiudad : 'Ciudad de origen'}</option>
            {opcionesCiudad}
          </select>
        </Campo>

        <div className="flex justify-center lg:pt-7">
          <button type="button" disabled={!puedeIntercambiar}
            onClick={() => onCambiar({ ...valores, origen: valores.destino, destino: valores.origen })}
            aria-label="Intercambiar origen y destino"
            title={puedeIntercambiar ? 'Intercambiar origen y destino' : 'Elige origen y destino para intercambiarlos'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40">
            <Icono nombre="intercambiar" className="h-5 w-5 rotate-90 lg:rotate-0" />
          </button>
        </div>

        <Campo id={`${id}-destino`} etiqueta="Destino" icono="ubicacion" error={errores.destino}>
          <select id={`${id}-destino`} value={valores.destino} disabled={sinCiudades}
            aria-invalid={!!errores.destino} aria-describedby={errores.destino ? `${id}-destino-error` : undefined}
            onChange={(e) => cambiar('destino', e.target.value)}
            className={`${control} ${errores.destino ? 'border-red-500' : 'border-slate-300'}`}>
            <option value="">{sinCiudades ? textoCiudad : 'Ciudad de destino'}</option>
            {opcionesCiudad}
          </select>
        </Campo>

        <Campo id={`${id}-fecha`} etiqueta="Fecha de viaje" icono="calendario" error={errores.fecha} sinFlecha>
          <input id={`${id}-fecha`} type="date" min={hoy} value={valores.fecha}
            aria-invalid={!!errores.fecha} aria-describedby={errores.fecha ? `${id}-fecha-error` : undefined}
            onChange={(e) => cambiar('fecha', e.target.value)}
            className={`${control} pr-3 ${errores.fecha ? 'border-red-500' : 'border-slate-300'}`} />
        </Campo>

        <Campo id={`${id}-cantidad`} etiqueta="Pasajeros" icono="persona" error={errores.cantidad}>
          <select id={`${id}-cantidad`} value={valores.cantidad}
            aria-invalid={!!errores.cantidad} aria-describedby={errores.cantidad ? `${id}-cantidad-error` : undefined}
            onChange={(e) => cambiar('cantidad', e.target.value)}
            className={`${control} ${errores.cantidad ? 'border-red-500' : 'border-slate-300'}`}>
            {Array.from({ length: LIMITE_PASAJEROS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>{n} {n === 1 ? 'pasajero' : 'pasajeros'}</option>
            ))}
          </select>
        </Campo>

        <button type="submit" disabled={sinCiudades}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-red-600 px-6 text-base font-semibold text-white transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-red-300 lg:mt-6">
          <Icono nombre="lupa" /> Buscar pasajes
        </button>
      </div>

      {estadoCiudades === 'error' && (
        <p role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-red-700">
          <Icono nombre="alerta" className="h-4 w-4" /> No pudimos cargar las ciudades.
          <button type="button" onClick={onReintentar} className="font-semibold underline focus-visible:outline-2 focus-visible:outline-blue-600">Reintentar</button>
        </p>
      )}
      {aviso}
    </form>
  );
}

function Campo({ id, etiqueta, icono, error, sinFlecha, children }: {
  id: string; etiqueta: string; icono: NombreIcono; error?: string; sinFlecha?: boolean; children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <Icono nombre={icono} className="h-4 w-4 text-red-600" /> {etiqueta}
      </label>
      <div className="relative">
        {children}
        {!sinFlecha && <Icono nombre="chevronAbajo" className="pointer-events-none absolute top-3 right-3 h-5 w-5 text-slate-500" />}
      </div>
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
