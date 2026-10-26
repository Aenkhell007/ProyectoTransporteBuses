import { useId, useState } from "react";
import type { ReactNode } from "react";
import type {
  AsientoReservado,
  BeneficioVigente,
} from "../../types/compra/reserva";
import {
  LIMITES_PASAJERO,
  TIPOS_DOCUMENTO,
} from "../../features/compra/pasajeros";
import type {
  CampoFicha,
  ErroresFicha,
  FichaPasajero,
} from "../../features/compra/pasajeros";
import { formatearPuntosBase } from "../../features/compra/dinero";
import { edadEnFecha } from "../../features/compra/fechas";
import { ErrorCompra } from "../../features/compra/errores";
import { subirRespaldo } from "../../features/compra/reservaApi";
import { Icono } from "./Icono";

export function nombrePiso(piso: number, pisos: number) {
  if (pisos < 2) return `Piso ${piso}`;
  return piso === 1 ? "Piso inferior" : "Piso superior";
}

interface PassengerFormProps {
  indice: number;
  asiento: AsientoReservado;
  pisosBus: number;
  ficha: FichaPasajero;
  errores: ErroresFicha;
  onCambiar: (ficha: FichaPasajero) => void;
  beneficios: BeneficioVigente[];
  /** Fecha de salida del viaje (YYYY-MM-DD): la edad del beneficio se calcula a esta fecha. */
  fechaSalida: string;
  hoy: string;
  abierta: boolean;
  onAlternar: () => void;
  /** Solo en la ficha del comprador. */
  usarPerfil?: {
    marcado: boolean;
    cargando: boolean;
    onCambiar: (marcado: boolean) => void;
  };
}

const entrada = (error?: string) =>
  `h-11 w-full rounded-md border bg-white px-3 text-[15px] outline-none focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-200 ${error ? "border-red-500" : "border-slate-300"}`;

