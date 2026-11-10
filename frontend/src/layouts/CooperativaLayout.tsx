import type { ReactNode } from "react";
import AdminLayout from "./AdminLayout";

/** Layout compartido: cabecera, navegación, sesión y pie se mantienen en un solo lugar. */
export default function CooperativaLayout({ children }: { children?: ReactNode }) {
  return (
    <AdminLayout variant="cooperativa" panelFijo>
      {children}
    </AdminLayout>
  );
}
