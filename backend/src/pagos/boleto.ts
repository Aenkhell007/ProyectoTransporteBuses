import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { DatosPago } from "../../../shared/pagos";
import { cargarLogoGranContinentalFallback } from "./desgloseVip";
import type { MarcaBoleto } from "./marcaBoleto";

export type MarcaRenderBoleto = MarcaBoleto & {
  logoBuffer?: Buffer | null;
  colorTexto?: string | null;
};

const dinero = (n: number) => `$ ${(n / 100).toFixed(2)}`;
const texto = (valor: unknown) =>
  String(valor ?? "")
    .replace(/[\u2192\u2794\u279C\u21D2\u27F6]/g, " -> ")
    .replace(/[\x00-\x1f]/g, " ");

const colorHexValido = (valor: unknown, defecto: string) =>
  typeof valor === "string" && /^#[0-9A-Fa-f]{6}$/.test(valor)
    ? valor
    : defecto;

export async function generarBoleto(
  datos: DatosPago,
  marca: MarcaRenderBoleto = {},
): Promise<Buffer> {
  if (
    !datos.compra ||
    datos.compra.estado !== "CONFIRMADA" ||
    !datos.documento ||
    !datos.cotizacion
  ) {
    throw new Error("Compra no emitible");
  }

  const qr = await QRCode.toBuffer(datos.documento.qrId, {
    width: 150,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const primario = colorHexValido(
    marca.colorPrimario ?? datos.viaje.marca?.colorPrimario,
    "#CB102E",
  );
  const secundario = colorHexValido(
    marca.colorSecundario ?? datos.viaje.marca?.colorSecundario,
    "#00833E",
  );
  const textoColor = colorHexValido(
    marca.colorTexto ?? datos.viaje.marca?.colorTexto,
    "#1A2A33",
  );

  let logoBuffer = marca.logo ?? marca.logoBuffer ?? null;
  if (!logoBuffer && /gran continental/i.test(datos.viaje.cooperativa ?? "")) {
    logoBuffer = await cargarLogoGranContinentalFallback();
  }

  const ancho = 320;
  const filasPasajerosAlt = datos.pasajeros.reduce(
    (sum, p) => sum + ((p.recargoVipCentavos ?? 0) > 0 ? 38 : 26),
    0,
  );
  const altoReembolso = datos.reembolsos?.cancelados.length ? 30 : 0;
  const altoServicio = datos.cotizacion.servicio_centavos > 0 ? 12 : 0;
  const alto = Math.min(
    760,
    Math.max(380, 338 + filasPasajerosAlt + altoReembolso + altoServicio),
  );
  let altoPagina = alto;

  const doc = new PDFDocument({
    size: [ancho, alto],
    margin: 14,
    info: { Title: "Boleto de compra", Author: datos.viaje.cooperativa },
  });

  const partes: Buffer[] = [];
  const terminado = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c) => partes.push(c));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);
  });

  // Banda superior con el color primario de la cooperativa y badge confirmado en color secundario
  doc.rect(0, 0, ancho, 24).fill(primario);
  doc
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .fontSize(8.5)
    .text("BOLETO DE VIAJE", 14, 7.5, { width: 170 });
  doc.roundedRect(ancho - 84, 5, 70, 14, 3).fill(secundario);
  doc
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .fontSize(7)
    .text("CONFIRMADO", ancho - 84, 8.5, { width: 70, align: "center" });

  // Banda de identidad: logo de la cooperativa + código de compra
  let logoRenderizado = false;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, 14, 28, {
        fit: [108, 42],
        valign: "center",
      });
      logoRenderizado = true;
    } catch {
      logoRenderizado = false;
    }
  }

  if (!logoRenderizado) {
    doc
      .font("Helvetica-Bold")
      .fillColor(primario)
      .fontSize(11)
      .text(texto(datos.viaje.cooperativa), 14, 34, { width: 140 });
  } else {
    doc
      .font("Helvetica-Bold")
      .fillColor(textoColor)
      .fontSize(8.5)
      .text(texto(datos.viaje.cooperativa), 130, 30, {
        width: 176,
        align: "right",
      });
  }

  doc
    .font("Helvetica")
    .fillColor("#64748b")
    .fontSize(6.5)
    .text("CÓDIGO DE COMPRA", 130, 44, { width: 176, align: "right" });
  doc
    .font("Helvetica-Bold")
    .fillColor(textoColor)
    .fontSize(7)
    .text(texto(datos.compra.codigo), 126, 53, { width: 180, align: "right" });

  // Franja bicolor corporativa (primario + secundario)
  doc.rect(0, 76, ancho / 2, 3).fill(primario);
  doc.rect(ancho / 2, 76, ancho / 2, 3).fill(secundario);

  // Datos esenciales del viaje (sin chasis ni carrocería)
  const v = datos.viaje;
  const salidaFmt = new Date(v.salida).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "short",
    timeStyle: "short",
  });
  const llegadaFmt = new Date(v.llegada).toLocaleString("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "short",
    timeStyle: "short",
  });

  doc
    .font("Helvetica-Bold")
    .fillColor(primario)
    .fontSize(12.5)
    .text(texto(`${v.origen} -> ${v.destino}`), 14, 86, { width: 292 });
  doc
    .font("Helvetica")
    .fillColor("#475569")
    .fontSize(7.5)
    .text(texto(`Origen: ${v.terminalOrigen}`), 14, 104, { width: 292 })
    .text(texto(`Destino: ${v.terminalDestino}`), 14, 114, { width: 292 });

  // Caja de horario y unidad con acento secundario
  doc.roundedRect(14, 128, 292, 42, 4).fillAndStroke("#f8fafc", "#e2e8f0");
  doc.rect(14, 128, 3.5, 42).fill(secundario);
  doc
    .font("Helvetica")
    .fillColor(textoColor)
    .fontSize(7.8)
    .text(`Salida: ${salidaFmt}`, 24, 134, { width: 136 })
    .text(`Llegada: ${llegadaFmt}`, 162, 134, { width: 138 })
    .font("Helvetica-Bold")
    .text(texto(`${v.servicio} · Unidad ${v.unidad} · Placa ${v.placa}`), 24, 151, {
      width: 274,
    });

  // Línea divisoria punteada tipo talón
  doc
    .moveTo(14, 178)
    .lineTo(306, 178)
    .dash(3, { space: 3 })
    .strokeColor("#cbd5e1")
    .stroke()
    .undash();

  doc
    .font("Helvetica-Bold")
    .fillColor(secundario)
    .fontSize(8.5)
    .text("Pasajeros y asientos", 14, 186, { width: 292 });

  let y = 200;
  for (const p of datos.pasajeros) {
    if (y > altoPagina - 140) {
      doc.addPage({ size: [ancho, 260], margin: 14 });
      altoPagina = 260;
      y = 14;
    }
    const totalPasajero =
      p.tarifaCentavos -
      p.descuentoCentavos +
      p.servicioCentavos +
      p.ivaCentavos;
    const recargoVip = p.recargoVipCentavos ?? 0;
    const tieneRecargoVip = recargoVip > 0;
    const esVip =
      tieneRecargoVip ||
      String(p.clase ?? "").toUpperCase() === "VIP" ||
      String(p.clase ?? "").toUpperCase() === "EJECUTIVO";
    const tarifaNormal =
      p.tarifaNormalCentavos ?? Math.max(0, p.tarifaCentavos - recargoVip);
    const vipPct = p.recargoVipPct ?? 0;

    doc
      .font("Helvetica-Bold")
      .fillColor(textoColor)
      .fontSize(8)
      .text(
        texto(
          `${p.nombre} · Asiento ${p.asiento} (P${p.piso})${esVip ? " [VIP]" : ""}`,
        ),
        14,
        y,
        { width: 222 },
      );
    doc
      .font("Helvetica-Bold")
      .fillColor(primario)
      .fontSize(8.5)
      .text(dinero(totalPasajero), 236, y, { width: 70, align: "right" });
    doc
      .font("Helvetica")
      .fillColor("#475569")
      .fontSize(7.2)
      .text(texto(`${p.documento} · ${p.categoria}`), 14, y + 11, {
        width: 292,
      });

    if (tieneRecargoVip) {
      doc
        .font("Helvetica-Bold")
        .fillColor("#b45309")
        .fontSize(6.9)
        .text(
          `Tarifa Normal ${dinero(tarifaNormal)} + Recargo VIP (+${vipPct}%): ${dinero(recargoVip)}`,
          14,
          y + 21,
          { width: 292 },
        );
      y += 36;
    } else {
      y += 25;
    }
  }

  if (datos.reembolsos?.cancelados.length) {
    doc
      .font("Helvetica")
      .fillColor("#7f1d1d")
      .fontSize(7.2)
      .text(
        `Pasajeros vigentes actualizados. Trámite: ${dinero(datos.reembolsos.enTramiteCentavos)} | Abonado: ${dinero(datos.reembolsos.ejecutadoCentavos)}`,
        14,
        y + 2,
        { width: 292 },
      );
    y += 24;
  }

  // Perforación previa al bloque QR + Desglose + Total
  doc
    .moveTo(14, y + 4)
    .lineTo(306, y + 4)
    .dash(3, { space: 3 })
    .strokeColor("#cbd5e1")
    .stroke()
    .undash();

  const yBloqueQr = y + 12;
  doc.image(qr, 16, yBloqueQr, { width: 78 });

  const q = datos.cotizacion;
  const totalRecargoVip =
    q.recargo_vip_centavos ??
    datos.pasajeros.reduce((s, p) => s + (p.recargoVipCentavos ?? 0), 0);
  const totalTarifaNormal =
    q.tarifa_normal_centavos ?? Math.max(0, q.base_centavos - totalRecargoVip);

  let yResumen = yBloqueQr + 2;
  const lineaResumen = (
    etiqueta: string,
    valor: string,
    color = "#475569",
    negrita = false,
  ) => {
    doc
      .font(negrita ? "Helvetica-Bold" : "Helvetica")
      .fillColor(color)
      .fontSize(7.2)
      .text(etiqueta, 106, yResumen, { width: 128 });
    doc
      .font(negrita ? "Helvetica-Bold" : "Helvetica")
      .fillColor(color)
      .fontSize(7.2)
      .text(valor, 234, yResumen, { width: 72, align: "right" });
    yResumen += 10.5;
  };

  if (totalRecargoVip > 0) {
    lineaResumen("Tarifa normal:", dinero(totalTarifaNormal));
    lineaResumen("Recargo VIP:", `+ ${dinero(totalRecargoVip)}`, "#b45309", true);
  } else {
    lineaResumen("Tarifa base:", dinero(q.base_centavos));
  }
  if (q.descuento_centavos > 0) {
    lineaResumen("Descuento:", `- ${dinero(q.descuento_centavos)}`, secundario);
  }
  if (q.servicio_centavos > 0) {
    lineaResumen("Servicio:", dinero(q.servicio_centavos));
  }
  lineaResumen("IVA:", dinero(q.iva_centavos));

  const yCajaTotal = Math.max(yResumen + 3, yBloqueQr + 42);
  doc.roundedRect(106, yCajaTotal, 200, 34, 4).fillAndStroke("#ecfdf5", secundario);
  doc
    .font("Helvetica-Bold")
    .fillColor(textoColor)
    .fontSize(6.5)
    .text("TOTAL PAGADO", 112, yCajaTotal + 4, { width: 188, align: "center" });
  doc
    .font("Helvetica-Bold")
    .fillColor(secundario)
    .fontSize(15)
    .text(dinero(datos.compra.totalPagadoCentavos), 112, yCajaTotal + 13, {
      width: 188,
      align: "center",
    });

  const yPie = Math.max(yBloqueQr + 84, yCajaTotal + 40);
  doc
    .font("Helvetica")
    .fillColor("#334155")
    .fontSize(7)
    .text("Presenta este boleto y tu cédula al abordar.", 14, yPie, {
      width: 292,
      align: "center",
    });

  doc.rect(0, altoPagina - 4, ancho / 2, 4).fill(primario);
  doc.rect(ancho / 2, altoPagina - 4, ancho / 2, 4).fill(secundario);

  doc.end();
  return terminado;
}
