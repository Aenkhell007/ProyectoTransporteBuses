import ActivarCuenta from "./pages/auth/ActivarCuenta";
import ReenviarActivacion from "./pages/auth/ReenviarActivacion";
import Login from "./pages/auth/Login";
import RegistroPage from "./pages/identidad/RegistroPage";
import MiCuenta from "./pages/auth/MiCuenta";
import RecuperarContrasena from "./pages/auth/RecuperarContrasena";
import RestablecerContrasena from "./pages/auth/RestablecerContrasena";
import { useAuth } from "./features/auth/AuthContext";
import { Link, matchPath, Navigate, Route, Routes, useLocation } from "react-router";
import type { ReactNode } from "react";
import { ResultadosPage } from "./pages/compra/ResultadosPage";
import { PublicLayout } from "./components/layout";
import AdminLayout from "./layouts/AdminLayout";
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
import AdminUsuariosPage from "./pages/administracion/AdminUsuariosPage";
import { BandejaComprobantes } from "./pages/oficina/BandejaComprobantes";
import { VentaPresencial } from "./pages/oficina/VentaPresencial";
import RevisionComprobantePage from "./pages/oficina/RevisionComprobantePage";
import VentaOficinaPage from "./pages/oficina/VentaOficinaPage";
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
          element={<Navigate to="/vista-previa/panel/configuracion" replace />}
        />
      </Routes>
    );
  }

  if (
    import.meta.env.DEV &&
    (matchPath("/vista-previa/panel/*", location.pathname) ||
      matchPath("/vista-previa/oficinista/*", location.pathname))
  ) {
    return (
      <Routes>
        <Route path="/vista-previa/panel" element={<AdminLayout panelFijo />}>
          <Route index element={<AdminResumenPage />} />

          <Route
            path="cooperativas"
            element={
              <VistaPreviaPanel>
                <GestionCooperativasPage />
              </VistaPreviaPanel>
            }
          />

          <Route
            path="usuarios"
            element={
              <VistaPreviaPanel>
                <AdminUsuariosPage />
              </VistaPreviaPanel>
            }
          />

          <Route
            path="reportes"
            element={<SeccionAdminPendiente titulo="Reportes" />}
          />

          <Route
            path="configuracion"
            element={<ConfiguracionPagosPage />}
          />

          <Route path="*" element={<p>Sección no encontrada.</p>} />
        </Route>

        {/* RUTAS DEL OFICINISTA */}
        <Route
          path="/vista-previa/oficinista"
          element={<AdminLayout variant="oficina" panelFijo />}
        >
          <Route index element={<ResumenOficina />} />

          <Route
            path="ventas"
            element={
              <VistaPreviaPanel soloLectura>
                <VentaPresencial />
              </VistaPreviaPanel>
            }
          />

          <Route
            path="venta-oficina"
            element={
              <VistaPreviaPanel>
                <VentaOficinaPage />
              </VistaPreviaPanel>
            }
          />

          <Route
            path="reservas"
            element={<SeccionAdminPendiente titulo="Reservas" />}
          />

          <Route
            path="comprobantes"
            element={
              <VistaPreviaPanel soloLectura>
                <BandejaComprobantes />
              </VistaPreviaPanel>
            }
          />

          <Route
            path="comprobantes/:id"
            element={
              <VistaPreviaPanel>
                <BandejaComprobantes />
              </VistaPreviaPanel>
            }
          />

          <Route
            path="revision-comprobante/:id?"
            element={
              <VistaPreviaPanel>
                <RevisionComprobantePage />
              </VistaPreviaPanel>
            }
          />

          <Route
            path="reembolsos"
            element={<SeccionAdminPendiente titulo="Reembolsos" />}
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
        <Route
          path="/recuperar-contrasena"
          element={<RecuperarContrasena />}
        />
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
        <Route
          path="/mis-viajes/reembolso"
          element={<SolicitarReembolso />}
        />

        {import.meta.env.DEV && (
          <Route
            path="/vista-previa/hoja-ruta"
            element={<HojaRutaPage />}
          />
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

function VistaPreviaPanel({
  children,
  soloLectura = false,
}: {
  children: ReactNode;
  soloLectura?: boolean;
}) {
  return (
    <>
      <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
        Vista previa con datos de ejemplo. Los cambios no se guardan en el
        sistema.
      </p>

      {soloLectura ? (
        <fieldset disabled className="min-w-0">
          <legend className="sr-only">
            Vista previa de solo lectura
          </legend>
          {children}
        </fieldset>
      ) : (
        children
      )}
    </>
  );
}

function ResumenOficina() {
  return (
    <section className="space-y-4 py-4" aria-labelledby="resumen-oficina">
      <h2
        id="resumen-oficina"
        className="text-xl font-semibold text-slate-900"
      >
        Resumen de oficina
      </h2>

      <p className="text-sm text-slate-600">
        Los indicadores aparecerán cuando el servicio de oficina esté disponible.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded-md border border-blue-700 px-4 py-2 text-blue-900"
          to="ventas"
        >
          Ver ventas
        </Link>

        <Link
          className="rounded-md border border-blue-700 px-4 py-2 text-blue-900"
          to="comprobantes"
        >
          Ver comprobantes
        </Link>
      </div>
    </section>
  );
}

function SeccionAdminPendiente({ titulo }: { titulo: string }) {
  return (
    <section className="space-y-2 py-4">
      <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
      <p className="text-sm text-slate-600">
        Esta sección aún no está disponible.
      </p>
    </section>
  );
}