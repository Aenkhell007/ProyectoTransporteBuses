export class ErrorEditor extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function exigir(valor: unknown, mensaje: string): asserts valor {
  if (!valor) throw new ErrorEditor(422, mensaje);
}
export function validarBus(b: any) {
  exigir(b && typeof b === 'object', 'Datos del bus inválidos.');
  for (const k of ['unidad', 'chasis', 'carroceria', 'grupoId']) exigir(typeof b[k] === 'string' && b[k].trim().length > 0 && b[k].length <= 100, `Revisa ${k}.`);
  exigir(b.unidad.length <= 30, 'La unidad admite hasta 30 caracteres.');
  exigir(/^[A-Z]{3}-\d{4}$/.test(b.placa), 'La placa debe tener formato ABC-1234.');
  exigir(typeof b.activo === 'boolean' && [1, 2].includes(b.pisos) && Number.isInteger(b.filas) && b.filas > 0 && b.filas <= 30, 'Revisa pisos y filas.');
  exigir(!b.correo || (typeof b.correo === 'string' && b.correo.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.correo)), 'Correo inválido.');
  exigir(typeof b.propietario === 'string' && b.propietario.length <= 200, 'Propietario inválido.');
  exigir(Array.isArray(b.servicios) && b.servicios.length <= 30 && new Set(b.servicios).size === b.servicios.length, 'Servicios inválidos.');
  exigir(Array.isArray(b.fotos) && b.fotos.length <= 6, 'Se permiten seis fotografías.');
  exigir(Array.isArray(b.celdas) && b.celdas.length > 0 && b.celdas.length <= 720, 'El plano está vacío o es demasiado grande.');
  const posiciones = new Set(), codigos = new Set(); let asientos = 0;
  for (const c of b.celdas) {
    exigir(c && Number.isInteger(c.piso) && c.piso >= 1 && c.piso <= b.pisos && Number.isInteger(c.fila) && c.fila >= 1 && c.fila <= b.filas && Number.isInteger(c.columna) && c.columna >= 1 && c.columna <= 12, 'Coordenadas del plano inválidas.');
    const p = `${c.piso}:${c.fila}:${c.columna}`;
    exigir(!posiciones.has(p), 'Hay celdas repetidas.'); posiciones.add(p);
    exigir(['ASIENTO', 'PASILLO', 'BLOQUE'].includes(c.tipo), 'Tipo de celda inválido.');
    if (c.tipo === 'ASIENTO') {
      exigir(typeof c.codigo === 'string' && c.codigo.length > 0 && c.codigo.length <= 20 && !codigos.has(c.codigo) && typeof c.clase_id === 'string', 'Código o clase de asiento inválidos.');
      codigos.add(c.codigo); asientos++;
    } else exigir(c.codigo === null && c.clase_id === null, 'Un pasillo o bloque no tiene código ni clase.');
  }
  exigir(asientos > 0, 'Agrega al menos un asiento.');
}
export function validarGlobal(d: any) {
  exigir(d && d.idioma === 'es-EC' && d.moneda === 'USD' && ['America/Guayaquil', 'Pacific/Galapagos'].includes(d.zonaHoraria), 'Idioma, moneda o zona inválidos.');
  exigir(Number.isInteger(d.sesionHoras) && d.sesionHoras >= 1 && d.sesionHoras <= 24, 'Sesión: entre 1 y 24 horas.');
  exigir(Number.isInteger(d.maxArchivoMB) && d.maxArchivoMB >= 1 && d.maxArchivoMB <= 5, 'Archivo: entre 1 y 5 MB.');
  exigir(Array.isArray(d.formatos) && d.formatos.length > 0 && new Set(d.formatos).size === d.formatos.length && d.formatos.every((t: unknown) => ['JPG', 'PNG', 'PDF'].includes(String(t))), 'Formatos inválidos.');
  exigir(d.mfaAdministradores === false && d.whatsapp === false && typeof d.correo === 'boolean', 'MFA y WhatsApp todavía no están integrados.');
}
export function validarIdentidad(d: any) {
  exigir(d && typeof d === 'object', 'Datos de identidad inválidos.');
  for (const k of ['nombre', 'razonSocial']) exigir(typeof d[k] === 'string' && d[k].trim() && d[k].length <= 200, `Revisa ${k}.`);
  exigir(d.nombre.length <= 150, 'El nombre admite hasta 150 caracteres.');
  exigir(/^\d{13}$/.test(d.ruc), 'El RUC requiere 13 dígitos.');
  exigir(typeof d.email === 'string' && d.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email), 'Correo inválido.');
  for (const k of ['primario', 'secundario', 'texto']) exigir(/^#[0-9a-f]{6}$/i.test(d[k]), 'Color inválido.');
  const canales = [1, 3, 5].map(i => parseInt(d.texto.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminancia = canales[0] * 0.2126 + canales[1] * 0.7152 + canales[2] * 0.0722;
  exigir(1.05 / (luminancia + 0.05) >= 4.5, 'El texto sobre blanco necesita contraste mínimo 4.5:1.');
  for (const k of ['telefono', 'whatsapp']) exigir(typeof d[k] === 'string' && (!d[k] || /^\+[1-9]\d{7,14}$/.test(d[k])), 'Teléfono inválido.');
  for (const k of ['lema', 'direccion', 'facebook', 'instagram']) exigir(typeof d[k] === 'string' && d[k].length <= (k === 'lema' ? 160 : 2000), `Revisa ${k}.`);
  for (const k of ['facebook', 'instagram']) if (d[k]) {
    let u: URL; try { u = new URL(d[k]); } catch { throw new ErrorEditor(422, 'Dirección de red social inválida.'); }
    exigir(u.protocol === 'https:' && !u.username && !u.password && [k + '.com', 'www.' + k + '.com'].includes(u.hostname), 'Red social inválida.');
  }
}
