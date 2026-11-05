import type { DatosPago } from "../../../../shared/pagos";
const dinero = (n: number) => `$ ${(n / 100).toFixed(2)}`;
export default function ResumenPago({ datos }: { datos: DatosPago }) {
  const v = datos.viaje,
    q = datos.cotizacion;
  return (
    <div className="mt-3 space-y-4 text-sm text-blue-950">
      <p className="font-semibold">
        {v.origen} → {v.destino}
      </p>
      <p>
        {new Date(v.salida).toLocaleString("es-EC", {
          timeZone: "America/Guayaquil",
        })}
      </p>
      <p>
        {v.terminalOrigen} → {v.terminalDestino}
      </p>
      <p>
        {v.cooperativa} · {v.servicio}
      </p>
      <p>
        Unidad {v.unidad} · Placa {v.placa}
      </p>
      <p>
        Asientos:{" "}
        {datos.pasajeros.map((p) => p.asiento).join(", ") ||
          "Sin pasajeros registrados"}
      </p>
      <h3 className="border-t pt-3 font-bold">Pasajeros</h3>
      {datos.pasajeros.map((p) => (
        <div key={p.asiento} className="flex justify-between gap-2">
          <span>
            {p.nombre}
            <small className="block text-slate-600">
              {p.asiento} · {p.categoria}
            </small>
          </span>
          <span>
            {p.tarifaCentavos === null
              ? "Pendiente"
              : dinero(
                  p.tarifaCentavos -
                    p.descuentoCentavos +
                    p.servicioCentavos +
                    p.ivaCentavos,
                )}
          </span>
        </div>
      ))}
      {q ? (
        <dl className="space-y-2 border-t pt-3">
          <div className="flex justify-between">
            <dt>Tarifa base</dt>
            <dd>{dinero(q.base_centavos)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Descuentos</dt>
            <dd>- {dinero(q.descuento_centavos)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Servicio</dt>
            <dd>{dinero(q.servicio_centavos)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>IVA</dt>
            <dd>{dinero(q.iva_centavos)}</dd>
          </div>
          <div className="flex justify-between rounded bg-green-50 p-2 text-lg font-bold">
            <dt>{datos.compra ? "Total pagado" : "Total a pagar"}</dt>
            <dd>
              {dinero(datos.compra?.totalPagadoCentavos ?? q.total_centavos)}
            </dd>
          </div>
        </dl>
      ) : (
        <p>La reserva todavía no tiene una cotización.</p>
      )}
    </div>
  );
}
