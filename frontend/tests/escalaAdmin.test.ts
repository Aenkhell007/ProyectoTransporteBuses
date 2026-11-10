import test from "node:test";
import assert from "node:assert/strict";
import { escalaRegistros } from "../src/features/administracion/escalaRegistros.ts";
for(const datos of [[],[0],[1],[2,1,0],[25,35,45],[123,88],[9999]])test("eje entero sin duplicados: "+JSON.stringify(datos),()=>{const e=escalaRegistros(datos);assert.equal(e.marcas[0],0);assert.equal(e.marcas.at(-1),e.tope);assert.ok(e.tope>=Math.max(0,...datos));assert.equal(new Set(e.marcas).size,e.marcas.length);assert.ok(e.marcas.every((n,i)=>Number.isInteger(n)&&(i===0||n>e.marcas[i-1])));});
test("la referencia con máximo 45 usa escala 0 a 50",()=>{assert.deepEqual(escalaRegistros([45]).marcas,[0,10,20,30,40,50]);});
