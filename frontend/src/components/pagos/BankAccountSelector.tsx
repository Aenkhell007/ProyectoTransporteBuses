import { useId, useState } from "react";

export interface BankAccountOption {
  id: string;
  banco: string;
  tipo: string;
  numero: string;
  titular: string;
  ruc: string;
  /** Imagen QR asociada a esta cuenta. Las cuentas demo solo codifican texto. */
  qrSrc?: string;
}

interface BankAccountSelectorProps {
  cuentas: readonly BankAccountOption[];
  seleccionado: string;
  onSeleccionar: (id: string) => void;
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function etiquetaCuenta(cuenta: BankAccountOption) {
  return `${cuenta.banco} · ${cuenta.tipo} · ••••${cuenta.numero.slice(-4)}`;
}

export default function BankAccountSelector({
  cuentas,
  seleccionado,
  onSeleccionar,
}: BankAccountSelectorProps) {
  const id = useId();
  const [busqueda, setBusqueda] = useState("");

  const consulta = normalizar(busqueda);

  const cuentasFiltradas = cuentas.filter((cuenta) =>
    normalizar(`${cuenta.banco} ${cuenta.numero}`).includes(consulta),
  );

  const cuentaActual = cuentas.find((cuenta) => cuenta.id === seleccionado);

  const seleccionFueraDelFiltro =
    cuentaActual !== undefined &&
    !cuentasFiltradas.some((cuenta) => cuenta.id === seleccionado);

  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 font-semibold text-blue-950">
        Selecciona una cuenta de la cooperativa
      </legend>

      <div>
        <label htmlFor={`${id}-busqueda`} className="sr-only">
          Buscar por banco o número de cuenta
        </label>

        <input
          id={`${id}-busqueda`}
          type="search"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por banco o número de cuenta"
          className="w-full rounded-md border border-slate-300 px-3 py-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>

      <div>
        <label htmlFor={`${id}-cuenta`} className="sr-only">
          Cuenta bancaria
        </label>

        <select
          id={`${id}-cuenta`}
          value={seleccionado}
          onChange={(event) => onSeleccionar(event.target.value)}
          disabled={cuentas.length === 0}
          aria-describedby={`${id}-resultado`}
          className="w-full rounded-md border border-blue-500 bg-white px-3 py-3 text-sm text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
        >
          <option value="">Selecciona una cuenta</option>

          {seleccionFueraDelFiltro && cuentaActual && (
            <option value={cuentaActual.id} disabled>
              {etiquetaCuenta(cuentaActual)} — seleccionada
            </option>
          )}

          {cuentasFiltradas.map((cuenta) => (
            <option key={cuenta.id} value={cuenta.id}>
              {etiquetaCuenta(cuenta)}
            </option>
          ))}
        </select>
      </div>

      <p
        id={`${id}-resultado`}
        aria-live="polite"
        className="text-xs text-slate-500"
      >
        {cuentas.length === 0
          ? "No hay cuentas disponibles."
          : consulta
            ? `${cuentasFiltradas.length} coincidencias de ${cuentas.length} cuentas disponibles.`
            : `${cuentas.length} cuentas disponibles.`}
      </p>
    </fieldset>
  );
}
