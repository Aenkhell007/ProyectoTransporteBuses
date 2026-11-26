import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { IconoBiblioteca } from '../ui/IconoBiblioteca';
import type { BusResumenFlota } from '../../features/flota/editorApi';

export type CategoriaAsientosBus = 'NORMAL' | 'VIP' | 'MIXTO';

export function categoriaAsientosBus(bus: BusResumenFlota): CategoriaAsientosBus {
  const normal = bus.asientos_normal ?? 0;
  const vip = bus.asientos_vip ?? 0;
  if (normal > 0 && vip > 0) return 'MIXTO';
  if (vip > 0) return 'VIP';
  return 'NORMAL';
}

const ETIQUETA_CATEGORIA: Record<CategoriaAsientosBus, { texto: string; clase: string }> = {
  NORMAL: { texto: 'Normal', clase: 'bg-green-600 text-white' },
  VIP: { texto: 'VIP', clase: 'bg-amber-500 text-slate-950' },
  MIXTO: { texto: 'Mixto (Normal + VIP)', clase: 'bg-indigo-700 text-white' },
};

interface Props {
  cooperativaId: string;
  buses: BusResumenFlota[];
  grupos: { id: string; nombre: string }[];
}

export default function FlotaBusesVista({ cooperativaId, buses, grupos }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'TODOS' | CategoriaAsientosBus>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
  const [grupoFiltro, setGrupoFiltro] = useState('');

  const conteos = useMemo(() => {
    const c = { total: buses.length, NORMAL: 0, VIP: 0, MIXTO: 0 };
    for (const b of buses) c[categoriaAsientosBus(b)] += 1;
    return c;
  }, [buses]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLocaleLowerCase('es');
    return buses.filter((b) => {
      if (categoriaFiltro !== 'TODOS' && categoriaAsientosBus(b) !== categoriaFiltro) return false;
      if (estadoFiltro === 'ACTIVOS' && !b.activo) return false;
      if (estadoFiltro === 'INACTIVOS' && b.activo) return false;
      if (grupoFiltro && b.grupo_id !== grupoFiltro) return false;
      if (q) {
        const texto = `${b.unidad} ${b.placa} ${b.chasis ?? ''} ${b.carroceria ?? ''} ${b.grupo_nombre ?? ''}`.toLocaleLowerCase('es');
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [buses, busqueda, categoriaFiltro, estadoFiltro, grupoFiltro]);

  const hayFiltrosActivos =
    busqueda.trim() !== '' || categoriaFiltro !== 'TODOS' || estadoFiltro !== 'TODOS' || grupoFiltro !== '';

  function limpiarFiltros() {
    setBusqueda('');
    setCategoriaFiltro('TODOS');
    setEstadoFiltro('TODOS');
    setGrupoFiltro('');
  }

  const kpis: {
    id: 'TODOS' | CategoriaAsientosBus;
    titulo: string;
    valor: number;
    icono: 'bus' | 'asiento' | 'corona' | 'filtros';
    caja: string;
    iconoClase: string;
  }[] = [
    {
      id: 'TODOS',
      titulo: 'Total unidades',
      valor: conteos.total,
      icono: 'bus',
      caja: 'border-blue-100',
      iconoClase: 'bg-blue-50 text-blue-700',
    },
    {
      id: 'NORMAL',
      titulo: 'Buses Normal',
      valor: conteos.NORMAL,
      icono: 'asiento',
      caja: 'border-green-100',
      iconoClase: 'bg-green-50 text-green-700',
    },
    {
      id: 'VIP',
      titulo: 'Buses VIP',
      valor: conteos.VIP,
      icono: 'corona',
      caja: 'border-amber-100',
      iconoClase: 'bg-amber-50 text-amber-600',
    },
    {
      id: 'MIXTO',
      titulo: 'Buses Mixtos',
      valor: conteos.MIXTO,
      icono: 'filtros',
      caja: 'border-indigo-100',
      iconoClase: 'bg-indigo-50 text-indigo-700',
    },
  ];

  return (
    <section className="space-y-5 py-4 text-[#08035b]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Gestión de buses</h1>
          <p className="mt-1 text-sm text-indigo-700">
            Administra las unidades, fotos y distribución de asientos de tu cooperativa.
          </p>
        </div>
        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#ff001c] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-red-700"
          to={`nuevo?cooperativaId=${encodeURIComponent(cooperativaId)}`}
        >
          <IconoBiblioteca nombre="mas" className="size-4" />
          Nuevo bus
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const seleccionado = categoriaFiltro === k.id;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => setCategoriaFiltro(k.id)}
              aria-pressed={seleccionado}
              className={`flex items-center gap-3 rounded-xl border bg-white p-3.5 text-left transition hover:shadow-sm ${
                seleccionado
                  ? 'border-blue-600 ring-2 ring-blue-100'
                  : k.caja
              }`}
            >
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${k.iconoClase}`}>
                <IconoBiblioteca nombre={k.icono} className="size-6" />
              </span>
              <div className="min-w-0">
                <span className="block truncate text-xs text-slate-600">{k.titulo}</span>
                <strong className="text-2xl font-bold text-[#1002b4]">{k.valor}</strong>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 rounded-xl border border-blue-100 bg-white p-3.5 shadow-xs">
        <div className="grid gap-3 md:grid-cols-[1.5fr_auto_auto]">
          <label className="relative block">
            <span className="sr-only">Buscar bus por unidad, placa, chasis o carrocería</span>
            <IconoBiblioteca nombre="buscar" className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar por unidad, placa, chasis o carrocería…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="min-h-9 w-full rounded-md border border-blue-200 bg-white py-1.5 pl-9 pr-3 text-sm text-blue-950 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <select
            aria-label="Filtrar por estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value as 'TODOS' | 'ACTIVOS' | 'INACTIVOS')}
            className="min-h-9 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm text-blue-950 outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="ACTIVOS">Solo activos</option>
            <option value="INACTIVOS">Solo inactivos</option>
          </select>

          <select
            aria-label="Filtrar por grupo"
            value={grupoFiltro}
            onChange={(e) => setGrupoFiltro(e.target.value)}
            className="min-h-9 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-sm text-blue-950 outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Todos los grupos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de asientos">
            {(
              [
                ['TODOS', `Todos (${conteos.total})`],
                ['NORMAL', `Normal (${conteos.NORMAL})`],
                ['VIP', `VIP (${conteos.VIP})`],
                ['MIXTO', `Mixto (${conteos.MIXTO})`],
              ] as const
            ).map(([id, etiqueta]) => {
              const activo = categoriaFiltro === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setCategoriaFiltro(id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    activo
                      ? 'bg-[#1002b4] text-white shadow-xs'
                      : 'border border-blue-200 bg-blue-50/50 text-blue-900 hover:bg-blue-100'
                  }`}
                >
                  {etiqueta}
                </button>
              );
            })}
          </div>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-xs font-semibold text-blue-700 underline hover:text-blue-900"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {buses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-blue-200 bg-white p-8 text-center">
          <IconoBiblioteca nombre="bus" className="mx-auto mb-3 size-10 text-blue-300" />
          <p className="font-semibold text-[#08035b]">No hay buses registrados todavía.</p>
          <p className="mt-1 text-sm text-slate-600">
            Agrega tu primera unidad para diseñar su mapa de asientos y asignarla a tus frecuencias.
          </p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-blue-100 bg-white p-8 text-center">
          <p className="font-semibold text-[#08035b]">Ningún bus coincide con los filtros actuales.</p>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="mt-3 rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100"
          >
            Mostrar todos los buses
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((b) => {
            const cat = categoriaAsientosBus(b);
            const catMeta = ETIQUETA_CATEGORIA[cat];
            const normal = b.asientos_normal ?? 0;
            const vip = b.asientos_vip ?? 0;
            const total = normal + vip;
            const pisos = b.pisos ?? 1;
            const imgFallback = `/images/compra/bus-${pisos === 2 ? 'dos-pisos' : 'un-piso'}.webp`;
            const servicios = b.servicios ?? [];

            return (
              <li
                key={b.id}
                className="flex flex-col overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                  <img
                    src={b.foto_url || imgFallback}
                    alt={`Unidad ${b.unidad}`}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallbackApplied) {
                        img.dataset.fallbackApplied = '1';
                        img.src = imgFallback;
                      }
                    }}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-slate-950/60 to-transparent p-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-xs ${catMeta.clase}`}>
                      {catMeta.texto}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-xs ${
                        b.activo ? 'bg-green-100/95 text-green-900' : 'bg-slate-200/95 text-slate-700'
                      }`}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {b.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1.5 bg-gradient-to-t from-slate-950/75 to-transparent p-2.5 text-[11px] font-medium text-white">
                    <span className="rounded bg-black/50 px-2 py-0.5">
                      {pisos === 2 ? '2 pisos' : '1 piso'}
                    </span>
                    {b.tiene_bano && (
                      <span className="inline-flex items-center gap-1 rounded bg-sky-700/90 px-2 py-0.5">
                        <IconoBiblioteca nombre="bano" className="size-3" />
                        Baño
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-[#08035b]">Unidad {b.unidad}</h2>
                      {(b.chasis || b.carroceria) && (
                        <p className="truncate text-xs text-slate-500">
                          {[b.chasis, b.carroceria].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-slate-800">
                      {b.placa}
                    </span>
                  </div>

                  {b.grupo_nombre && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-blue-900">
                      <IconoBiblioteca nombre="grupo" className="size-3.5 text-blue-600" />
                      <span>Grupo: {b.grupo_nombre}</span>
                    </div>
                  )}

                  {total > 0 && (
                    <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-700">{total} asientos</span>
                        <span className="text-slate-600">
                          {normal > 0 && <span className="font-medium text-green-800">{normal} Normal</span>}
                          {normal > 0 && vip > 0 && ' · '}
                          {vip > 0 && <span className="font-medium text-amber-700">{vip} VIP</span>}
                        </span>
                      </div>
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                        {normal > 0 && (
                          <span
                            className="bg-green-600"
                            style={{ width: `${Math.round((normal / total) * 100)}%` }}
                          />
                        )}
                        {vip > 0 && (
                          <span
                            className="bg-amber-500"
                            style={{ width: `${Math.round((vip / total) * 100)}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {servicios.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {servicios.slice(0, 4).map((s) => (
                        <span key={s} className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                          {s}
                        </span>
                      ))}
                      {servicios.length > 4 && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                          +{servicios.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto border-t border-blue-50 pt-3">
                    <Link
                      className="inline-flex w-full items-center justify-between rounded-md bg-blue-50/70 px-3 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
                      to={`${b.id}?cooperativaId=${encodeURIComponent(cooperativaId)}`}
                    >
                      <span>Editar datos, fotos y plano →</span>
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
