import test from "node:test";
import assert from "node:assert/strict";
import { correoActivacion,correoBienvenida,correoRecuperacion } from "./correos";
import { enlaceActivacion,enviarCorreo,ErrorCorreo } from "./brevo";

test("activación usa fragmento y texto formal con HTML escapado",()=>{
  const enlace=enlaceActivacion("a".repeat(43));
  assert.equal(new URL(enlace).pathname,"/activar-cuenta");
  assert.equal(new URL(enlace).search,"");
  const c=correoActivacion('<script>alert("x")</script>',enlace);
  assert.match(c.htmlContent,/&lt;script&gt;/);assert.doesNotMatch(c.htmlContent,/<script>/);
  assert.match(c.textContent,/60 minutos/);assert.match(c.htmlContent,/Activar mi cuenta/);
  assert.match(c.textContent,/Una vez activada/);
});
test("bienvenida solo confirma activación y recuperación tiene su propio vencimiento",()=>{
  assert.match(correoBienvenida("Demo","https://example.com/iniciar-sesion").textContent,/cuenta.*activada/);
  assert.match(correoRecuperacion("https://example.com/restablecer").textContent,/30 minutos/);
});
test("envía HTML y clave de idempotencia, y conserva referencia de aceptación",async()=>{
  const fetchAnterior=globalThis.fetch,key=process.env.BREVO_API_KEY,sender=process.env.BREVO_SENDER_EMAIL;
  process.env.BREVO_API_KEY="prueba";process.env.BREVO_SENDER_EMAIL="demo@example.com";
  globalThis.fetch=(async(_url:unknown,init:RequestInit)=>{
    const b=JSON.parse(String(init.body));assert.equal(b.htmlContent,"<p>Correo</p>");assert.equal(b.headers.IdempotencyKey,"uuid-prueba");
    return new Response('{"messageId":"referencia-prueba"}',{status:201});
  }) as typeof fetch;
  try {assert.equal((await enviarCorreo("demo@example.com","Asunto","Correo",{htmlContent:"<p>Correo</p>",idempotencyKey:"uuid-prueba"})).messageId,"referencia-prueba");
    globalThis.fetch=(async()=>new Response('{"code":"permission_denied","message":"dato privado que no debe registrarse"}',{status:403})) as typeof fetch;
    await assert.rejects(enviarCorreo("demo@example.com","Asunto","Correo"),(e:unknown)=> e instanceof ErrorCorreo && e.estado===403 && e.codigo==="permission_denied" && !e.message.includes("privado"));
  } finally {globalThis.fetch=fetchAnterior;if(key===undefined)delete process.env.BREVO_API_KEY;else process.env.BREVO_API_KEY=key;if(sender===undefined)delete process.env.BREVO_SENDER_EMAIL;else process.env.BREVO_SENDER_EMAIL=sender;}
});
