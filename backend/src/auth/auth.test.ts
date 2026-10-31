import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password";
import { cedulaValida, leerCredenciales, leerRegistro } from "./validation";
import { enlaceRecuperacion, enviarCorreo } from "./brevo";

test("scrypt compatible: acepta contraseña correcta y rechaza otra",async()=>{
  const hash=await hashPassword("Prueba-exclusiva-123");
  assert.match(hash,/^scrypt-v1\$16384\$8\$1\$/);
  assert.equal(await verifyPassword("Prueba-exclusiva-123",hash),true);
  assert.equal(await verifyPassword("incorrecta",hash),false);
  assert.equal(await verifyPassword("x","hash-invalido"),false);
});
test("normaliza el correo y rechaza entradas incompletas",()=>{
  assert.equal(leerCredenciales({email:" DEMO@example.com ",password:"algo"}).email,"demo@example.com");
  assert.throws(()=>leerCredenciales({}));assert.throws(()=>leerCredenciales({email:"mal",password:"algo"}));
});
test("registro requiere documento, consentimiento y contraseña suficiente",()=>{
  const datos={email:"demo@example.com",password:"Prueba-123",nombres:"Demo",apellidos:"Prueba",tipoDocumento:"OTRO",documento:"DEMO-001",aceptaTerminos:true};
  assert.equal(leerRegistro(datos).documento,"DEMO-001");
  assert.throws(()=>leerRegistro({...datos,aceptaTerminos:false}));assert.throws(()=>leerRegistro({...datos,password:"123"}));
  assert.equal(cedulaValida("0000000000"),false);
});
test("enlace de recuperación conserva token en fragmento y no query",()=>{
  const anterior=process.env.FRONTEND_URL;
  process.env.FRONTEND_URL="http://127.0.0.1:5173";
  try {const u=new URL(enlaceRecuperacion("a".repeat(43)));assert.equal(u.pathname,"/restablecer-contrasena");assert.equal(u.search,"");assert.equal(u.hash,"#token="+"a".repeat(43));}
  finally {if(anterior===undefined)delete process.env.FRONTEND_URL;else process.env.FRONTEND_URL=anterior;}
});
test("Brevo usa destinatario y cabecera correctos sin enviar correo real",async()=>{
  const anterior=globalThis.fetch;const key=process.env.BREVO_API_KEY;const sender=process.env.BREVO_SENDER_EMAIL;
  process.env.BREVO_API_KEY="test-key";process.env.BREVO_SENDER_EMAIL="remitente@example.com";
  globalThis.fetch=(async(url:unknown,init:RequestInit)=>{assert.equal(url,"https://api.brevo.com/v3/smtp/email");assert.equal((init.headers as Record<string,string>)["api-key"],"test-key");const body=JSON.parse(String(init.body));assert.equal(body.to[0].email,"destino@example.com");return new Response('{"messageId":"test"}',{status:201});}) as typeof fetch;
  try {await enviarCorreo("destino@example.com","Prueba","Contenido");}
  finally {globalThis.fetch=anterior;if(key===undefined)delete process.env.BREVO_API_KEY;else process.env.BREVO_API_KEY=key;if(sender===undefined)delete process.env.BREVO_SENDER_EMAIL;else process.env.BREVO_SENDER_EMAIL=sender;}
});

 test("registro valida teléfono ecuatoriano y conserva el número",()=>{
 const datos={email:"demo@example.com",password:"Prueba-123",nombres:"Demo",apellidos:"Prueba",tipoDocumento:"OTRO",documento:"DEMO-001",aceptaTerminos:true};
 assert.equal(leerRegistro({...datos,telefono:"+593991234567"}).telefono,"+593991234567");
 assert.throws(()=>leerRegistro({...datos,telefono:"+5930991234567"}));
 assert.throws(()=>leerRegistro({...datos,telefono:"abc"}));
 });
