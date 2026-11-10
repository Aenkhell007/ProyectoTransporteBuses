/** Escapa CSV y neutraliza fórmulas cuando los nombres provienen de datos del usuario. */
export function celdaCSV(valor: unknown) {
  const texto=String(valor??'');
  const seguro=/^[=+@-]/.test(texto.trimStart())||/^[\t\r\n]/.test(texto)?"'"+texto:texto;
  return '"'+seguro.replaceAll('"','""')+'"';
}
