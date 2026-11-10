import { useRef } from "react";
import type { KeyboardEvent } from "react";
import type { SeccionMisViajes } from "../../types/compra/misViajes";

const PESTANAS: { valor: SeccionMisViajes; nombre: string }[] = [
  { valor: "proximos", nombre: "Próximos" },
  { valor: "historial", nombre: "Historial" },
];

interface MyTripsTabsProps {
  actual: SeccionMisViajes;
  onCambiar: (seccion: SeccionMisViajes) => void;
  /** id del panel que controlan las pestañas. */
  panelId: string;
}

/** Pestañas Próximos / Historial (vistas 9 y 9.1). Flechas izquierda/derecha cambian de pestaña. */
export function MyTripsTabs({ actual, onCambiar, panelId }: MyTripsTabsProps) {
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = PESTANAS.findIndex((p) => p.valor === actual);
    const siguiente =
      (i + (e.key === "ArrowRight" ? 1 : -1) + PESTANAS.length) %
      PESTANAS.length;
    onCambiar(PESTANAS[siguiente].valor);
    botones.current[siguiente]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Mis viajes"
      onKeyDown={teclado}
      className="grid max-w-md grid-cols-2 gap-1 rounded-md bg-slate-100 p-1"
    >
      {PESTANAS.map((p, i) => {
        const activa = p.valor === actual;
        return (
          <button
            key={p.valor}
            ref={(el) => {
              botones.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`pestana-${p.valor}`}
            aria-selected={activa}
            aria-controls={panelId}
            tabIndex={activa ? 0 : -1}
            onClick={() => onCambiar(p.valor)}
            className={`min-h-11 rounded-md text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              activa ? "bg-red-600 text-white" : "text-slate-700 hover:bg-white"
            }`}
          >
            {p.nombre}
          </button>
        );
      })}
    </div>
  );
}
