import { useId, useState } from "react";
import { NOMBRES_TIPO_PASAJERO } from "../../features/compra/pasajeros";
import type {
  Cotizacion,
  LineaCotizacion,
} from "../../types/compra/cotizacion";
import {
  formatearCentavos,
  formatearPuntosBase,
} from "../../features/compra/dinero";
import { Icono } from "./Icono";

/**
 * Desglose de precios de una cotización (POST /reservas/:id/cotizacion).
 * Recibe el DTO del servidor y solo lo muestra: no suma, no resta, no aplica descuentos
 * ni impuestos. Cada valor sale tal cual de la cotización o de sus líneas.
 * Pensado para reutilizarse en las vistas 5 (KT), 6, 7 y 8 (Ángel) y 13 y 14 (Pablo).
 */
interface PriceBreakdownProps {
  cotizacion: Cotizacion;
  /** Texto de cada línea; por defecto "Tarifa de asiento (Adulto) · U8". */
  etiquetaLinea?: (linea: LineaCotizacion) => string;
  titulo?: string;
  /** En pantallas pequeñas agrega un botón para plegar el desglose. No cambia ningún valor. */
  plegable?: boolean;
}

export function etiquetaPorDefecto(linea: LineaCotizacion) {
  return `Tarifa de asiento (${NOMBRES_TIPO_PASAJERO[linea.tipo_pasajero ?? linea.beneficio_codigo ?? "ADULTO"]}) · ${linea.asiento_codigo}`;
}

const descuento = (centavos: number) =>
  centavos > 0 ? formatearCentavos(-centavos) : "-";

