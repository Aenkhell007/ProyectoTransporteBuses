import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  aplicarPuertasEnPlano,
  columnasBanoParaClick,
  detectarBanos,
  detectarPuertas,
  numerarPlanoComercial,
  plantillaEjecutivo,
  plantillaNormal,
} from '../src/features/flota/plantillasPlano.ts';
import {
  inferirTipoPuntoDesdeNombre,
  obtenerLugaresConocidosParroquia,
  obtenerParroquiasPorCanton,
} from '../src/constants/parroquiasEcuador.ts';

test('Normal: 40 asientos en formato ecuatoriano 1V-2P__3P-4V, sin IDs ni códigos repetidos', () => {
  const celdas = plantillaNormal(10, 'clase-normal');
  const asientos = celdas.filter(c => c.tipo === 'ASIENTO');
  assert.equal(asientos.length, 40);
  assert.equal(celdas.filter(c => c.tipo === 'PASILLO').length, 10);
  assert.equal(new Set(asientos.map(c => c.codigo)).size, 40);
  assert.equal(new Set(celdas.map(c => `${c.piso}-${c.fila}-${c.columna}`)).size, 50);
  assert.deepEqual(asientos.slice(0, 4).map(c => c.codigo), ['1V', '2P', '3P', '4V']);
  assert.deepEqual(asientos.slice(4, 8).map(c => c.codigo), ['5V', '6P', '7P', '8V']);
  assert.equal(asientos.at(-1)?.codigo, '40V');
  assert.ok(celdas.filter(c => c.tipo === 'PASILLO').every(c => c.columna === 3 && c.codigo === null && c.clase_id === null));
});

test('Premium: 36 asientos correlativos en 2 pisos (1V..18V y 19V..36V) con pasillo en col 2', () => {
  const celdas = plantillaEjecutivo(6, 'clase-ejecutivo');
  const asientos = celdas.filter(c => c.tipo === 'ASIENTO');
  assert.equal(asientos.length, 36);
  assert.equal(new Set(asientos.map(c => c.codigo)).size, 36);
  assert.deepEqual(asientos.slice(0, 3).map(c => c.codigo), ['1V', '2P', '3V']);
  assert.equal(asientos[17].codigo, '18V');
  assert.equal(asientos[18].codigo, '19V');
  assert.equal(asientos[35].codigo, '36V');
  assert.ok(celdas.filter(c => c.tipo === 'PASILLO').every(c => c.columna === 2));
});

test('Normal: quitar un asiento de fila 1 renumera correlativamente sin saltos ni huecos', () => {
  const original = plantillaNormal(10, 'clase-normal');
  const sinCol4 = original.map(c =>
    c.fila === 1 && c.columna === 4
      ? { ...c, tipo: 'PASILLO' as const, codigo: null, clase_id: null }
      : c,
  );
  const editado = numerarPlanoComercial(sinCol4, 1);
  const asientos = editado.filter(c => c.tipo === 'ASIENTO');
  assert.equal(asientos.length, 39);
  assert.deepEqual(asientos.slice(0, 3).map(c => c.codigo), ['1V', '2P', '3V']);
  assert.deepEqual(asientos.slice(3, 7).map(c => c.codigo), ['4V', '5P', '6P', '7V']);
  assert.equal(asientos.at(-1)?.codigo, '39V');
  assert.equal(original.filter(c => c.tipo === 'ASIENTO').length, 40);
  assert.ok(asientos.every(c => c.clase_id === 'clase-normal'));
});

test('Baño de 2 espacios al final a la derecha: detecta bloque doble y renumera sin F10C3', () => {
  const original = plantillaNormal(10, 'clase-normal');
  const [c1, c2] = columnasBanoParaClick(1, 5);
  assert.deepEqual([c1, c2], [4, 5]);
  const conBano = original.map(c =>
    c.fila === 10 && (c.columna === c1 || c.columna === c2)
      ? { ...c, tipo: 'BLOQUE' as const, codigo: null, clase_id: null }
      : c,
  );
  const final = numerarPlanoComercial(conBano, 1);
  const banos = detectarBanos(final);
  assert.ok(banos.inicios.has('1-10-4'));
  assert.ok(banos.cubiertas.has('1-10-5'));
  const asientos = final.filter(c => c.tipo === 'ASIENTO');
  assert.equal(asientos.length, 38);
  assert.equal(asientos.at(-2)?.codigo, '37V');
  assert.equal(asientos.at(-1)?.codigo, '38P');
  assert.ok(asientos.every(c => !String(c.codigo).startsWith('F')));
});

test('Una plantilla rechaza dimensiones inválidas en vez de generar mapas incompletos', () => {
  for (const generar of [plantillaNormal, plantillaEjecutivo]) {
    for (const filas of [0, -1, 1.5, NaN, 21]) assert.throws(() => generar(filas, 'clase'));
  }
});

test('Puertas urbanas/rurales (2 o 3 puertas): actualiza espacios de 2 columnas y renumera asientos', () => {
  const base = plantillaNormal(10, 'clase-normal');
  const dosPuertas = aplicarPuertasEnPlano(base, 1, 2, 'clase-normal');
  assert.equal(detectarPuertas(dosPuertas).cantidad, 1);
  assert.equal(dosPuertas.filter(c => c.tipo === 'ASIENTO').length, 38);

  const tresPuertas = aplicarPuertasEnPlano(dosPuertas, 1, 3, 'clase-normal');
  assert.equal(detectarPuertas(tresPuertas).cantidad, 2);
  const asientos3P = tresPuertas.filter(c => c.tipo === 'ASIENTO');
  assert.equal(asientos3P.length, 36);
  assert.equal(asientos3P.at(-1)?.codigo, '36P');

  const unaPuerta = aplicarPuertasEnPlano(tresPuertas, 1, 1, 'clase-normal');
  assert.equal(detectarPuertas(unaPuerta).cantidad, 0);
  assert.equal(unaPuerta.filter(c => c.tipo === 'ASIENTO').length, 40);
  assert.equal(unaPuerta.filter(c => c.tipo === 'ASIENTO').at(-1)?.codigo, '40V');
});

test('Parroquias y lugares conocidos: cascada Ambato -> Santa Rosa sugiere puntos emblemáticos', () => {
  const parroquias = obtenerParroquiasPorCanton('Ambato');
  assert.ok(parroquias.includes('Santa Rosa'));
  assert.ok(parroquias.includes('Atahualpa'));

  const lugares = obtenerLugaresConocidosParroquia('Santa Rosa', 'Ambato');
  assert.ok(lugares.includes('Parque Central de Santa Rosa'));
  assert.ok(lugares.includes('Gasolinera de Santa Rosa'));

  assert.equal(inferirTipoPuntoDesdeNombre('Parque Central de Santa Rosa'), 'REFERENCIA');
  assert.equal(inferirTipoPuntoDesdeNombre('Gasolinera de Santa Rosa'), 'REFERENCIA');
  assert.equal(inferirTipoPuntoDesdeNombre('Mercado de Santa Rosa'), 'MERCADO');
});
