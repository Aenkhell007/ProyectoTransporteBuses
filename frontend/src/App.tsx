import { ConfiguracionCooperativaTabs } from './components/configuracion/ConfiguracionCooperativaTabs';
import ActivarCuenta from "./pages/auth/ActivarCuenta";
import ReenviarActivacion from "./pages/auth/ReenviarActivacion";
import Login from "./pages/auth/Login";
import RegistroPage from "./pages/identidad/RegistroPage";
import MiCuenta from "./pages/auth/MiCuenta";
import RecuperarContrasena from "./pages/auth/RecuperarContrasena";
import RestablecerContrasena from "./pages/auth/RestablecerContrasena";
import { useAuth } from "./features/auth/AuthContext";
import { Link, matchPath, Navigate, Route, Routes, useLocation } from "react-router";
import { ResultadosPage } from "./pages/compra/ResultadosPage";
import { PublicLayout } from "./components/layout";
import AdminLayout from "./layouts/AdminLayout";
import CooperativaLayout from "./layouts/CooperativaLayout";
import AdminResumenPage from "./features/administracion/AdminResumenPage";
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
import GestionCooperativasPage from "./pages/administracion/GestionCooperativasPage";
import ConfiguracionPagosPage from "./pages/configuracion/ConfiguracionPagosPage";
import FrecuenciasPage from "./pages/frecuencias/FrecuenciasPage";

import HojaRutaPage from "./pages/operacion/HojaRutaPage";
import ParadasTarifasPage from "./pages/administracion/ParadasTarifasPage";
import MikelV3Panel, { VistaMikel } from "./pages/mikel/MikelV3Panel";
import BusesPage from "./pages/flota/BusesPage";
import PlanosBusPage from "./pages/flota/PlanosBusPage";
import ConfiguracionCooperativaPage from "./pages/configuracion/ConfiguracionCooperativaPage";

// Importaciones de los submódulos de la Vista 12 y páginas oficiales de oficina
import { OficinaResumenPage } from "./features/oficina/OficinaResumenPage";
import { OficinaReservasPage } from "./features/oficina/OficinaReservasPage";
import { BandejaComprobantes } from "./pages/oficina/BandejaComprobantes";
import { VentaPresencial } from "./pages/oficina/VentaPresencial";

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
          element={<Navigate to="/vista-previa/panel/configuracion" replace />}
        />
      </Routes>
    );
  }

  if (
    import.meta.env.DEV &&
    (matchPath("/vista-previa/panel/*", location.pathname) ||
      matchPath("/vista-previa/oficinista/*", location.pathname) ||
      matchPath("/vista-previa/cooperativa/*", location.pathname))
  ) {
    return (
      <Routes>
        <Route path="/vista-previa/cooperativa" element={<CooperativaLayout />}>
          <Route index element={<section className="py-5"><h1 className="text-2xl font-bold">Resumen de la cooperativa</h1><p className="mt-3">Falta implementar esta vista. Puedes revisar Buses, Grupos habilitados y Configuración desde el menú lateral.</p></section>} />
          <Route path="buses" element={<Navigate to="/vista-previa/cooperativa/buses/ejecutivo" replace />} />
          <Route path="buses/ejecutivo" element={<VistaMikel seccion="buses" />} />
          <Route path="buses/normal" element={<VistaMikel seccion="bus-normal" />} />
          <Route path="grupos" element={<section className="space-y-4 py-5"><h1 className="text-2xl font-bold">Gestión de grupos</h1><p>Falta implementar la administración del catálogo de grupos en este panel.</p><Link className="inline-block rounded-md border border-blue-200 px-4 py-3" to="/vista-previa/cooperativa/frecuencias/grupos">Ver grupos habilitados por frecuencia →</Link></section>} />
          <Route path="configuracion" element={<VistaMikel seccion="identidad" />} />
          <Route path="configuracion/pagos" element={<ConfiguracionPagosPage panelCooperativa />} />
          <Route path="configuracion/tarifas" element={<section className="space-y-4 py-5"><h1 className="text-2xl font-bold">Configuración de la cooperativa</h1><ConfiguracionCooperativaTabs /><h2 className="text-xl font-bold">Tarifas y descuentos</h2><p>Falta integrar esta vista en el panel de la cooperativa.</p></section>} />
          <Route path="frecuencias" element={<Navigate to="/vista-previa/cooperativa/frecuencias/grupos" replace />} />
          <Route path="frecuencias/grupos" element={<VistaMikel seccion="grupos" />} />
          <Route path="hoja-ruta" element={<HojaRutaPage />} />
          <Route path="personal" element={<p className="py-5">La vista de personal está pendiente de integración por su responsable.</p>} />
          <Route path="*" element={<p>Sección no encontrada.</p>} />
        </Route>
        <Route path="/vista-previa/panel" element={<AdminLayout panelFijo />}>
          <Route path="configuracion/global" element={<VistaMikel seccion="global" />} />
          <Route index element={<AdminResumenPage />} />
          <Route
            path="cooperativas"
            element={<GestionCooperativasPage />}
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
            element={<><nav aria-label="Configuración de administración" className="flex flex-wrap gap-4 py-4"><Link to="/vista-previa/panel/configuracion/global" className="rounded-md border border-blue-200 px-4 py-2 text-blue-800 hover:bg-blue-50">Configuración global (11.4)</Link></nav><ConfiguracionPagosPage /></>}
          />
          <Route path="*" element={<p>Sección no encontrada.</p>} />
        </Route>
        
        {/* Panel del Oficinista con rutas oficiales */}
        <Route
          path="/vista-previa/oficinista"
          element={<AdminLayout variant="oficina" panelFijo />}
        >
          <Route index element={<OficinaResumenPage />} />
          <Route path="ventas" element={<VentaPresencial />} />
          <Route path="reservas" element={<OficinaReservasPage />} />
          <Route path="comprobantes" element={<BandejaComprobantes />} />
          <Route path="reembolsos" element={<SeccionAdminPendiente titulo="Reembolsos" />} />
          <Route path="*" element={<p className="p-6 text-gray-500">Sección no encontrada.</p>} />
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
          <Route path="/vista-previa/frecuencias" element={<FrecuenciasPage />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/flota/buses" element={<BusesPage />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/flota/planos" element={<PlanosBusPage />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/configuracion/cooperativa" element={<ConfiguracionCooperativaPage />} />
        )}
        {import.meta.env.DEV && (
          <Route
            path="/vista-previa/paradas-tarifas"
            element={<ParadasTarifasPage />}
          />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/mikel-v3" element={<MikelV3Panel />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/mikel-v3/asientos-normal" element={<MikelV3Panel inicial="normal" />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/mikel-v3/asientos-premium" element={<MikelV3Panel inicial="premium" />} />
        )}
        {import.meta.env.DEV && (
          <><Route path="/vista-previa/mikel-v3/buses" element={<Navigate to="/vista-previa/cooperativa/buses/ejecutivo" replace />} /><Route path="/vista-previa/mikel-v3/bus-normal" element={<Navigate to="/vista-previa/cooperativa/buses/normal" replace />} /></>
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/mikel-v3/grupos" element={<Navigate to="/vista-previa/cooperativa/grupos" replace />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/mikel-v3/configuracion-global" element={<Navigate to="/vista-previa/panel/configuracion/global" replace />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/mikel-v3/identidad" element={<Navigate to="/vista-previa/cooperativa/configuracion" replace />} />
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
