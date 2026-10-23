import type { BankAccountOption } from "../components/pagos/BankAccountSelector";

// Cuentas ficticias para probar la interfaz. No sirven para pagar.
export const cuentasDemo: BankAccountOption[] = [
  {
    id: "demo-pichincha",
    banco: "Banco Pichincha",
    tipo: "Corriente",
    numero: "DEMO-NO-TRANSFERIR-5432",
    titular: "Cooperativa de ejemplo",
    ruc: "DEMO-SIN-RUC",
    qrSrc: "/images/qr-demo/demo-pichincha.png",
  },
  {
    id: "demo-guayaquil",
    banco: "Banco Guayaquil",
    tipo: "Ahorros",
    numero: "DEMO-NO-TRANSFERIR-9876",
    titular: "Cooperativa de ejemplo",
    ruc: "DEMO-SIN-RUC",
    qrSrc: "/images/qr-demo/demo-guayaquil.png",
  },
];
