import type {
  Ciudad,
  DestinoDestacado,
  SolicitudContacto,
} from "../../types/compra/catalogo";
import { apiCompra } from "./cliente";
export async function obtenerCiudades(): Promise<Ciudad[]> {
  return (await apiCompra<{ data: Ciudad[] }>("/catalogos/ciudades")).data;
}
export async function obtenerDestinosDestacados(): Promise<DestinoDestacado[]> {
  return (await apiCompra<{ data: DestinoDestacado[] }>("/catalogos/destinos"))
    .data;
}
export const enviarContacto = (solicitud: SolicitudContacto) =>
  apiCompra<{ id: string }>("/contacto", {
    method: "POST",
    body: JSON.stringify(solicitud),
  });
