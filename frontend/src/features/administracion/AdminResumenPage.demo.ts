import type { AdminResumenResponse } from "./AdminResumenPage.types";

export const resumenDemo: AdminResumenResponse = {
  kpis: {
    cooperativasActivas: 6,
    usuariosRegistrados: 248,
    oficinistas: 12,
    busesRegistrados: 84,
  },
  tendenciaUsuarios: [
    { fecha: '09 oct', registros: 25 },
    { fecha: '10 oct', registros: 35 },
    { fecha: '11 oct', registros: 30 },
    { fecha: '12 oct', registros: 27 },
    { fecha: '13 oct', registros: 40 },
    { fecha: '14 oct', registros: 33 },
    { fecha: '15 oct', registros: 45 },
  ],
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
