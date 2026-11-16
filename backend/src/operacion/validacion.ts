export class ErrorOperacion extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function exigir(valor: unknown, mensaje: string): asserts valor {
  if (!valor) throw new ErrorOperacion(422, mensaje);
}
export function texto(valor: unknown, max = 150) {
  exigir(typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= max && !/[<>\x00-\x1f]/.test(valor), 'Completa los campos de texto con valores válidos.');
  return valor.trim();
}
export function entero(valor: unknown, min = 0, max = 100000000) {
  exigir(typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= min && valor <= max, 'El importe o número indicado no es válido.');
  return valor;
}
export function fecha(valor: unknown) {
  exigir(typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(valor)) && new Date(valor).toISOString().slice(0,10) === valor, 'Selecciona una fecha válida.');
  return valor;
}
export function hora(valor: unknown) {
  exigir(typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor), 'Selecciona una hora válida.');
  return valor;
}
export function rango(desde: unknown, hasta: unknown) {
  const a=fecha(desde), b=fecha(hasta);
  exigir(a <= b && Date.parse(b)-Date.parse(a) <= 30*86400000, 'Consulta un intervalo de hasta 31 días.');
  return {desde:a,hasta:b};
}
export function paradas(valor: unknown) {
  exigir(Array.isArray(valor) && valor.length >= 2 && valor.length <= 30, 'La ruta necesita origen, destino y hasta 28 paradas intermedias.');
  const ids=new Set<string>(); let anterior=-1;
  return valor.map((p: {terminalId?:unknown;minutos?:unknown}, i) => {
    const terminalId=texto(p.terminalId,36), minutos=entero(p.minutos,0,10080);
    exigir(!ids.has(terminalId) && (i===0 ? minutos===0 : minutos>anterior), 'No repitas terminales y usa tiempos crecientes desde el origen (0 minutos).');
    ids.add(terminalId); anterior=minutos; return {terminalId,minutos};
  });
}
export function moneda(valor: unknown) {
  exigir(typeof valor==='string' && /^\d{1,6}(\.\d{1,2})?$/.test(valor), 'Usa un importe en dólares con hasta dos decimales.');
  return entero(Math.round(Number(valor)*100));
}
