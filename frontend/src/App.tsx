import { Route, Routes, useLocation } from "react-router";
import { ResultadosPage } from "./pages/compra/ResultadosPage";
import { PublicLayout, SiteFooter } from "./components/layout";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { InicioPage } from "./pages/compra/InicioPage";

import MetodoPago from "./pages/pagos/MetodoPago";
import { PasajerosPage } from "./pages/compra/PasajerosPage";
import PasoPagoPendiente from "./pages/pagos/PasoPagoPendiente";
import SubirComprobante from "./pages/pagos/SubirComprobante";

const homeSections: Record<
  string,
  { title: string; activeItem: string; id?: string }
> = {
  "": { title: "Aquí va el inicio", activeItem: "inicio" },
  "#rutas": { title: "Aquí van las rutas", activeItem: "rutas", id: "rutas" },
  "#servicios": {
    title: "Aquí van los servicios",
    activeItem: "servicios",
    id: "servicios",
  },
  "#sobre-nosotros": {
    title: "Aquí va sobre nosotros",
    activeItem: "nosotros",
    id: "sobre-nosotros",
  },
  "#contacto": {
    title: "Aquí va el contacto",
    activeItem: "contacto",
    id: "contacto",
  },
};

export function App() {
  const location = useLocation();
  const section = homeSections[location.hash] ?? homeSections[""];

  // Los paneles mantienen su navegación propia; comparten únicamente el pie.
  if (location.pathname === "/vista-previa/panel") {
    return (
      <div className="gc-shell">
        <main className="gc-main">
          <PlaceholderPage title="Aquí va el panel" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <PublicLayout
      header={{
        activeItem: location.pathname === "/" ? section.activeItem : undefined,
      }}
    >
      <Routes>
        <Route path="/" element={<InicioPage />} />
        <Route
          path="/iniciar-sesion"
          element={<PlaceholderPage title="Aquí va iniciar sesión" />}
        />
        <Route path="/pasajeros" element={<PasajerosPage />} />
        <Route
          path="/registrarse"
          element={<PlaceholderPage title="Aquí va el registro" />}
        />
        <Route path="/viajes" element={<ResultadosPage />} />
        <Route path="/pago" element={<MetodoPago />} />
        <Route path="/resumen" element={<PasoPagoPendiente />} />
        <Route path="/pago/comprobante" element={<SubirComprobante />} />

        <Route
          path="*"
          element={<PlaceholderPage title="Aquí va esta página" />}
        />
      </Routes>
    </PublicLayout>
  );
}
