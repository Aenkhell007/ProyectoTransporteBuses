import {createHash} from 'node:crypto';
import {hostname} from 'node:os';
import {resolve} from 'node:path';
import {pool} from '../database';
import {correoConfigurado,enviarCorreo,ErrorCorreo} from '../auth/brevo';
import {leerArchivo} from './archivos';
export const backendEntregaId=()=>process.env.BACKEND_ID?.trim()||createHash('sha256').update(hostname()+':'+resolve(__dirname,'../..')).digest('hex');
type Canal='EMAIL'|'WHATSAPP';
export type Entrega={notificacion_id:string;canal:Canal;compra_id:string;codigo:string;email:string;telefono:string|null;archivo_clave:string};
export class ErrorWhatsApp extends Error {constructor(public estado:number){super('WhatsApp: HTTP '+estado);}}
export function canalesEntrega(){const corte=process.env.BOLETOS_DESDE;const fecha=!!corte&&/^\d{4}-\d{2}-\d{2}T/.test(corte)&&Number.isFinite(Date.parse(corte));return {
 EMAIL:fecha&&process.env.BOLETOS_EMAIL_ACTIVO==='true'&&correoConfigurado(),
 WHATSAPP:fecha&&process.env.BOLETOS_WHATSAPP_ACTIVO==='true'&&!!process.env.WHATSAPP_TOKEN&&/^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID??'')&&/^v\d+\.\d+$/.test(process.env.WHATSAPP_GRAPH_VERSION??'')&&/^[a-z0-9_]+$/.test(process.env.WHATSAPP_TEMPLATE_BOLETO??'')&&!!process.env.WHATSAPP_TEMPLATE_IDIOMA,
 };}
export async function enviarBoletoWhatsApp(telefono:string,pdf:Buffer,codigo:string,peticion:typeof fetch=fetch){
 if(!/^\+[1-9]\d{7,14}$/.test(telefono))throw new Error('TELEFONO_NO_VALIDO');
 if(!canalesEntrega().WHATSAPP)throw new Error('WHATSAPP_NO_CONFIGURADO');
 const base='https://graph.facebook.com/'+process.env.WHATSAPP_GRAPH_VERSION+'/'+process.env.WHATSAPP_PHONE_NUMBER_ID;
 const headers={Authorization:'Bearer '+process.env.WHATSAPP_TOKEN};const form=new FormData();form.set('messaging_product','whatsapp');form.set('type','application/pdf');form.set('file',new Blob([new Uint8Array(pdf)],{type:'application/pdf'}),'boleto.pdf');
 const upload=await peticion(base+'/media',{method:'POST',headers,body:form,signal:AbortSignal.timeout(15000)});if(!upload.ok)throw new ErrorWhatsApp(upload.status);const media=await upload.json() as {id?:string};if(!media.id)throw new Error('RESPUESTA_DESCONOCIDA');
 const r=await peticion(base+'/messages',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:telefono.slice(1),type:'template',template:{name:process.env.WHATSAPP_TEMPLATE_BOLETO,language:{code:process.env.WHATSAPP_TEMPLATE_IDIOMA},components:[{type:'header',parameters:[{type:'document',document:{id:media.id,filename:'boleto-'+codigo.replace(/[^a-z0-9-]/gi,'')+'.pdf'}}]},{type:'body',parameters:[{type:'text',text:codigo}]}]}}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new ErrorWhatsApp(r.status);const result=await r.json() as {messages?:{id:string}[]};if(!result.messages?.[0]?.id)throw new Error('RESPUESTA_DESCONOCIDA');return result.messages[0].id;
}
export async function entregar(n:Entrega,pdf:Buffer){
 if(n.canal==='WHATSAPP')return enviarBoletoWhatsApp(n.telefono??'',pdf,n.codigo);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email))throw new Error('CORREO_NO_VALIDO');
 const r=await enviarCorreo(n.email,'Tu boleto '+n.codigo+' — Gran Continental','Tu compra está confirmada. Adjuntamos tu boleto PDF con los pasajeros y el QR de identificación. Conserva este documento y presenta tu identificación al viajar.',{idempotencyKey:n.notificacion_id,adjuntos:[{name:'boleto.pdf',content:pdf.toString('base64')}]});return r.messageId;
}
export function errorEntrega(e:unknown){if(e instanceof ErrorCorreo)return e.codigo==='duplicate_parameter'?'ACEPTADO_DUPLICADO':e.estado===429||e.estado>=500?'REINTENTABLE':'PROVEEDOR_RECHAZO';if(e instanceof ErrorWhatsApp)return e.estado===429?'REINTENTABLE':'WHATSAPP_RECHAZO_O_RESULTADO_DESCONOCIDO';return e instanceof Error&&['TELEFONO_NO_VALIDO','CORREO_NO_VALIDO'].includes(e.message)?e.message:'RESULTADO_DESCONOCIDO';}
export async function procesarEntregas(deps={db:pool,leer:leerArchivo,enviar:entregar}){
 const canales=canalesEntrega();for(const canal of ['EMAIL','WHATSAPP'] as const){if(!canales[canal])continue;for(let i=0;i<5;i++){
 const n=(await deps.db.query('SELECT * FROM transporte.reclamar_entrega_boleto($1,$2,$3)',[canal,process.env.BOLETOS_DESDE,backendEntregaId()])).rows[0] as Entrega|undefined;if(!n)break;
 let referencia:string|null=null,error:string|null=null,aceptado=false;try{const pdf=await deps.leer(n.archivo_clave);referencia=await deps.enviar(n,pdf);aceptado=true;}catch(e){error=errorEntrega(e);if(error==='ACEPTADO_DUPLICADO'){aceptado=true;error=null;}}
 await deps.db.query('SELECT transporte.finalizar_entrega_boleto($1,$2,$3,$4)',[n.notificacion_id,aceptado,referencia,error]);
 }}
}
export function iniciarEntregas(){let ocupado=false;const ejecutar=async()=>{if(ocupado)return;ocupado=true;try{await procesarEntregas();}catch{console.error('No se pudo procesar la cola de boletos.');}finally{ocupado=false;}};void ejecutar();const timer=setInterval(()=>void ejecutar(),60000);timer.unref();return()=>clearInterval(timer);}
