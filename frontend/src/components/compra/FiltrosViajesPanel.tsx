import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import type { Cooperativa } from "../../types/compra/viajes";
import { formatearCentavos } from "../../features/compra/dinero";
import {
  CLASES,
  FRANJAS,
  PRECIO_CONTROL,
  TIPOS_VIAJE,
} from "../../features/compra/filtrosViajes";
import type { FiltrosViajes } from "../../features/compra/filtrosViajes";
import { Icono } from "./Icono";
import type { NombreIcono } from "./Icono";

export interface OpcionesFiltro {
  cooperativas: Cooperativa[];
  chasis: string[];
  carrocerias: string[];
}

interface FiltrosViajesPanelProps {
  filtros: FiltrosViajes;
  opciones: OpcionesFiltro;
  error: string | null;
  onCambiar: (filtros: FiltrosViajes) => void;
  onLimpiar: () => void;
}

const control =
  "h-10 w-full appearance-none rounded-md border border-slate-300 bg-white pr-8 pl-3 text-sm outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-200";

export function FiltrosViajesPanel({
  filtros,
  opciones,
  error,
  onCambiar,
  onLimpiar,
}: FiltrosViajesPanelProps) {
  const id = useId();
  const [precio, setPrecio] = useState({
    min: filtros.precio_min ?? PRECIO_CONTROL.min,
    max: filtros.precio_max ?? PRECIO_CONTROL.max,
  });

  // La URL puede cambiar por "Limpiar todo" o por el historial del navegador.
  useEffect(() => {
    setPrecio({
      min: filtros.precio_min ?? PRECIO_CONTROL.min,
      max: filtros.precio_max ?? PRECIO_CONTROL.max,
    });
  }, [filtros.precio_min, filtros.precio_max]);

  // El precio se aplica después de una pausa para no consultar en cada movimiento.
  useEffect(() => {
    const min = precio.min === PRECIO_CONTROL.min ? null : precio.min;
    const max = precio.max === PRECIO_CONTROL.max ? null : precio.max;
    if (min === filtros.precio_min && max === filtros.precio_max) return;
    const t = setTimeout(
      () => onCambiar({ ...filtros, precio_min: min, precio_max: max }),
      400,
    );
    return () => clearTimeout(t);
  }, [precio, filtros, onCambiar]);

  const cambiar = <K extends keyof FiltrosViajes>(
    campo: K,
    valor: FiltrosViajes[K],
  ) => onCambiar({ ...filtros, [campo]: valor });

  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 id={`${id}-titulo`} className="text-lg font-bold text-slate-900">
          Filtros
        </h2>
        <button
          type="button"
          onClick={onLimpiar}
          className="text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          Limpiar todo
        </button>
      </div>
      <div className="space-y-4">
        <Filtro id={`${id}-coop`} icono="bus" etiqueta="Cooperativa">
          <select
            id={`${id}-coop`}
            value={filtros.cooperativa}
            onChange={(e) => cambiar("cooperativa", e.target.value)}
            className={control}
          >
            <option value="">Todas</option>
            {opciones.cooperativas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Filtro>
        <Filtro id={`${id}-clase`} icono="asiento" etiqueta="Tipo de asiento">
          <select
            id={`${id}-clase`}
            value={filtros.clase}
            onChange={(e) =>
              cambiar("clase", e.target.value as FiltrosViajes["clase"])
            }
            className={control}
          >
            <option value="">Normal / VIP</option>
            {CLASES.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.nombre}
              </option>
            ))}
          </select>
        </Filtro>
        <Filtro id={`${id}-chasis`} icono="bus" etiqueta="Chasis">
          <select
            id={`${id}-chasis`}
            value={filtros.chasis}
            onChange={(e) => cambiar("chasis", e.target.value)}
            className={control}
          >
            <option value="">Todas las marcas</option>
            {opciones.chasis.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Filtro>
        <Filtro id={`${id}-carroceria`} icono="bus" etiqueta="Carrocería">
          <select
            id={`${id}-carroceria`}
            value={filtros.carroceria}
            onChange={(e) => cambiar("carroceria", e.target.value)}
            className={control}
          >
            <option value="">Todas las marcas</option>
            {opciones.carrocerias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Filtro>
        <Filtro id={`${id}-tipo`} icono="reloj" etiqueta="Tipo de viaje">
          <select
            id={`${id}-tipo`}
            value={filtros.tipo_viaje}
            onChange={(e) =>
              cambiar(
                "tipo_viaje",
                e.target.value as FiltrosViajes["tipo_viaje"],
              )
            }
            className={control}
          >
            <option value="">Directo / Con paradas</option>
            {TIPOS_VIAJE.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Filtro>
        <Filtro id={`${id}-hora`} icono="reloj" etiqueta="Hora de salida">
          <select
            id={`${id}-hora`}
            value={filtros.hora}
            onChange={(e) =>
              cambiar("hora", e.target.value as FiltrosViajes["hora"])
            }
            className={control}
          >
            <option value="">Todas las horas</option>
            {FRANJAS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.nombre}
              </option>
            ))}
          </select>
        </Filtro>

        <fieldset className="border-t border-slate-100 pt-3">
          <legend className="text-sm font-semibold text-slate-800">
            Precio por pasajero
          </legend>
          <label
            htmlFor={`${id}-pmin`}
            className="mt-2 flex justify-between text-xs text-slate-600"
          >
            <span>Mínimo</span>
            <span className="font-semibold text-slate-900">
              {formatearCentavos(precio.min)}
            </span>
          </label>
          <input
            id={`${id}-pmin`}
            type="range"
            min={PRECIO_CONTROL.min}
            max={PRECIO_CONTROL.max}
            step={PRECIO_CONTROL.paso}
            value={precio.min}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-perror` : undefined}
            onChange={(e) =>
              setPrecio((p) => ({ ...p, min: Number(e.target.value) }))
            }
            className="w-full accent-green-700"
          />
          <label
            htmlFor={`${id}-pmax`}
            className="mt-1 flex justify-between text-xs text-slate-600"
          >
            <span>Máximo</span>
            <span className="font-semibold text-slate-900">
              {precio.max === PRECIO_CONTROL.max
                ? "Sin límite"
                : formatearCentavos(precio.max)}
            </span>
          </label>
          <input
            id={`${id}-pmax`}
            type="range"
            min={PRECIO_CONTROL.min}
            max={PRECIO_CONTROL.max}
            step={PRECIO_CONTROL.paso}
            value={precio.max}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-perror` : undefined}
            onChange={(e) =>
              setPrecio((p) => ({ ...p, max: Number(e.target.value) }))
            }
            className="w-full accent-green-700"
          />
          {error && (
            <p
              id={`${id}-perror`}
              role="alert"
              className="mt-1 text-sm text-red-700"
            >
              {error}
            </p>
          )}
        </fieldset>
      </div>
    </section>
  );
}

function Filtro({
  id,
  icono,
  etiqueta,
  children,
}: {
  id: string;
  icono: NombreIcono;
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800"
      >
        <Icono nombre={icono} className="h-4 w-4 text-slate-600" />
        {etiqueta}
      </label>
      <div className="relative">
        {children}
        <Icono
          nombre="chevronDerecha"
          className="pointer-events-none absolute top-2.5 right-2.5 h-5 w-5 rotate-90 text-slate-500"
        />
      </div>
    </div>
  );
}
