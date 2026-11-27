const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function probar() {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const perfil = {
      id: '11111111-1111-4111-8111-111111111111', nombres: 'Persona', apellidos: 'QA',
      email: 'perfil@example.invalid', tipo_documento: 'OTRO', documento: 'PRUEBA-024',
      telefono: '', nacimiento: null, activo: true, version: 1,
    };
    let guardado = false;
    let estadoSesionTrasGuardar;

    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const { pathname } = new URL(request.url());
      if (pathname === '/api/auth/me') {
        if (guardado) {
          estadoSesionTrasGuardar = 503;
          return route.fulfill({ status: 503, json: { error: 'No se pudo actualizar la sesión de prueba.' } });
        }
        return route.fulfill({ json: { usuario: { ...perfil, roles: ['CLIENTE'] } } });
      }
      if (pathname === '/api/identidad/perfil' && request.method() === 'PUT') {
        guardado = true;
        return route.fulfill({ status: 200, json: { ...perfil, nombres: 'Perfil actualizado', version: 2 } });
      }
      if (pathname === '/api/identidad/perfil') return route.fulfill({ json: perfil });
      return route.fulfill({ status: 404, json: { error: 'Fuera del alcance de la prueba.' } });
    });

    const base = process.env.FRONTEND_TEST_URL || 'http://127.0.0.1:5173';
    await page.goto(new URL('/mi-cuenta', base).href);
    const boton = page.getByRole('button', { name: 'Guardar cambios' });
    await boton.click();
    await page.getByRole('heading', { name: 'Perfil actualizado QA' }).waitFor();
    await boton.waitFor();
    assert.equal(guardado, true, 'El PUT del perfil debe haber respondido correctamente.');
    assert.equal(estadoSesionTrasGuardar, 503, 'La prueba debe simular el fallo posterior de sesión.');
    const avisos = await page.locator('section').first().getByRole('alert').allTextContents();
    const estados = await page.locator('section').first().getByRole('status').allTextContents();
    assert.ok(estados.some((texto) => texto.includes('Datos personales guardados.')),
      'El usuario debe recibir confirmación del guardado exitoso. Avisos observados: ' + JSON.stringify(avisos));
  } finally {
    await browser.close();
  }
}

probar().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
