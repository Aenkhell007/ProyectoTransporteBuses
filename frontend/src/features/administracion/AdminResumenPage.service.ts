import { ApiError, http } from "../../services/http";
import type { AdminResumenResponse } from "./AdminResumenPage.types";

export async function fetchAdminResumenData(
  desde?: string,
  hasta?: string,
  signal?: AbortSignal,
): Promise<AdminResumenResponse> {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  const query = params.size ? "?" + params : "";

  const data = await http<AdminResumenResponse>("/admin/resumen" + query, { signal });
  if (
    !data?.kpis ||
    !Array.isArray(data.cooperativas) ||
    !Array.isArray(data.usuariosPorRol) ||
    !Array.isArray(data.tendenciaUsuarios)
  ) {
    throw new Error("Respuesta inválida del resumen");
  }
  return data;
}

export function mensajeErrorResumen(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return "Inicia sesión para consultar el resumen.";
      case 403:
        return "No tienes permiso para consultar el resumen.";
      case 404:
        return "El resumen administrativo aún no está disponible en la API.";
      case 409:
        return "Los datos cambiaron. Vuelve a intentar la consulta.";
      case 422:
        return "Los parámetros de la consulta no son válidos.";
    }
  }
  return "No se pudo consultar el resumen administrativo. Inténtalo de nuevo.";
}
