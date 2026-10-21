// Valores predeterminados de transporte.politica_comprobantes.
// El backend deberá validar de nuevo el archivo y aplicar la política real.
export const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024;
export const ACCEPT_COMPROBANTE = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";

export interface ComprobanteLocal {
  archivo: File;
  mime: "image/jpeg" | "image/png" | "application/pdf";
}

export async function validarComprobante(archivos: readonly File[]): Promise<ComprobanteLocal> {
  if (archivos.length !== 1) throw new Error("Selecciona un solo comprobante a la vez.");
  const archivo = archivos[0];
  if (archivo.size === 0) throw new Error("El archivo está vacío. Selecciona otro comprobante.");
  if (archivo.size > MAX_COMPROBANTE_BYTES) throw new Error("El comprobante supera los 5 MB permitidos.");
  const extension = archivo.name.split(".").pop()?.toLowerCase();
  const esperado = extension === "jpg" || extension === "jpeg" ? "image/jpeg"
    : extension === "png" ? "image/png" : extension === "pdf" ? "application/pdf" : null;
  if (!esperado) throw new Error("Formato no permitido. Usa JPG, PNG o PDF.");
  if (archivo.type && archivo.type !== esperado && archivo.type !== "application/octet-stream") {
    throw new Error("El tipo del archivo no coincide con su extensión. Selecciona el comprobante original.");
  }
  const cabecera = new Uint8Array(await archivo.slice(0, 8).arrayBuffer());
  const esPng = [137, 80, 78, 71, 13, 10, 26, 10].every((valor, i) => cabecera[i] === valor);
  const esJpg = cabecera[0] === 255 && cabecera[1] === 216 && cabecera[2] === 255;
  const esPdf = [37, 80, 68, 70, 45].every((valor, i) => cabecera[i] === valor);
  if (!(esperado === "image/png" ? esPng : esperado === "image/jpeg" ? esJpg : esPdf)) {
    throw new Error("El contenido no corresponde a un JPG, PNG o PDF válido. No basta con cambiar la extensión.");
  }
  return { archivo, mime: esperado };
}
