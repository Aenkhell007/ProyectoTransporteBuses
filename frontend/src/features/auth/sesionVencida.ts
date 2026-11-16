/** Invalida también el estado de React cuando una API confirma que expiró la cookie. */
export function avisarSesionVencida(status:number){
  if(status===401&&typeof window!=='undefined')window.dispatchEvent(new Event('transporte:sesion-vencida'));
}
