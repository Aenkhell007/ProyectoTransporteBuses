// Solo se puede volver a rutas conocidas de esta aplicación, nunca a una URL externa.
const rutasPermitidas = new Set([
  '/', '/mi-cuenta', '/viajes', '/pasajeros', '/resumen',
  '/pago', '/pago/comprobante', '/mis-viajes',
]);

export function destinoTrasLogin(origen: unknown) {
  const inicio = { pathname: '/', search: '', hash: '', state: null as unknown };
  if (!origen || typeof origen !== 'object') return inicio;
  const valor = origen as Record<string, unknown>;
  if (typeof valor.pathname !== 'string' || !rutasPermitidas.has(valor.pathname)) return inicio;
  const search = typeof valor.search === 'string' ? valor.search : '';
  const hash = typeof valor.hash === 'string' ? valor.hash : '';
  if ((search && !search.startsWith('?')) || (hash && !hash.startsWith('#')) ||
      /[\\\u0000-\u001f\u007f]/.test(search + hash)) return inicio;
  return { pathname: valor.pathname, search, hash, state: valor.state ?? null };
}
