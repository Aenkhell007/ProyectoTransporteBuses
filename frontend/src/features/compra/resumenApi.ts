import { apiCompra } from "./cliente";
export {
  obtenerReserva as obtenerResumen,
  obtenerBeneficios as obtenerBeneficiosResumen,
  cotizarReserva as recotizar,
  cancelarReserva as cancelarReservaResumen,
} from "./reservaApi";
export const aceptarCotizacion = (id: string, version: number) =>
  apiCompra<void>(`/reservas/${encodeURIComponent(id)}/aceptar-cotizacion`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
