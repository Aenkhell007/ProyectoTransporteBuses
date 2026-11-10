export class ErrorPago extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function uuid(valor: unknown): string {
  if (
    typeof valor !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      valor,
    )
  ) {
    throw new ErrorPago(422, "La reserva o el recurso indicado no es válido.");
  }
  return valor;
}
export function validarArchivo(
  datos: Buffer,
  mime: string,
  maxBytes: number,
  mimes: string[],
) {
  if (!Buffer.isBuffer(datos) || !datos.length)
    throw new ErrorPago(422, "Selecciona un archivo con contenido.");
  if (datos.length > maxBytes)
    throw new ErrorPago(413, "El comprobante supera el tamaño permitido.");
  const detectado = datos
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "image/png"
    : datos[0] === 255 && datos[1] === 216 && datos[2] === 255
      ? "image/jpeg"
      : datos.subarray(0, 5).toString() === "%PDF-" &&
          datos.subarray(-1024).includes(Buffer.from("%%EOF"))
        ? "application/pdf"
        : null;
  if (!detectado || detectado !== mime || !mimes.includes(mime))
    throw new ErrorPago(
      415,
      "El contenido no corresponde a un JPG, PNG o PDF permitido.",
    );
  return detectado;
}
export function nombreSeguro(valor: unknown): string {
  const nombre = typeof valor === "string" ? valor : "comprobante";
  return (
    nombre
      .normalize("NFKC")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/^\.+/, "")
      .slice(-100) || "comprobante"
  );
}
export function referenciaValida(valor: unknown, obligatoria: boolean) {
  const ref = typeof valor === "string" ? valor.trim() : "";
  if (ref.length > 120 || /[\x00-\x1f]/.test(ref) || (obligatoria && !ref))
    throw new ErrorPago(
      422,
      "Revisa la referencia del comprobante (máximo 120 caracteres).",
    );
  return ref;
}
