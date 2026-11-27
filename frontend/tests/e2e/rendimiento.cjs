// API simulada: cuenta solicitudes y verifica la navegación sin datos reales.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.APP_URL||'http://127.0.0.1:5173';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true});
 try{
  const page=await browser.newPage(),errores=[],conteos={sesion:0,contexto:0};
  page.on('pageerror',e=>errores.push(e.message));
  const scripts=[];page.on('request',r=>{if(r.resourceType()==='script')scripts.push(r.url());});
  const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
  const cooperativas=[{id:a,nombre:'Cooperativa A'},{id:b,nombre:'Cooperativa B'}];
  await page.route('**/api/**',async ruta=>{
   const u=new URL(ruta.request().url());
   if(u.pathname==='/api/auth/me'){
    conteos.sesion++;await new Promise(r=>setTimeout(r,150));
    return ruta.fulfill({json:{usuario:{id:a,nombres:'Prueba',apellidos:'Fluidez',email:'qa@example.invalid',roles:['ADMIN_SISTEMA'],permisos:['config.admin','operacion.admin','cooperativa.leer']}}});
   }
   if(u.pathname==='/api/operacion/contexto'){
    assert.equal(u.searchParams.get('vista'),'resumen','El resumen no debe pedir el contexto completo');conteos.contexto++;await new Promise(r=>setTimeout(r,150));const c=u.searchParams.get('cooperativaId')||a;
    return ruta.fulfill({json:{cooperativa:cooperativas.find(x=>x.id===c),cooperativas,frecuencias:[],grupos:[],buses:[],viajes:[],tarifas:[],beneficios:[],terminales:[],clases:[],impuestos:[],conductores:[],indisponibilidades:[],permisos:{operacion:true,tarifas:true}}});
   }
   return ruta.fulfill({status:404,json:{error:'Fuera de prueba'}});
  });
  await page.goto(base+'/cooperativa');
  await page.getByRole('heading',{name:'Panel de la cooperativa',exact:true}).waitFor();
  await page.waitForURL(u=>u.searchParams.get('cooperativaId')===a);
  await page.waitForTimeout(350);
  assert.deepEqual(conteos,{sesion:1,contexto:1},'StrictMode y sincronizar URL no deben duplicar consultas');
  const fecha=page.locator('input[type="date"]').first();
  const anterior=new Date(Date.parse((await fecha.inputValue())+'T12:00:00Z')-86400000).toISOString().slice(0,10);
  const recarga=page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/api/operacion/contexto'&&u.searchParams.get('desde')===anterior;});
  await fecha.fill(anterior);const respuesta=await recarga;
  assert.equal(new URL(respuesta.url()).searchParams.get('cooperativaId'),a,'Al cambiar fecha debe conservar el ámbito resuelto');
  await respuesta.finished();
  assert.equal(conteos.contexto,2);
  await page.getByLabel('Cooperativa de operación').selectOption(b);
  await page.getByText('Organiza los buses y las salidas de Cooperativa B',{exact:true}).waitFor();
  assert.equal(conteos.contexto,3,'Cambiar de ámbito requiere datos nuevos');
  assert.deepEqual(errores,[]);
  assert.ok(!scripts.some(u=>/VentaOficinaReal|ReembolsosReal|ReportesAuditoria/.test(u)),'No descargar pantallas ajenas al resumen');
  console.log('OK: una consulta de sesión y contexto al entrar; cambio de cooperativa fresco y sin errores.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
