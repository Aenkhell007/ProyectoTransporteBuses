import {http} from '../../services/http';
export type Parada={terminalId:string;minutos:number;orden:number;ciudad:string;terminal:string};
export type Frecuencia={id:string;codigo:string;hora:string;resolucion:string;tipo:'DIRECTO'|'CON_PARADAS';activa:boolean;version:number;ruta_id:string;ruta:string;paradas:Parada[];grupos:string[];usada:boolean};
export type Bus={id:string;unidad:string;placa:string;grupo_id:string;activo:boolean;plano_id:string|null};
export type Grupo={id:string;nombre:string;activo:boolean;descanso:number[]};
export type Viaje={id:string;frecuencia_id:string;bus_id:string;plano_id:string;conductor_id:string|null;estado:string;version:number;salida:string;llegada:string;liberacion_bus:string;fecha:string;hora:string};
export type Tarifa={id?:string;frecuencia_id?:string;grupo_id:string;clase_id:string;origen_orden:number;destino_orden:number;precio:number;servicio:number;impuesto_id:string;impuesto_servicio_id:string|null;desde:string;hasta:string|null;activa?:boolean};
export type Beneficio={id?:string;codigo:string;nombre:string;descuento_bp:number|null;edad_min:number|null;edad_max_exclusiva:number|null;condiciones:string;activo:boolean;desde:string;hasta:string|null;revision?:string};
export type Asignacion={id?:string;version?:number;fecha:string;frecuenciaId:string;busId:string;conductorId?:string;salida?:string;llegada?:string;liberacion?:string};
export type ContextoOperacion={cooperativa:{id:string;nombre:string};cooperativas:{id:string;nombre:string}[];frecuencias:Frecuencia[];grupos:Grupo[];buses:Bus[];viajes:Viaje[];tarifas:Tarifa[];beneficios:Beneficio[];terminales:{id:string;nombre:string;ciudad:string}[];clases:{id:string;nombre:string;codigo:string}[];impuestos:{id:string;nombre:string;puntos_base:number;concepto:string}[];conductores:{id:string;nombre:string}[];indisponibilidades:{bus_id:string;desde:string;hasta:string;motivo:string}[];permisos:{operacion:boolean;tarifas:boolean}};
export const hoy=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Guayaquil'});
export const sumarDias=(fecha:string,n:number)=>new Date(Date.parse(fecha+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
export function urlOperacion(ruta:string,cooperativaId:string){return '/operacion/'+ruta+'?cooperativaId='+encodeURIComponent(cooperativaId);}
export const consultar=(coop:string,desde:string,hasta:string)=>http<ContextoOperacion>(urlOperacion('contexto',coop)+'&desde='+desde+'&hasta='+hasta);
export function guardarOperacion<T={mensaje:string}>(ruta:string,coop:string,body:unknown,method='PUT'){return http<T>(urlOperacion(ruta,coop),{method,body:JSON.stringify(body)});}
