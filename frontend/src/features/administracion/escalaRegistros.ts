/** Escala de conteos: etiquetas enteras, crecientes y sin repeticiones. */
export function escalaRegistros(valores: readonly number[]) {
 const maximo=Math.max(0,...valores.filter(Number.isFinite));
 const bruto=Math.max(1,maximo/5),potencia=10**Math.floor(Math.log10(bruto));
 const unidad=bruto/potencia;
 const paso=(unidad<=1?1:unidad<=2?2:unidad<=5?5:10)*potencia;
 const tope=Math.max(paso*5,Math.ceil(maximo/paso)*paso);
 return {tope,paso,marcas:Array.from({length:Math.round(tope/paso)+1},(_,i)=>i*paso)};
}
