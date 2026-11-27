export type Panel = 'admin' | 'oficina' | 'cooperativa' | 'abordaje';
const permisosPanel: Record<Panel,string[]> = {
  abordaje: ['abordaje.registrar'],
  admin: ['identidad.admin','cooperativas.admin','config.global'],
  oficina: ['oficina.vender','pagos.revisar','reembolsos.gestionar'],
  cooperativa: ['flota.admin','operacion.admin','config.admin','tarifas.admin','pagos.configurar'],
};
/** La API sigue validando cada operación y su ámbito. Esto controla la navegación. */
export function accesoPanel(panel:Panel, roles:readonly string[], permisos?:readonly string[]) {
  if (permisos) return permisosPanel[panel].some(p=>permisos.includes(p));
  if (panel === 'abordaje') return roles.some(r => ['ADMIN_SISTEMA', 'COOPERATIVA', 'PERSONAL_BUS'].includes(r));
  return roles.includes('ADMIN_SISTEMA') || (panel==='oficina' ? roles.some(r=>['OFICINISTA','COOPERATIVA'].includes(r)) : panel==='cooperativa' && roles.includes('COOPERATIVA'));
}