export function PriceBreakdown({
  cotizacion,
  etiquetaLinea = etiquetaPorDefecto,
  titulo = "Detalle de precios",
  plegable = false,
}: PriceBreakdownProps) {
  const id = useId();
  const [abierto, setAbierto] = useState(true);
  const cerrado = plegable && !abierto;
  const { lineas } = cotizacion;
  const iva = `IVA (${formatearPuntosBase(cotizacion.impuesto_bp)})`;
  const recargoVipLineas = lineas.reduce(
    (s, l) => s + (l.recargo_vip_centavos ?? 0),
    0,
  );
  const totalRecargoVip = cotizacion.recargo_vip_centavos ?? recargoVipLineas;
  const tieneRecargoVip = totalRecargoVip > 0;
  const totalNormal =
    cotizacion.tarifa_normal_centavos ??
    Math.max(0, cotizacion.base_centavos - totalRecargoVip);
  const columnas = tieneRecargoVip ? 5 : 4;

  return (
    <section
      aria-labelledby="detalle-precios"
      className="rounded-lg border border-indigo-100 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="detalle-precios"
          className="flex items-center gap-2 text-lg font-bold text-[#08035b]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white">
            <Icono nombre="calculadora" className="h-4 w-4" />
          </span>
          {titulo}
        </h2>
        {plegable && (
          <button
            type="button"
            onClick={() => setAbierto(!abierto)}
            aria-expanded={abierto}
            aria-controls={`${id}-tabla ${id}-lista`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 lg:hidden"
          >
            <Icono nombre={abierto ? "chevronArriba" : "chevronAbajo"} />
            <span className="sr-only">
              {abiertaLabel(abierto, titulo)}
            </span>
          </button>
        )}
      </div>

      <table
        id={`${id}-tabla`}
        className={`mt-3 hidden w-full border-collapse text-sm ${cerrado ? "lg:table" : "sm:table"} [&_thead]:bg-blue-50/70 [&_th]:border [&_th]:border-indigo-100 [&_td]:border [&_td]:border-indigo-100 [&_th]:px-3 [&_td]:px-3`}
      >
        <caption className="sr-only">
          {titulo}, versión {cotizacion.version}, importes en{" "}
          {cotizacion.moneda}
        </caption>
        <thead>
          <tr className="border-b border-indigo-100 text-left text-slate-600">
            <th scope="col" className="py-1.5 font-medium">
              Concepto
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              {tieneRecargoVip ? "Tarifa normal" : "Tarifa"}
            </th>
            {tieneRecargoVip && (
              <th scope="col" className="py-1.5 text-right font-medium">
                Recargo VIP
              </th>
            )}
            <th scope="col" className="py-1.5 text-right font-medium">
              Descuento
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Servicio
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l) => {
            const recargo = l.recargo_vip_centavos ?? 0;
            const esVip = recargo > 0 || l.clase === "VIP" || l.clase === "EJECUTIVO";
            const tarifaNormal = l.tarifa_normal_centavos ?? l.base_centavos;
            return (
              <tr
                key={l.reserva_asiento_id}
                className="border-b border-slate-100"
              >
                <th
                  scope="row"
                  className="py-1.5 text-left font-normal text-slate-800"
                >
                  <span>{etiquetaLinea(l)}</span>
                  {esVip && (
                    <span className="ml-2 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-900">
                      VIP
                    </span>
                  )}
                </th>
                <td className="py-1.5 text-right">
                  {formatearCentavos(tarifaNormal)}
                </td>
                {tieneRecargoVip && (
                  <td
                    className={`py-1.5 text-right ${recargo > 0 ? "font-semibold text-amber-700" : "text-slate-400"}`}
                  >
                    {recargo > 0
                      ? `+ ${formatearCentavos(recargo)}${(l.recargo_vip_pct ?? 0) > 0 ? ` (+${l.recargo_vip_pct}%)` : ""}`
                      : "-"}
                  </td>
                )}
                <td
                  className={`py-1.5 text-right ${l.descuento_centavos > 0 ? "text-green-700" : ""}`}
                >
                  {descuento(l.descuento_centavos)}
                </td>
                <td className="py-1.5 text-right">
                  {formatearCentavos(l.servicio_centavos)}
                </td>
                <td className="py-1.5 text-right font-medium">
                  {formatearCentavos(l.subtotal_neto_centavos)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          {tieneRecargoVip ? (
            <>
              <Fila
                colSpan={columnas}
                etiqueta="Tarifa base (Normal)"
                valor={formatearCentavos(totalNormal)}
              />
              <Fila
                colSpan={columnas}
                etiqueta="Recargo por asiento VIP"
                valor={`+ ${formatearCentavos(totalRecargoVip)}`}
                destacado="text-amber-700 font-semibold"
              />
            </>
          ) : (
            <Fila
              colSpan={columnas}
              etiqueta="Tarifas"
              valor={formatearCentavos(cotizacion.base_centavos)}
            />
          )}
          <Fila
            colSpan={columnas}
            etiqueta="Descuentos"
            valor={descuento(cotizacion.descuento_centavos)}
          />
          <Fila
            colSpan={columnas}
            etiqueta="Tarifa de servicio"
            valor={formatearCentavos(cotizacion.servicio_centavos)}
          />
          <Fila
            colSpan={columnas}
            etiqueta="Subtotal sin IVA"
            valor={formatearCentavos(cotizacion.subtotal_neto_centavos)}
            fuerte
          />
          <Fila
            colSpan={columnas}
            etiqueta={iva}
            valor={formatearCentavos(cotizacion.iva_centavos)}
            fuerte
          />
          <tr className="bg-green-50 text-lg font-bold text-[#08035b]">
            <th scope="row" colSpan={columnas} className="px-2 py-2 text-left">
              Total a pagar
            </th>
            <td className="px-2 py-2 text-right text-xl">
              {formatearCentavos(cotizacion.total_centavos)}
            </td>
          </tr>
        </tfoot>
      </table>

      <dl
        id={`${id}-lista`}
        className={`mt-3 space-y-1 text-sm sm:hidden ${cerrado ? "hidden" : ""}`}
      >
        {lineas.map((l) => {
          const recargo = l.recargo_vip_centavos ?? 0;
          const tarifaNormal = l.tarifa_normal_centavos ?? l.base_centavos;
          return (
            <div
              key={l.reserva_asiento_id}
              className="flex justify-between gap-3"
            >
              <dt className="text-slate-700">
                {etiquetaLinea(l)}
                {recargo > 0 && (
                  <span className="block text-xs font-medium text-amber-700">
                    Base {formatearCentavos(tarifaNormal)} + Recargo VIP
                    {(l.recargo_vip_pct ?? 0) > 0 ? ` (+${l.recargo_vip_pct}%)` : ""}:{" "}
                    {formatearCentavos(recargo)}
                  </span>
                )}
                {l.descuento_centavos > 0 && (
                  <span className="block text-xs text-green-700">
                    Descuento {descuento(l.descuento_centavos)}
                  </span>
                )}
              </dt>
              <dd className="font-semibold">
                {formatearCentavos(l.subtotal_neto_centavos)}
              </dd>
            </div>
          );
        })}
        {tieneRecargoVip && (
          <>
            <Par
              etiqueta="Tarifa base (Normal)"
              valor={formatearCentavos(totalNormal)}
            />
            <Par
              etiqueta="Recargo VIP"
              valor={`+ ${formatearCentavos(totalRecargoVip)}`}
            />
          </>
        )}
        <Par
          etiqueta="Tarifa de servicio"
          valor={formatearCentavos(cotizacion.servicio_centavos)}
        />
        <Par
          etiqueta="Subtotal sin IVA"
          valor={formatearCentavos(cotizacion.subtotal_neto_centavos)}
          borde
        />
        <Par
          etiqueta={iva}
          valor={formatearCentavos(cotizacion.iva_centavos)}
        />
        <div className="flex justify-between rounded-md bg-green-50 px-2 py-2 text-lg font-bold">
          <dt>Total a pagar</dt>
          <dd>{formatearCentavos(cotizacion.total_centavos)}</dd>
        </div>
      </dl>
    </section>
  );
}

function abiertaLabel(abierto: boolean, titulo: string) {
  return `${abierto ? "Contraer" : "Expandir"} ${titulo}`;
}

function Fila({
  etiqueta,
  valor,
  fuerte,
  colSpan = 4,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  fuerte?: boolean;
  colSpan?: number;
  destacado?: string;
}) {
  return (
    <tr className={destacado ?? (fuerte ? "font-semibold" : "text-slate-600")}>
      <th scope="row" colSpan={colSpan} className="py-1 text-left font-[inherit]">
        {etiqueta}
      </th>
      <td className="py-1 text-right">{valor}</td>
    </tr>
  );
}

function Par({
  etiqueta,
  valor,
  borde,
}: {
  etiqueta: string;
  valor: string;
  borde?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${borde ? "border-t border-slate-100 pt-1" : ""}`}
    >
      <dt className="text-slate-700">{etiqueta}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  );
}
