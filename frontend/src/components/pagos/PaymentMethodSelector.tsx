import {IconoBiblioteca} from '../ui/IconoBiblioteca';
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
  const valor=metodo.toLowerCase();
  return <IconoBiblioteca nombre={valor==='banco'||valor==='transferencia'?'banco':valor==='oficina'?'oficina':valor==='payphone'?'movil':valor==='paypal'?'paypal':'tarjeta'} className="h-7 w-7"/>;
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
