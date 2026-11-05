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
}

export function etiquetaPorDefecto(linea: LineaCotizacion) {
  return `Tarifa de asiento (${linea.beneficio_nombre ?? "Adulto"}) · ${linea.asiento_codigo}`;
}

const descuento = (centavos: number) =>
  centavos > 0 ? formatearCentavos(-centavos) : "-";

export function PriceBreakdown({
  cotizacion,
  etiquetaLinea = etiquetaPorDefecto,
  titulo = "Detalle de precios",
}: PriceBreakdownProps) {
  const { lineas } = cotizacion;
  const iva = `IVA (${formatearPuntosBase(cotizacion.impuesto_bp)})`;

  return (
    <section
      aria-labelledby="detalle-precios"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2
        id="detalle-precios"
        className="flex items-center gap-2 text-lg font-bold text-slate-900"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white">
          <Icono nombre="calculadora" className="h-4 w-4" />
        </span>
        {titulo}
      </h2>

      <table className="mt-3 hidden w-full text-sm sm:table">
        <caption className="sr-only">
          {titulo}, versión {cotizacion.version}, importes en{" "}
          {cotizacion.moneda}
        </caption>
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-600">
            <th scope="col" className="py-1.5 font-medium">
              Concepto
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Tarifa
            </th>
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
          {lineas.map((l) => (
            <tr
              key={l.reserva_asiento_id}
              className="border-b border-slate-100"
            >
              <th
                scope="row"
                className="py-1.5 text-left font-normal text-slate-800"
              >
                {etiquetaLinea(l)}
              </th>
              <td className="py-1.5 text-right">
                {formatearCentavos(l.base_centavos)}
              </td>
              <td
                className={`py-1.5 text-right ${l.descuento_centavos > 0 ? "text-green-700" : ""}`}
              >
                {descuento(l.descuento_centavos)}
              </td>
              <td className="py-1.5 text-right">
                {formatearCentavos(l.servicio_centavos)}
              </td>
              <td className="py-1.5 text-right">
                {formatearCentavos(l.subtotal_neto_centavos)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <Fila
            etiqueta="Tarifas"
            valor={formatearCentavos(cotizacion.base_centavos)}
          />
          <Fila
            etiqueta="Descuentos"
            valor={descuento(cotizacion.descuento_centavos)}
          />
          <Fila
            etiqueta="Tarifa de servicio"
            valor={formatearCentavos(cotizacion.servicio_centavos)}
          />
          <Fila
            etiqueta="Subtotal sin IVA"
            valor={formatearCentavos(cotizacion.subtotal_neto_centavos)}
            fuerte
          />
          <Fila
            etiqueta={iva}
            valor={formatearCentavos(cotizacion.iva_centavos)}
            fuerte
          />
          <tr className="bg-green-50 text-lg font-bold text-slate-900">
            <th scope="row" colSpan={4} className="px-2 py-2 text-left">
              Total a pagar
            </th>
            <td className="px-2 py-2 text-right text-xl">
              {formatearCentavos(cotizacion.total_centavos)}
            </td>
          </tr>
        </tfoot>
      </table>

      <dl className="mt-3 space-y-1 text-sm sm:hidden">
        {lineas.map((l) => (
          <div
            key={l.reserva_asiento_id}
            className="flex justify-between gap-3"
          >
            <dt className="text-slate-700">
              {etiquetaLinea(l)}
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
        ))}
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

function Fila({
  etiqueta,
  valor,
  fuerte,
}: {
  etiqueta: string;
  valor: string;
  fuerte?: boolean;
}) {
  return (
    <tr className={fuerte ? "font-semibold" : "text-slate-600"}>
      <th scope="row" colSpan={4} className="py-1 text-left font-[inherit]">
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
