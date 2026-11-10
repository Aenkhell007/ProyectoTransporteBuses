import { AdminResumenResponse } from './AdminResumenPage.types';
import { http } from '../../services/http';

export const fetchAdminResumenData = async (
  desde?: string,
  hasta?: string
): Promise<AdminResumenResponse> => {
  const queryParams = new URLSearchParams();
  if (desde) queryParams.append('desde', desde);
  if (hasta) queryParams.append('hasta', hasta);
  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';

  try {
    const data = await http<AdminResumenResponse>(`/admin/resumen${query}`);
    return data;
  } catch (error: any) {
    const status = error.response?.status || error.status;

    switch (status) {
      case 401:
        throw new Error('401: Sesión expirada. Por favor, vuelve a iniciar sesión.');
      case 403:
        throw new Error('403: No tienes permisos suficientes para acceder a este panel.');
      case 409:
        throw new Error('409: Conflicto en los datos. Intenta actualizar la página.');
      case 422:
        throw new Error('422: Parámetros de fecha inválidos.');
      default:
        throw new Error(error.message || `Error de red o servidor (${status || 'desconocido'})`);
    }
  }
};