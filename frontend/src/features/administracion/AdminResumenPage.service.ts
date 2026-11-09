import { AdminResumenResponse } from './AdminResumenPage.types';

// ruta base definida para el proxy o entorno de Vite (/api)
const API_BASE_URL = '/api/admin';

export const fetchAdminResumenData = async (
  desde?: string,
  hasta?: string
): Promise<AdminResumenResponse> => {
  const queryParams = new URLSearchParams();
  if (desde) queryParams.append('desde', desde);
  if (hasta) queryParams.append('hasta', hasta);

  const response = await fetch(`${API_BASE_URL}/resumen?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    // credentials: 'include' asegura que se envíen las cookies de sesión del login actual
    credentials: 'include',
  });

  if (!response.ok) {
    switch (response.status) {
      case 401:
        throw new Error('401: Sesión expirada. Por favor, vuelve a iniciar sesión.');
      case 403:
        throw new Error('403: No tienes permisos suficientes para acceder a este panel.');
      case 409:
        throw new Error('409: Conflicto en los datos. Intenta actualizar la página.');
      case 422:
        throw new Error('422: Parámetros de fecha inválidos.');
      default:
        throw new Error(`Error de red o servidor (${response.status})`);
    }
  }

  return await response.json();
};