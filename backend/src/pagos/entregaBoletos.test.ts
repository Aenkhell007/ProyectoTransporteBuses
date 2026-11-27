import test from 'node:test';
import assert from 'node:assert/strict';
import {canalesEntrega,enviarBoletoWhatsApp,entregar,errorEntrega,ErrorWhatsApp,procesarEntregas,dispararEntregas} from './entregaBoletos';
import {ErrorCorreo} from '../auth/brevo';
import {pool} from '../database';
const claves=['BOLETOS_DESDE','BOLETOS_EMAIL_ACTIVO','BOLETOS_WHATSAPP_ACTIVO','BREVO_API_KEY','BREVO_SENDER_EMAIL','WHATSAPP_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_GRAPH_VERSION','WHATSAPP_TEMPLATE_BOLETO','WHATSAPP_TEMPLATE_IDIOMA'];
async function entorno(fn:()=>Promise<void>){const antes=Object.fromEntries(claves.map(k=>[k,process.env[k]]));try{for(const k of claves)delete process.env[k];await fn();}finally{for(const k of claves){if(antes[k]===undefined)delete process.env[k];else process.env[k]=antes[k];}}}
function preparar(){Object.assign(process.env,{BOLETOS_DESDE:'2026-11-16T00:00:00Z',BOLETOS_EMAIL_ACTIVO:'true',BOLETOS_WHATSAPP_ACTIVO:'true',BREVO_API_KEY:'solo-prueba',BREVO_SENDER_EMAIL:'qa@example.invalid',WHATSAPP_TOKEN:'solo-prueba',WHATSAPP_PHONE_NUMBER_ID:'1234567890',WHATSAPP_GRAPH_VERSION:'v99.0',WHATSAPP_TEMPLATE_BOLETO:'boleto_confirmado',WHATSAPP_TEMPLATE_IDIOMA:'es'});}
test('entrega: exige activación explícita, fecha de corte y credenciales completas',()=>entorno(async()=>{assert.deepEqual(canalesEntrega(),{EMAIL:false,WHATSAPP:false});preparar();assert.deepEqual(canalesEntrega(),{EMAIL:true,WHATSAPP:true});delete process.env.BOLETOS_DESDE;assert.deepEqual(canalesEntrega(),{EMAIL:false,WHATSAPP:false});}));
test('correo de boleto adjunta PDF privado e idempotencia sin enviar mensajes reales',()=>entorno(async()=>{preparar();const anterior=globalThis.fetch;globalThis.fetch=(async(url,init)=>{assert.equal(url,'https://api.brevo.com/v3/smtp/email');const b=JSON.parse(String(init?.body));assert.equal(b.to[0].email,'cliente@example.invalid');assert.equal(b.headers.IdempotencyKey,'evento-unico');assert.equal(Buffer.from(b.attachment[0].content,'base64').toString(),'%PDF-prueba');return new Response('{"messageId":"proveedor-1"}',{status:201});}) as typeof fetch;try{assert.equal(await entregar({notificacion_id:'evento-unico',canal:'EMAIL',compra_id:'compra',codigo:'GC-TEST',email:'cliente@example.invalid',telefono:null,archivo_clave:'prueba'},Buffer.from('%PDF-prueba')),'proveedor-1');}finally{globalThis.fetch=anterior;}}));
test('WhatsApp: carga documento y usa plantilla aprobada, sin URL pública ni token en el cuerpo',()=>entorno(async()=>{preparar();let llamadas=0;const peticion=(async(url,init)=>{llamadas++;assert.match(String(url),/^https:\/\/graph.facebook.com\/v99.0\/1234567890\//);if(llamadas===1){assert.ok(init?.body instanceof FormData);return new Response('{"id":"media-1"}',{status:200});}const b=JSON.parse(String(init?.body));assert.equal(b.to,'593991234567');assert.equal(b.type,'template');assert.equal(b.template.components[0].parameters[0].document.id,'media-1');assert.equal(b.template.components[1].parameters[0].text,'GC-TEST');assert.ok(!JSON.stringify(b).includes('solo-prueba'));return new Response('{"messages":[{"id":"wamid-1"}]}',{status:200});}) as typeof fetch;assert.equal(await enviarBoletoWhatsApp('+593991234567',Buffer.from('%PDF'),'GC-TEST',peticion),'wamid-1');assert.equal(llamadas,2);}));
test('resultados ambiguos no se reintentan automáticamente en WhatsApp',()=>{assert.equal(errorEntrega(new Error('timeout')),'RESULTADO_DESCONOCIDO');assert.equal(errorEntrega(new ErrorWhatsApp(500)),'WHATSAPP_RECHAZO_O_RESULTADO_DESCONOCIDO');assert.equal(errorEntrega(new ErrorWhatsApp(429)),'REINTENTABLE');assert.equal(errorEntrega(new ErrorCorreo(503,'unavailable')),'REINTENTABLE');assert.equal(errorEntrega(new ErrorCorreo(400,'duplicate_parameter')),'ACEPTADO_DUPLICADO');});
test('cola desactivada no consulta ni envía; un fallo incierto se registra sin exponer datos',()=>entorno(async()=>{let consultas=0,envios=0;await procesarEntregas({db:{query:async()=>{consultas++;return {rows:[]};}} as any,leer:async()=>Buffer.from('PDF'),enviar:async()=>{envios++;return 'x';}});assert.equal(consultas,0);assert.equal(envios,0);preparar();process.env.BOLETOS_WHATSAPP_ACTIVO='false';let tomada=false;await procesarEntregas({db:{query:async(sql:string,valores:any[])=>{if(sql.includes('reclamar')){if(tomada)return {rows:[]};tomada=true;return {rows:[{notificacion_id:'id',canal:'EMAIL',archivo_clave:'privado'}]};}assert.deepEqual(valores,['id',false,null,'RESULTADO_DESCONOCIDO']);return {rows:[]};}} as any,leer:async()=>Buffer.from('PDF'),enviar:async()=>{throw new Error('destinatario secreto');}});}));

test('una entrega nueva durante un envío programa otro turno sin solapar consultas', (context) => entorno(async () => {
  preparar();
  process.env.BOLETOS_WHATSAPP_ACTIVO = 'false';
  let liberarPrimera!: () => void;
  const primeraConsulta = new Promise<void>((resolve) => {
    liberarPrimera = resolve;
  });
  const consulta = context.mock.method(pool, 'query', async () => {
    await primeraConsulta;
    return { rows: [] };
  });

  try {
    dispararEntregas();
    dispararEntregas();
    dispararEntregas();
    assert.equal(consulta.mock.callCount(), 1);
  } finally {
    liberarPrimera();
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  assert.equal(consulta.mock.callCount(), 2);
}));
