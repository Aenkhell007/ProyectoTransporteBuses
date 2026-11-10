import type { PasajeroReembolsoDemo } from "../types/pagos/reembolso";

// Reserva ficticia de la maqueta. Los 16 h y el 50% son un escenario ilustrativo,
// no el reloj real ni la política vigente de ninguna cooperativa.
export const reembolsoDemo = {
  reservaId: "demo-reserva-reembolso",
  codigo: "GC-20261210-4587",
  origen: "Quito", destino: "Guayaquil",
  terminalOrigen: "Terminal Quitumbe", terminalDestino: "Terminal Terrestre",
  salida: "06:00", llegada: "14:30", duracion: "8h 30min",
  fecha: "Jue, 10 de diciembre de 2026",
  servicio: "Ejecutivo (Dos pisos)", piso: "Piso superior",
  comprador: "Ángel Matías Galarza",
  foto: "/images/registro-bus-andino.png",
  horasHastaSalida: 16,
  porcentajePropuesto: 50,
  pasajeros: [
    { id: "demo-pasajero-u8", nombre: "Ángel Matías Galarza", asiento: "U8", pagadoCentavos: 2800 },
    { id: "demo-pasajero-u9", nombre: "María Fernanda Galarza", asiento: "U9", pagadoCentavos: 1960 },
  ] satisfies PasajeroReembolsoDemo[],
};
export const motivosReembolso = [
  { id: "cambio-planes", nombre: "Cambio de planes" },
  { id: "salud", nombre: "Motivo de salud" },
  { id: "compra-equivocada", nombre: "Error al realizar la compra" },
  { id: "otro", nombre: "Otro motivo" },
] as const;