export function PassengerForm({
  indice,
  asiento,
  pisosBus,
  ficha,
  errores,
  onCambiar,
  beneficios,
  fechaSalida,
  hoy,
  abierta,
  onAlternar,
  usarPerfil,
}: PassengerFormProps) {
  const id = useId();
  const esComprador = indice === 0;
  const [subiendo, setSubiendo] = useState(false);
  const [errorRespaldo, setErrorRespaldo] = useState<string | null>(null);
  const edad =
    ficha.nacimiento && ficha.nacimiento <= hoy
      ? edadEnFecha(ficha.nacimiento, fechaSalida)
      : null;
  const regla = beneficios.find((b) => b.codigo === ficha.beneficio);
  const completa =
    Object.keys(errores).length === 0 &&
    ficha.nombres.trim() !== "" &&
    ficha.documento.trim() !== "";

  const cambiar = <K extends keyof FichaPasajero>(
    campo: K,
    valor: FichaPasajero[K],
  ) => onCambiar({ ...ficha, [campo]: valor });

  const ayuda = (campo: CampoFicha) =>
    errores[campo] ? (
      <p id={`${id}-${campo}-error`} className="mt-1 text-sm text-red-700">
        {errores[campo]}
      </p>
    ) : null;
  const aria = (campo: CampoFicha) => ({
    "aria-invalid": !!errores[campo],
    "aria-describedby": errores[campo] ? `${id}-${campo}-error` : undefined,
  });

  const adjuntar = async (archivo: File | undefined) => {
    if (!archivo) return;
    setErrorRespaldo(null);
    setSubiendo(true);
    try {
      const { archivo_id } = await subirRespaldo(archivo);
      onCambiar({
        ...ficha,
        respaldo_archivo_id: archivo_id,
        respaldo_nombre: archivo.name,
      });
    } catch (e) {
      setErrorRespaldo(
        e instanceof ErrorCompra && e.status === 415
          ? e.message
          : "No pudimos adjuntar el archivo. Inténtalo de nuevo.",
      );
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="rounded-lg border border-slate-200 bg-white"
    >
      <header className="flex flex-wrap items-center gap-3 p-4">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-green-700 font-bold text-white"
        >
          {indice + 1}
        </span>
        <h2 id={`${id}-titulo`} className="text-lg font-bold text-slate-900">
          Pasajero {indice + 1}
          {esComprador && " (Comprador)"}
        </h2>
        <span className="rounded-md bg-green-50 px-2.5 py-1 text-sm font-medium text-green-800">
          Asiento {asiento.codigo} - {nombrePiso(asiento.piso, pisosBus)}
        </span>
        {!abierta && completa && (
          <span className="text-sm text-green-700">
            {ficha.nombres} {ficha.apellidos} · Datos completos
          </span>
        )}
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={abierta}
          aria-controls={`${id}-campos`}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <Icono nombre={abierta ? "chevronArriba" : "chevronAbajo"} />
          <span className="sr-only">
            {abierta ? "Contraer" : "Expandir"} la ficha del pasajero{" "}
            {indice + 1}
          </span>
        </button>
      </header>

      <div
        id={`${id}-campos`}
        hidden={!abierta}
        className="border-t border-slate-100 p-4"
      >
        {usarPerfil && (
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={usarPerfil.marcado}
              disabled={usarPerfil.cargando}
              onChange={(e) => usarPerfil.onCambiar(e.target.checked)}
              className="h-4 w-4 accent-blue-700"
            />
            Usar mis datos de perfil
            {usarPerfil.cargando && (
              <span className="text-slate-500">(cargando…)</span>
            )}
          </label>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Campo id={`${id}-nombres`} etiqueta="Nombres" obligatorio>
            <input
              id={`${id}-nombres`}
              value={ficha.nombres}
              maxLength={LIMITES_PASAJERO.nombres}
              autoComplete={esComprador ? "given-name" : "off"}
              onChange={(e) => cambiar("nombres", e.target.value)}
              className={entrada(errores.nombres)}
              {...aria("nombres")}
            />
            {ayuda("nombres")}
          </Campo>
          <Campo id={`${id}-apellidos`} etiqueta="Apellidos" obligatorio>
            <input
              id={`${id}-apellidos`}
              value={ficha.apellidos}
              maxLength={LIMITES_PASAJERO.apellidos}
              autoComplete={esComprador ? "family-name" : "off"}
              onChange={(e) => cambiar("apellidos", e.target.value)}
              className={entrada(errores.apellidos)}
              {...aria("apellidos")}
            />
            {ayuda("apellidos")}
          </Campo>
          <Campo id={`${id}-tipo`} etiqueta="Tipo de documento" obligatorio>
            <select
              id={`${id}-tipo`}
              value={ficha.tipo_documento}
              onChange={(e) =>
                cambiar(
                  "tipo_documento",
                  e.target.value as FichaPasajero["tipo_documento"],
                )
              }
              className={entrada()}
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo
            id={`${id}-documento`}
            etiqueta="Número de documento"
            obligatorio
          >
            <input
              id={`${id}-documento`}
              value={ficha.documento}
              maxLength={LIMITES_PASAJERO.documento}
              inputMode={ficha.tipo_documento === "CEDULA" ? "numeric" : "text"}
              onChange={(e) => cambiar("documento", e.target.value)}
              className={entrada(errores.documento)}
              {...aria("documento")}
            />
            {ayuda("documento")}
          </Campo>
          <Campo
            id={`${id}-nacimiento`}
            etiqueta="Fecha de nacimiento"
            obligatorio
          >
            <input
              id={`${id}-nacimiento`}
              type="date"
              max={hoy}
              value={ficha.nacimiento}
              onChange={(e) => cambiar("nacimiento", e.target.value)}
              className={entrada(errores.nacimiento)}
              {...aria("nacimiento")}
            />
            {ayuda("nacimiento")}
            {edad !== null && !errores.nacimiento && (
              <p className="mt-1 text-xs text-slate-600">
                Edad el día del viaje: {edad} {edad === 1 ? "año" : "años"}
              </p>
            )}
          </Campo>
          <Campo
            id={`${id}-telefono`}
            etiqueta={
              esComprador
                ? "Teléfono / WhatsApp"
                : "Teléfono / WhatsApp (opcional)"
            }
            obligatorio={esComprador}
          >
            <input
              id={`${id}-telefono`}
              type="tel"
              value={ficha.telefono}
              maxLength={LIMITES_PASAJERO.telefono}
              autoComplete={esComprador ? "tel" : "off"}
              placeholder={
                esComprador ? "+593991234567" : "Teléfono del representante"
              }
              onChange={(e) => cambiar("telefono", e.target.value)}
              className={entrada(errores.telefono)}
              {...aria("telefono")}
            />
            {ayuda("telefono")}
          </Campo>
          <Campo
            id={`${id}-email`}
            etiqueta={
              esComprador
                ? "Correo electrónico"
                : "Correo electrónico (opcional)"
            }
            obligatorio={esComprador}
            ancho
          >
            <input
              id={`${id}-email`}
              type="email"
              value={ficha.email}
              maxLength={LIMITES_PASAJERO.email}
              autoComplete={esComprador ? "email" : "off"}
              placeholder={
                esComprador ? "tu@ejemplo.com" : "Correo del pasajero"
              }
              onChange={(e) => cambiar("email", e.target.value)}
              className={entrada(errores.email)}
              {...aria("email")}
            />
            {ayuda("email")}
          </Campo>

          <fieldset className="md:col-span-2" {...aria("beneficio")}>
            <legend className="mb-1.5 text-sm font-semibold text-slate-800">
              Tipo de pasajero{" "}
              <span className="text-red-600" aria-hidden="true">
                *
              </span>
            </legend>
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <Opcion
                nombre={`${id}-beneficio`}
                valor=""
                actual={ficha.beneficio ?? ""}
                onElegir={() => onCambiar({ ...ficha, beneficio: "" })}
              >
                Adulto
              </Opcion>
              {beneficios.map((b) => (
                <Opcion
                  key={b.codigo}
                  nombre={`${id}-beneficio`}
                  valor={b.codigo}
                  actual={ficha.beneficio ?? ""}
                  deshabilitada={!b.activo}
                  onElegir={() => onCambiar({ ...ficha, beneficio: b.codigo })}
                >
                  {b.nombre}
                  {!b.activo && (
                    <span className="block text-xs text-slate-500">
                      Sin regla vigente
                    </span>
                  )}
                  {b.activo && b.descuento_bp !== null && (
                    <span className="block text-xs text-slate-500">
                      Descuento vigente: {formatearPuntosBase(b.descuento_bp)}
                    </span>
                  )}
                </Opcion>
              ))}
            </div>
            {ayuda("beneficio")}
            {regla?.activo && (
              <p className="mt-2 text-xs text-slate-600">
                {regla.condiciones ??
                  "El beneficio se valida con el documento al abordar."}{" "}
                El descuento lo confirma el sistema en el resumen, con la edad a
                la fecha del viaje.
              </p>
            )}
            {regla?.requiere_respaldo && regla.activo && (
              <div className="mt-3">
                <label
                  htmlFor={`${id}-respaldo`}
                  className="mb-1 block text-sm font-semibold text-slate-800"
                >
                  Documento de respaldo (PDF, JPG o PNG)
                </label>
                <input
                  id={`${id}-respaldo`}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  disabled={subiendo}
                  onChange={(e) => void adjuntar(e.target.files?.[0])}
                  {...aria("respaldo")}
                  className="text-sm"
                />
                {subiendo && (
                  <p role="status" className="mt-1 text-sm text-slate-600">
                    Adjuntando…
                  </p>
                )}
                {ficha.respaldo_nombre && !subiendo && (
                  <p className="mt-1 text-sm text-green-700">
                    Adjuntado: {ficha.respaldo_nombre}
                  </p>
                )}
                {errorRespaldo && (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {errorRespaldo}
                  </p>
                )}
                {ayuda("respaldo")}
              </div>
            )}
          </fieldset>
        </div>

        {!esComprador && (
          <p className="mt-4 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <Icono nombre="info" className="h-4 w-4" /> Registrar un acompañante
            no crea una cuenta.
          </p>
        )}
      </div>
    </section>
  );
}

function Campo({
  id,
  etiqueta,
  obligatorio,
  ancho,
  children,
}: {
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  ancho?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={ancho ? "md:col-span-1" : ""}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-slate-800"
      >
        {etiqueta}{" "}
        {obligatorio && (
          <span className="text-red-600" aria-hidden="true">
            *
          </span>
        )}
        {obligatorio && <span className="sr-only">(obligatorio)</span>}
      </label>
      {children}
    </div>
  );
}

function Opcion({
  nombre,
  valor,
  actual,
  deshabilitada,
  onElegir,
  children,
}: {
  nombre: string;
  valor: string;
  actual: string;
  deshabilitada?: boolean;
  onElegir: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex items-start gap-2 text-sm ${deshabilitada ? "cursor-not-allowed text-slate-400" : "text-slate-800"}`}
    >
      <input
        type="radio"
        name={nombre}
        value={valor}
        checked={actual === valor}
        disabled={deshabilitada}
        onChange={onElegir}
        className="mt-0.5 h-4 w-4 accent-red-600"
      />
      <span>{children}</span>
    </label>
  );
}
