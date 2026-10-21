import { Link, useLocation } from "react-router";

// Destinos temporales: no crean reservas, suben archivos ni registran pagos.
export default function PasoPagoPendiente({ comprobante = false }: { comprobante?: boolean }) {
  const location = useLocation();
  return (
    <section className="mx-auto my-6 w-[calc(100%-24px)] max-w-3xl rounded-lg bg-white p-6">
      <h1 className="text-2xl font-bold text-blue-950">{comprobante ? "Subir comprobante" : "Resumen de compra"}</h1>
      <p className="mt-4 text-slate-600">{comprobante ? "La selección del método y de la cuenta se ha conservado para volver. La vista para adjuntar el comprobante está pendiente de implementar." : "La vista del resumen de compra está pendiente de integrar con la reserva y los pasajeros seleccionados."}</p>
      <p className="mt-3 text-sm text-slate-500">Vista de demostración. No se ha registrado ningún pago ni confirmado una compra.</p>
      <Link to="/pago" state={location.state} className="mt-6 inline-flex min-h-11 items-center rounded-md border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">← Volver al método de pago</Link>
    </section>
  );
}
