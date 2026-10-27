// Tipos para la Vista 11: Panel de administración
export interface ResumenKPIs {
  cooperativasActivas: number;
  usuariosRegistrados: number;
  oficinistas: number;
  busesRegistrados: number;
}

export interface CooperativaItem {
  id: string | number;
  nombre: string;
  responsable: string;
  buses: number;
  estado: 'Activa' | 'Inactiva';
}

export interface UsuarioRolEstadistica {
  rol: 'Cliente' | 'Oficinista' | 'Cooperativa' | 'Chofer' | 'Administrador';
  cantidad: number;
}

export interface TendenciaUsuarioDia {
  fecha: string;
  registros: number;
}

export interface AdminResumenResponse {
  kpis: ResumenKPIs;
  cooperativas: CooperativaItem[];
  usuariosPorRol: UsuarioRolEstadistica[];
  tendenciaUsuarios: TendenciaUsuarioDia[];
}