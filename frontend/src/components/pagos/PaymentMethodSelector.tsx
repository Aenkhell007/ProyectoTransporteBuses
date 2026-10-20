import { useId } from "react";

export interface PaymentMethodOption {
  id: string;
  nombre: string;
  habilitado: boolean;
  mensaje?: string;
}

interface PaymentMethodSelectorProps {
  metodos: readonly PaymentMethodOption[];
  seleccionado: string;
  onSeleccionar: (id: string) => void;
}

function PaymentMethodIcon({ metodo }: { metodo: string }) {
  const svgProps = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className: "shrink-0",
  };

  switch (metodo) {
    case "transferencia":
      return (
        <svg {...svgProps}>
          <path d="m3 8 9-5 9 5H3Z" />
          <path d="M5 10v7M10 10v7M14 10v7M19 10v7" />
          <path d="M3 20h18M4 17h16" />
        </svg>
      );

    case "oficina":
      return (
        <svg {...svgProps}>
          <rect x="5" y="3" width="14" height="16" rx="3" />
          <path d="M5 8h14M5 13h14M9 3v5M15 3v5" />
          <path d="M7 19v2M17 19v2" />
          <circle cx="8.5" cy="16" r=".7" />
          <circle cx="15.5" cy="16" r=".7" />
        </svg>
      );

    case "payphone":
      return (
        <svg {...svgProps}>
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M10 5h4M10 19h4" />
        </svg>
      );

    case "paypal":
      return (
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-3xl font-black italic"
        >
          P
        </span>
      );

    default:
      return (
        <svg {...svgProps}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 9h20M6 14h3M6 16h5" />
        </svg>
      );
  }
}

export default function PaymentMethodSelector({
  metodos,
  seleccionado,
  onSeleccionar,
}: PaymentMethodSelectorProps) {
  const grupoId = useId();

  return (
    <fieldset>
      <legend className="sr-only">Métodos de pago disponibles</legend>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-5">
        {metodos.map((metodo) => {
          const elegido = seleccionado === metodo.id;

          const estilo = !metodo.habilitado
            ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
            : elegido
              ? "cursor-pointer border-red-600 bg-white text-blue-900"
              : "cursor-pointer border-slate-200 bg-white text-blue-900 hover:border-red-400";

          return (
            <label
              key={metodo.id}
              className={`
                relative flex min-h-12 min-w-0 items-center gap-3
                rounded-md border px-3 py-3
                focus-within:ring-2 focus-within:ring-red-500
                focus-within:ring-offset-2
                lg:min-h-28 lg:flex-col lg:justify-center
                lg:gap-2 lg:text-center
                ${estilo}
              `}
            >
              <input
                type="radio"
                name={grupoId}
                value={metodo.id}
                checked={elegido}
                disabled={!metodo.habilitado}
                onChange={() => onSeleccionar(metodo.id)}
                className="sr-only"
              />

              <PaymentMethodIcon metodo={metodo.id} />

              <span className="flex min-w-0 flex-col items-start gap-1 lg:items-center">
                <span className="text-xs leading-5">{metodo.nombre}</span>

                {!metodo.habilitado && (
                  <span className="rounded bg-slate-100 px-2 py-1 text-[10px] leading-4">
                    {metodo.mensaje ?? "Próximamente"}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
