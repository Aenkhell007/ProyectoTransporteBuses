import type { Cotizacion } from "../../types/compra/cotizacion";
import type {
  BeneficioVigente,
  PasajeroDatos,
  PerfilComprador,
  ReservaCreada,
  ReservaPendiente,
  SolicitudPasajeros,
  SolicitudReserva,
} from "../../types/compra/reserva";
import { apiCompra } from "./cliente";
export const reservarAsientos = (solicitud: SolicitudReserva) =>
  apiCompra<ReservaCreada>("/reservas", {
    method: "POST",
    body: JSON.stringify(solicitud),
  });
export const obtenerReserva = (id: string) =>
  apiCompra<ReservaPendiente>(`/reservas/${encodeURIComponent(id)}/resumen`);
export const obtenerPerfil = () => apiCompra<PerfilComprador>("/compra/perfil");
export async function obtenerBeneficios(
  reservaId: string,
): Promise<BeneficioVigente[]> {
  return (
    await apiCompra<{ data: BeneficioVigente[] }>(
      `/reservas/${encodeURIComponent(reservaId)}/beneficios`,
    )
  ).data;
}
export async function guardarPasajeros(
  id: string,
  solicitud: SolicitudPasajeros,
): Promise<PasajeroDatos[]> {
  return (
    await apiCompra<{ data: PasajeroDatos[] }>(
      `/reservas/${encodeURIComponent(id)}/pasajeros`,
      { method: "PUT", body: JSON.stringify(solicitud) },
    )
  ).data;
}
export const cotizarReserva = (id: string) =>
  apiCompra<Cotizacion>(`/reservas/${encodeURIComponent(id)}/cotizacion`, {
    method: "POST",
  });
export const cancelarReserva = (id: string) =>
  apiCompra<void>(`/reservas/${encodeURIComponent(id)}`, { method: "DELETE" });
export const subirRespaldo = (archivo: File, reservaId: string) =>
  apiCompra<{ archivo_id: string }>(
    `/reservas/${encodeURIComponent(reservaId)}/respaldos`,
    {
      method: "POST",
      headers: {
        "Content-Type": archivo.type,
        "X-File-Name": encodeURIComponent(archivo.name),
      },
      body: archivo,
    },
  );

export const cambiarAsientos = (id: string, version: number, asiento_ids: string[]) =>
  apiCompra<ReservaPendiente>(`/reservas/${encodeURIComponent(id)}/asientos`, {
    method: "PUT", body: JSON.stringify({ version, asiento_ids }),
  });
