// API simulada y datos sintéticos: complementa las pruebas PostgreSQL con ROLLBACK.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || undefined,headless:true});try{
const page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[],saves=[];page.on('pageerror',e=>errors.push(e.message));
const coops=[{id:'11111111-1111-4111-8111-111111111111',nombre:'Cooperativa A'},{id:'22222222-2222-4222-8222-222222222222',nombre:'Cooperativa B'}];
await page.route('**/api/**',async r=>{const req=r.request(),u=new URL(req.url());let data=null;
if(u.pathname==='/api/auth/me')data={usuario:{id:'33333333-3333-4333-8333-333333333333',nombres:'Admin',apellidos:'Prueba',email:'qa@example.invalid',roles:['ADMIN_SISTEMA']}};
if(u.pathname==='/api/mikel/identidad/ambitos')data={cooperativas:coops};
if(u.pathname==='/api/mikel/identidad'){const c=coops.find(c=>c.id===u.searchParams.get('cooperativaId'));assert.ok(c,'Consulta con ámbito explícito');data={version:1,identidadVersion:1,nombre:c.nombre,razonSocial:c.nombre,ruc:'1234567890001',lema:'',logoUrl:'/images/branding/logo-gran-continental.png',primario:'#ff001c',secundario:'#000099',texto:'#000099',email:'qa@example.invalid',telefono:'',whatsapp:'',direccion:'',facebook:'',instagram:''};if(req.method()==='PUT'){saves.push(c.id);data={...data,...req.postDataJSON().datos,version:2,identidadVersion:2};}}
return r.fulfill({status:data?200:404,json:data??{error:'Fuera de prueba'}});});
await page.goto('http://127.0.0.1:5173/cooperativa/configuracion');
await page.getByLabel('Nombre comercial *',{exact:true}).waitFor();
await page.getByLabel('Cooperativa de configuración').selectOption(coops[1].id);
await page.waitForFunction(()=>document.querySelector('input[value="Cooperativa B"]'));
await page.getByLabel('Lema',{exact:true}).fill('Prueba de ámbito');
await page.getByRole('button',{name:'Guardar configuración',exact:true}).click();
await page.waitForTimeout(500);
assert.deepEqual(saves,[coops[1].id]);assert.deepEqual(errors,[]);
await page.screenshot({path:'tmp/configuracion-ambito-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tmp/configuracion-ambito-mobile.png',fullPage:true});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
console.log('OK: selección y guardado en el ámbito elegido; escritorio y móvil sin errores.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
