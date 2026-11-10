import ActivarCuenta from "./pages/auth/ActivarCuenta";
import ReenviarActivacion from "./pages/auth/ReenviarActivacion";
import Login from "./pages/auth/Login";
import RegistroPage from "./pages/identidad/RegistroPage";
import MiCuenta from "./pages/auth/MiCuenta";
import RecuperarContrasena from "./pages/auth/RecuperarContrasena";
import RestablecerContrasena from "./pages/auth/RestablecerContrasena";
import { useAuth } from "./features/auth/AuthContext";
import { matchPath, Route, Routes, useLocation } from "react-router";
import { ResultadosPage } from "./pages/compra/ResultadosPage";
import { PublicLayout } from "./components/layout";
import AdminLayout from "./layouts/AdminLayout";
import { MisViajesPage } from "./pages/mis-viajes/MisViajesPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { InicioPage } from "./pages/compra/InicioPage";

import SeleccionAsientosPage from "./pages/flota/SeleccionAsientosPage";
import MetodoPago from "./pages/pagos/MetodoPago";
import { PasajerosPage } from "./pages/compra/PasajerosPage";
import SubirComprobante from "./pages/pagos/SubirComprobante";
import SeguimientoPago from "./pages/pagos/SeguimientoPago";
import ConfirmacionCompra from "./pages/pagos/ConfirmacionCompra";
import SolicitarReembolso from "./pages/mis-viajes/SolicitarReembolso";
import { ResumenCompraPage } from "./pages/compra/ResumenCompraPage";
import ConfiguracionPagosPage from "./pages/configuracion/ConfiguracionPagosPage";
import FrecuenciasPage from "./pages/frecuencias/FrecuenciasPage";

import HojaRutaPage from "./pages/operacion/HojaRutaPage";

import ParadasTarifasPage from "./pages/administracion/ParadasTarifasPage";

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
  const { usuario } = useAuth();
  const location = useLocation();
  const section = homeSections[location.hash] ?? homeSections[""];

  if (
    import.meta.env.DEV &&
    matchPath("/vista-previa/configuracion/pagos", location.pathname)
  ) {
    return (
      <Routes>
        <Route
          path="/vista-previa/configuracion/pagos"
          element={<AdminLayout cooperativa />}
        >
          <Route index element={<ConfiguracionPagosPage />} />
        </Route>
      </Routes>
    );
  }

  if (
    import.meta.env.DEV &&
    matchPath("/vista-previa/panel/*", location.pathname)
  ) {
    return (
      <Routes>
        <Route path="/vista-previa/panel" element={<AdminLayout panelFijo />}>
          <Route index element={<SeccionAdminPendiente titulo="Resumen" />} />
          <Route
            path="cooperativas"
            element={<SeccionAdminPendiente titulo="Cooperativas" />}
          />
          <Route
            path="usuarios"
            element={<SeccionAdminPendiente titulo="Usuarios y roles" />}
          />
          <Route
            path="reportes"
            element={<SeccionAdminPendiente titulo="Reportes" />}
          />
          <Route
            path="configuracion"
            element={<SeccionAdminPendiente titulo="Configuración" />}
          />
          <Route path="*" element={<p>Sección no encontrada.</p>} />
        </Route>

      </Routes>
    );
  }

  return (
    <PublicLayout
      header={{
        activeItem: location.pathname === "/" ? section.activeItem : undefined,
        account: usuario
          ? { label: usuario.nombres, href: "/mi-cuenta" }
          : undefined,
      }}
    >
      <Routes>
        <Route path="/activar-cuenta" element={<ActivarCuenta />} />
        <Route path="/reenviar-activacion" element={<ReenviarActivacion />} />
        <Route path="/" element={<InicioPage />} />
        <Route path="/iniciar-sesion" element={<Login />} />
        <Route path="/asientos" element={<SeleccionAsientosPage />} />
        <Route path="/pasajeros" element={<PasajerosPage />} />
        <Route path="/registrarse" element={<RegistroPage />} />
        <Route path="/viajes" element={<ResultadosPage />} />
        {import.meta.env.DEV && (
          <Route
            path="/vista-previa/frecuencias"
            element={<FrecuenciasPage />}
          />
        )}
        <Route path="/mi-cuenta" element={<MiCuenta />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
        <Route
          path="/restablecer-contrasena"
          element={<RestablecerContrasena />}
        />
        <Route path="/pago" element={<MetodoPago />} />
        <Route path="/resumen" element={<ResumenCompraPage />} />
        <Route path="/pago/comprobante" element={<SubirComprobante />} />
        <Route path="/pago/seguimiento" element={<SeguimientoPago />} />
        <Route path="/pago/confirmacion" element={<ConfirmacionCompra />} />
        <Route path="/mis-viajes" element={<MisViajesPage />} />
        <Route path="/mis-viajes/reembolso" element={<SolicitarReembolso />} />
        {import.meta.env.DEV && (
          <Route path="/vista-previa/hoja-ruta" element={<HojaRutaPage />} />
        )}
        {import.meta.env.DEV && (
          <Route
            path="/vista-previa/paradas-tarifas"
            element={<ParadasTarifasPage />}
          />
        )}
        <Route
          path="*"
          element={<PlaceholderPage title="Aquí va esta página" />}
        />
      </Routes>
    </PublicLayout>
  );
}

function SeccionAdminPendiente({ titulo }: { titulo: string }) {
  return <h2 className="sr-only">{titulo}</h2>;
}
