import { AdminResumenResponse } from './AdminResumenPage.types';

export const fetchAdminResumenData = async (): Promise<AdminResumenResponse> => {
  try {
    const response = await fetch('/api/admin/resumen');
    if (!response.ok) {
      throw new Error(`Error en el servidor: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // Como el backend de develop aún no implementa el endpoint /api/admin/resumen,
    // retornamos los datos oficiales de la maqueta aprobada para la previsualización del PR #106.
    return {
      kpis: {
        cooperativasActivas: 6,
        usuariosRegistrados: 248,
        oficinistas: 12,
        busesRegistrados: 84,
      },
      tendenciaUsuarios: [
        { fecha: '09 oct', cantidad: 25 },
        { fecha: '10 oct', cantidad: 35 },
        { fecha: '11 oct', cantidad: 30 },
        { fecha: '12 oct', cantidad: 27 },
        { fecha: '13 oct', cantidad: 40 },
        { fecha: '14 oct', cantidad: 33 },
        { fecha: '15 oct', cantidad: 45 },
      ] as any,
      cooperativas: [
        { id: 1, nombre: 'Gran Continental', responsable: 'Ana Torres', buses: 18, estado: 'Activa' },
        { id: 2, nombre: 'Amazonas', responsable: 'Luis Vera', buses: 16, estado: 'Activa' },
        { id: 3, nombre: 'Flota Pelileo', responsable: 'Carlos Mora', buses: 12, estado: 'Activa' },
      ],
      usuariosPorRol: [
        { rol: 'Cliente', cantidad: 220 },
        { rol: 'Oficinista', cantidad: 12 },
        { rol: 'Cooperativa', cantidad: 6 },
        { rol: 'Chofer', cantidad: 9 },
        { rol: 'Administrador', cantidad: 1 },
      ],
    };
  }
};