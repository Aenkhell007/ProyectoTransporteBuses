// Solo se puede volver a rutas conocidas de esta aplicación, nunca a una URL externa.
const rutasPermitidas = new Set([
  '/', '/asientos', '/mi-cuenta', '/viajes', '/pasajeros', '/resumen',
  '/pago', '/pago/comprobante', '/pago/seguimiento', '/pago/confirmacion', '/pago/payphone/respuesta', '/mis-viajes', '/mis-viajes/reembolso',
]);

export function destinoTrasLogin(origen: unknown, roles: readonly string[] = []) {
  const pathname = roles.includes('ADMIN_SISTEMA') ? '/panel'
    : roles.includes('OFICINISTA') ? '/oficina'
    : roles.includes('COOPERATIVA') ? '/cooperativa'
    : roles.includes('PERSONAL_BUS') ? '/abordaje' : '/';
  const inicio = { pathname, search: '', hash: '', state: null as unknown };
  if (!origen || typeof origen !== 'object') return inicio;
  const valor = origen as Record<string, unknown>;
  if (typeof valor.pathname !== 'string') return inicio;
  const admin=roles.includes('ADMIN_SISTEMA'),coop=admin||roles.includes('COOPERATIVA'),oficina=coop||roles.includes('OFICINISTA');
  const panelPermitido = admin && /^\/panel(?:\/(?:cooperativas(?:\/nueva)?|usuarios(?:\/nuevo)?|accesos|reportes|configuracion(?:\/(?:global|pagos))?))?$/.test(valor.pathname)
    || coop && /^\/cooperativa(?:\/(?:buses(?:\/(?:nuevo|[0-9a-f-]{36}))?|grupos|frecuencias(?:\/grupos)?|hoja-ruta|configuracion(?:\/(?:pagos|tarifas(?:\/politica)?|politica-reembolso))?))?$/.test(valor.pathname)
    || oficina && /^\/oficina(?:\/(?:ventas|reservas|reembolsos|comprobantes(?:\/[0-9a-f-]{36})?))?$/.test(valor.pathname);
  if (!rutasPermitidas.has(valor.pathname) && !panelPermitido && valor.pathname !== '/abordaje') return inicio;
  const search = typeof valor.search === 'string' ? valor.search : '';
  const hash = typeof valor.hash === 'string' ? valor.hash : '';
  if ((search && !search.startsWith('?')) || (hash && !hash.startsWith('#')) ||
      /[\\\u0000-\u001f\u007f]/.test(search + hash)) return inicio;
  return { pathname: valor.pathname, search, hash, state: valor.state ?? null };
}
