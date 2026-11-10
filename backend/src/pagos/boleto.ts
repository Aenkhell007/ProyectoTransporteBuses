import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { DatosPago } from "../../../shared/pagos";

const dinero = (n: number) => `$ ${(n / 100).toFixed(2)}`;
const texto = (valor: unknown) =>
  String(valor ?? "").replace(/[\x00-\x1f]/g, " ");
export async function generarBoleto(datos: DatosPago): Promise<Buffer> {
  if (
    !datos.compra ||
    datos.compra.estado !== "CONFIRMADA" ||
    !datos.documento ||
    !datos.cotizacion
  )
    throw new Error("Compra no emitible");
  const qr = await QRCode.toBuffer(datos.documento.qrId, {
    width: 240,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  const doc = new PDFDocument({
    size: "A4",
    margin: 42,
    info: { Title: "Boleto de compra", Author: datos.viaje.cooperativa },
  });
  const partes: Buffer[] = [];
  const terminado = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c) => partes.push(c));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
  });
  doc
    .fillColor("#08035b")
    .fontSize(22)
    .text(texto(datos.viaje.cooperativa), 42, 42, { width: 370 });
  doc
    .fontSize(15)
    .text("Boleto de compra confirmada", 42, doc.y + 10, { width: 370 });
  doc
    .fontSize(10)
    .text(`Código: ${datos.compra.codigo}`, 42, doc.y + 12, { width: 370 });
  doc.image(qr, 440, 40, { width: 110 });
  doc.y = Math.max(doc.y + 20, 170);
  const v = datos.viaje;
  for (const linea of [
    `${v.origen} - ${v.destino}`,
    `${v.terminalOrigen} - ${v.terminalDestino}`,
    `Salida: ${new Date(v.salida).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}`,
    `Llegada: ${new Date(v.llegada).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}`,
    `${v.servicio} | Unidad ${v.unidad} | Placa ${v.placa}`,
    `${v.chasis} | ${v.carroceria}`,
  ])
    doc.fontSize(11).text(texto(linea), 42, doc.y + 6, { width: 510 });
  doc.moveDown().fontSize(14).text("Pasajeros y asientos");
  for (const p of datos.pasajeros) {
    if (doc.y > 650) doc.addPage();
    doc
      .fontSize(11)
      .fillColor("#08035b")
      .text(
        texto(`${p.nombre} | Asiento ${p.asiento} | Piso ${p.piso}`),
        42,
        doc.y + 12,
        { width: 510 },
      );
    doc
      .fontSize(10)
      .fillColor("#444444")
      .text(texto(`Documento: ${p.documento} | ${p.categoria}`));
    doc.text(
      `Tarifa ${dinero(p.tarifaCentavos)} | Descuento ${dinero(p.descuentoCentavos)} | Total ${dinero(p.tarifaCentavos - p.descuentoCentavos + p.servicioCentavos + p.ivaCentavos)}`,
    );
  }
  if (doc.y > 650) doc.addPage();
  const q = datos.cotizacion;
  doc
    .moveDown()
    .fontSize(11)
    .text(
      `Tarifa base: ${dinero(q.base_centavos)}    Descuento: ${dinero(q.descuento_centavos)}`,
    );
  doc.text(
    `Servicio: ${dinero(q.servicio_centavos)}    IVA: ${dinero(q.iva_centavos)}`,
  );
  doc
    .fillColor("#00833e")
    .fontSize(17)
    .text(
      `Total pagado: ${dinero(datos.compra.totalPagadoCentavos)}`,
      42,
      doc.y + 12,
    );
  doc
    .fillColor("#444444")
    .fontSize(10)
    .text(
      "Presenta este boleto y el documento de identidad al abordar.",
      42,
      doc.y + 18,
      { width: 510 },
    );
  doc
    .fontSize(8)
    .text(
      "El QR identifica el boleto. La autorización de abordaje se comprueba en el sistema.",
      42,
      doc.y + 8,
      { width: 510 },
    );
  doc.end();
  return terminado;
}
