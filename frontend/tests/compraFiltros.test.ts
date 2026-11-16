// Vista 2: filtros y orden de los resultados guardados en la URL.
import test from "node:test";
import assert from "node:assert/strict";
import {
  FILTROS_VACIOS,
  aplicarFiltrosEnUrl,
  filtrosDesdeUrl,
  hayFiltrosActivos,
  validarFiltros,
  type FiltrosViajes,
} from "../src/features/compra/filtrosViajes.ts";

const busqueda = () =>
  new URLSearchParams({ origen: "AMBATO", destino: "QUITO", fecha: "2026-11-20", cantidad: "2" });

const filtros: FiltrosViajes = {
  ...FILTROS_VACIOS,
  clase: "EJECUTIVO",
  chasis: "Scania",
  tipo_viaje: "DIRECTO",
  hora: "MANANA",
  precio_min: 1000,
  precio_max: 3000,
  orden: "precio",
};

test("aplicar filtros conserva los criterios de búsqueda", () => {
  const params = aplicarFiltrosEnUrl(busqueda(), filtros);
  for (const [clave, valor] of busqueda()) assert.equal(params.get(clave), valor);
  assert.equal(params.get("chasis"), "Scania");
  assert.equal(params.get("orden"), "precio");
});

test("los filtros escritos en la URL se leen igual (recargar o compartir)", () => {
  assert.deepEqual(filtrosDesdeUrl(aplicarFiltrosEnUrl(busqueda(), filtros)), filtros);
});

test("limpiar todo quita los filtros y recupera los criterios iniciales", () => {
  const conFiltros = aplicarFiltrosEnUrl(busqueda(), filtros);
  const limpia = aplicarFiltrosEnUrl(conFiltros, FILTROS_VACIOS);
  assert.equal(limpia.toString(), busqueda().toString());
  assert.equal(hayFiltrosActivos(filtrosDesdeUrl(limpia)), false);
});

test("un filtro nuevo reemplaza al anterior sin duplicar la clave", () => {
  const primera = aplicarFiltrosEnUrl(busqueda(), { ...FILTROS_VACIOS, chasis: "Scania" });
  const segunda = aplicarFiltrosEnUrl(primera, { ...FILTROS_VACIOS, chasis: "Volvo" });
  assert.deepEqual(segunda.getAll("chasis"), ["Volvo"]);
});

test("el orden por defecto (salida) no se escribe en la URL", () => {
  const params = aplicarFiltrosEnUrl(busqueda(), FILTROS_VACIOS);
  assert.equal(params.has("orden"), false);
});

test("los valores fuera de la lista permitida se ignoran", () => {
  const params = new URLSearchParams({
    clase: "PRIMERA",
    tipo_viaje: "TELETRANSPORTE",
    hora: "MEDIANOCHE",
    orden: "nombre",
    precio_min: "-5",
    precio_max: "12.50",
    chasis: "x".repeat(80),
  });
  const leidos = filtrosDesdeUrl(params);
  assert.equal(leidos.clase, "");
  assert.equal(leidos.tipo_viaje, "");
  assert.equal(leidos.hora, "");
  assert.equal(leidos.orden, "salida");
  assert.equal(leidos.precio_min, null);
  assert.equal(leidos.precio_max, null);
  assert.equal(leidos.chasis.length, 60);
});

test("el precio mínimo no puede ser mayor que el máximo", () => {
  assert.match(validarFiltros({ ...FILTROS_VACIOS, precio_min: 3000, precio_max: 1000 }) ?? "", /mínimo/);
  assert.equal(validarFiltros({ ...FILTROS_VACIOS, precio_min: 2000, precio_max: 2000 }), null);
  assert.equal(validarFiltros({ ...FILTROS_VACIOS, precio_min: 2000 }), null);
});

test("hay filtros activos cuando cambia cualquier filtro o el orden", () => {
  assert.equal(hayFiltrosActivos(FILTROS_VACIOS), false);
  assert.equal(hayFiltrosActivos({ ...FILTROS_VACIOS, orden: "precio" }), true);
  assert.equal(hayFiltrosActivos({ ...FILTROS_VACIOS, carroceria: "Irizar" }), true);
});
