// Datos ficticios para revisar la vista 8 sin conectar reservas ni pagos reales.
export const compraConfirmadaDemo = {
  codigo: "GC-20261010-4587",
  origen: "Quito", destino: "Guayaquil",
  terminalOrigen: "Terminal Quitumbe", terminalDestino: "Terminal Terrestre",
  fecha: "Sáb, 10 de octubre de 2026", salida: "06:00", llegada: "14:30", duracion: "8h 30min",
  servicio: "Ejecutivo (Dos pisos)", piso: "Piso superior", cooperativa: "GRAN CONTINENTAL",
  unidad: "018", placa: "PAB-1234", chasis: "Scania", carroceria: "Marcopolo Paradiso 1800 DD",
  metodo: "Transferencia/Depósito", servicioCentavos: 0, ivaCentavos: 0,
  pdf: "/documents/demo/boleto-compra-demo.pdf",
  qr: "/images/qr-demo/boleto-compra-demo.svg",
  pasajeros: [
    { nombre: "Ángel Matías Galarza", categoria: "Adulto", documento: "DEMO-001", asiento: "U8", tarifaCentavos: 2800, descuentoCentavos: 0 },
    { nombre: "María Fernanda Galarza", categoria: "Niño (8 años)", documento: "DEMO-002", asiento: "U9", tarifaCentavos: 2800, descuentoCentavos: 840 },
  ],
};
export type EstadoConfirmacionDemo = "listo" | "preparando" | "revision" | "rechazado";
