import { lazy, Suspense } from 'react';
import { BusesConectados, BusConectado, IdentidadConectada, GlobalConectada, CompatibilidadesConectadas, GruposGestionConectada } from './pages/mikel/EditoresConectados';
import ActivarCuenta from "./pages/auth/ActivarCuenta";
import ReenviarActivacion from "./pages/auth/ReenviarActivacion";
import Login from "./pages/auth/Login";
import { useAuth } from "./features/auth/AuthContext";
import { Link, matchPath, Navigate, Route, Routes, useLocation } from "react-router";
import { PublicLayout } from "./components/layout";
import AdminLayout from "./layouts/AdminLayout";
import CooperativaLayout from "./layouts/CooperativaLayout";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { InicioPage } from "./pages/compra/InicioPage";
import { PrivacidadPage } from "./pages/compra/PrivacidadPage";

const ValidarAbordajePage = lazy(() => import("./pages/abordaje/ValidarAbordajePage"));
const ReportesAuditoria = lazy(() => import('./features/operacion/ReportesAuditoria'));
const PoliticaReembolso = lazy(() => import('./features/operacion/PoliticaReembolso'));
const CooperativaResumen = lazy(() => import('./features/operacion/CooperativaResumen'));
const FrecuenciasGestion = lazy(() => import('./features/operacion/FrecuenciasGestion'));
const HojaRutaGestion = lazy(() => import('./features/operacion/HojaRutaGestion'));
const TarifasGestion = lazy(() => import('./features/operacion/TarifasGestion'));
const CooperativasAdmin = lazy(() => import('./features/operacion/CooperativasAdmin'));
const UsuariosPage = lazy(() => import('./features/identidad/UsuariosPage'));
const AltasPage = lazy(() => import('./features/identidad/AltasPage'));
const AccesosPage = lazy(() => import('./features/identidad/AccesosPage'));
const RegistroPage = lazy(() => import("./pages/identidad/RegistroPage"));
const MiCuenta = lazy(() => import("./pages/auth/MiCuenta"));
const RecuperarContrasena = lazy(() => import("./pages/auth/RecuperarContrasena"));
const RestablecerContrasena = lazy(() => import("./pages/auth/RestablecerContrasena"));
const AdminResumenPage = lazy(() => import("./features/administracion/AdminResumenPage"));
const SeleccionAsientosPage = lazy(() => import("./pages/flota/SeleccionAsientosPage"));
const MetodoPago = lazy(() => import("./pages/pagos/MetodoPago"));
const RespuestaPayphone = lazy(() => import("./pages/pagos/RespuestaPayphone"));
const SubirComprobante = lazy(() => import("./pages/pagos/SubirComprobante"));
const SeguimientoPago = lazy(() => import("./pages/pagos/SeguimientoPago"));
const ConfirmacionCompra = lazy(() => import("./pages/pagos/ConfirmacionCompra"));
const SolicitarReembolso = lazy(() => import("./pages/mis-viajes/SolicitarReembolso"));
const ConfiguracionPagosPage = lazy(() => import("./pages/configuracion/ConfiguracionPagosPage"));
const VentaOficinaReal = lazy(() => import('./features/oficina/VentaOficinaReal').then(modulo => ({ default: modulo.VentaOficinaReal })));
const ReembolsosReal = lazy(() => import('./features/oficina/ReembolsosReal').then(modulo => ({ default: modulo.ReembolsosReal })));
const RevisionComprobanteReal = lazy(() => import('./features/oficina/RevisionComprobanteReal').then(modulo => ({ default: modulo.RevisionComprobanteReal })));
const OficinaComprobantesReal = lazy(() => import('./features/oficina/OficinaComprobantesReal').then(modulo => ({ default: modulo.OficinaComprobantesReal })));
const ResultadosPage = lazy(() => import("./pages/compra/ResultadosPage").then(modulo => ({ default: modulo.ResultadosPage })));
const MisViajesPage = lazy(() => import("./pages/mis-viajes/MisViajesPage").then(modulo => ({ default: modulo.MisViajesPage })));
const PasajerosPage = lazy(() => import("./pages/compra/PasajerosPage").then(modulo => ({ default: modulo.PasajerosPage })));
const ResumenCompraPage = lazy(() => import("./pages/compra/ResumenCompraPage").then(modulo => ({ default: modulo.ResumenCompraPage })));
const OficinaResumenPage = lazy(() => import("./features/oficina/OficinaResumenPage").then(modulo => ({ default: modulo.OficinaResumenPage })));
const OficinaReservasPage = lazy(() => import("./features/oficina/OficinaReservasPage").then(modulo => ({ default: modulo.OficinaReservasPage })));

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
  return (
    <Suspense fallback={<p role="status" className="p-6 text-center text-blue-900">Cargando sección…</p>}>
      <RutasAplicacion />
    </Suspense>
  );
}

function RutasAplicacion() {
  const { usuario } = useAuth();
  const location = useLocation();
  const section = homeSections[location.hash] ?? homeSections[""];

  if (matchPath('/oficina/*', location.pathname) || matchPath('/cooperativa/*', location.pathname) || matchPath('/panel/*', location.pathname)) {
    return <Routes>
      <Route path="/cooperativa" element={<CooperativaLayout />}>
        <Route index element={<CooperativaResumen />} />
        <Route path="buses" element={<BusesConectados />} />
        <Route path="buses/:id" element={<BusConectado />} />
        <Route path="configuracion" element={<IdentidadConectada />} />
        <Route path="configuracion/pagos" element={<ConfiguracionPagosPage panelCooperativa />} />
        <Route path="configuracion/tarifas" element={<TarifasGestion />} />
        <Route path="configuracion/tarifas/politica" element={<PoliticaReembolso />} />
        <Route path="configuracion/politica-reembolso" element={<PoliticaReembolso />} />
        <Route path="hoja-ruta" element={<HojaRutaGestion />} />
        <Route path="frecuencias" element={<FrecuenciasGestion />} />
        <Route path="frecuencias/grupos" element={<CompatibilidadesConectadas />} />
        <Route path="grupos" element={<GruposGestionConectada />} />
        <Route path="mi-cuenta" element={<MiCuenta />} />
        <Route path="*" element={<p className="py-6">Esta sección está pendiente de integración por su responsable.</p>} />
      </Route>
      <Route path="/oficina" element={<AdminLayout variant="oficina" panelFijo />}><Route index element={<OficinaResumenPage />}/><Route path="ventas" element={<VentaOficinaReal />}/><Route path="reservas" element={<OficinaReservasPage />}/><Route path="comprobantes" element={<OficinaComprobantesReal />}/><Route path="comprobantes/ejemplo" element={<Navigate to="/oficina/comprobantes" replace />} /><Route path="comprobantes/:id" element={<RevisionComprobanteReal />}/><Route path="reembolsos" element={<ReembolsosReal />}/><Route path="mi-cuenta" element={<MiCuenta />}/><Route path="*" element={<p>Sección pendiente de integración.</p>}/></Route>
      <Route path="/panel" element={<AdminLayout panelFijo />}>
        <Route index element={<AdminResumenPage />} />
        <Route path="cooperativas" element={<CooperativasAdmin />} />
        <Route path="cooperativas/nueva" element={<AltasPage cooperativa />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="usuarios/nuevo" element={<AltasPage />} />
        <Route path="accesos" element={<AccesosPage />} />
        <Route path="reportes" element={<ReportesAuditoria />} />
        <Route path="mi-cuenta" element={<MiCuenta />} />
        <Route path="configuracion" element={<><nav className="px-4 pt-4"><Link className="inline-flex rounded-md border border-blue-200 px-4 py-2 text-blue-900" to="/panel/configuracion/pagos">Pagos y cuentas bancarias →</Link></nav><GlobalConectada /></>} />
        <Route path="configuracion/global" element={<GlobalConectada />} />
        <Route path="configuracion/pagos" element={<ConfiguracionPagosPage />} />
        <Route path="*" element={<p className="py-6">Esta sección está pendiente de integración por su responsable.</p>} />
      </Route>
    </Routes>;
  }

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
          <Route path="buses/ejecutivo" element={<Navigate to="/cooperativa/buses" replace />} />
          <Route path="buses/normal" element={<Navigate to="/cooperativa/buses" replace />} />
          <Route path="grupos" element={<Navigate to="/cooperativa/grupos" replace />} />
          <Route path="configuracion" element={<Navigate to="/cooperativa/configuracion" replace />} />
          <Route path="configuracion/pagos" element={<ConfiguracionPagosPage panelCooperativa />} />
          <Route path="configuracion/tarifas" element={<TarifasGestion />} />
          <Route path="frecuencias" element={<Navigate to="/vista-previa/cooperativa/frecuencias/grupos" replace />} />
          <Route path="frecuencias/grupos" element={<Navigate to="/cooperativa/frecuencias/grupos" replace />} />
          <Route path="hoja-ruta" element={<HojaRutaGestion />} />
          <Route path="personal" element={<p className="py-5">La vista de personal está pendiente de integración por su responsable.</p>} />
          <Route path="*" element={<p>Sección no encontrada.</p>} />
        </Route>
        <Route path="/vista-previa/panel" element={<AdminLayout panelFijo />}>
          <Route path="configuracion/global" element={<Navigate to="/panel/configuracion/global" replace />} />
          <Route index element={<AdminResumenPage />} />
          <Route
            path="cooperativas"
            element={<Navigate to="/panel/cooperativas" replace />}
          />
          <Route
            path="usuarios"
            element={<UsuariosPage />}
          />
          <Route
            path="reportes"
            element={<ReportesAuditoria />}
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
          <Route path="ventas" element={<VentaOficinaReal />} />
          <Route path="reservas" element={<OficinaReservasPage />} />
          <Route path="comprobantes" element={<OficinaComprobantesReal />} /><Route path="comprobantes/ejemplo" element={<Navigate to="/oficina/comprobantes" replace />} /><Route path="comprobantes/:id" element={<RevisionComprobanteReal />} />
          <Route path="reembolsos" element={<ReembolsosReal />} />
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
        <Route path="/aceptar-invitacion" element={<RestablecerContrasena invitacion />} />
        <Route path="/reenviar-activacion" element={<ReenviarActivacion />} />
        <Route path="/" element={<InicioPage />} />
        <Route path="/privacidad" element={<PrivacidadPage />} />
        <Route path="/iniciar-sesion" element={<Login />} />
        <Route path="/asientos" element={<SeleccionAsientosPage />} />
        <Route path="/pasajeros" element={<PasajerosPage />} />
        <Route path="/registrarse" element={<RegistroPage />} />
        <Route path="/viajes" element={<ResultadosPage />} />
        {import.meta.env.DEV && (
          <Route
            path="/vista-previa/frecuencias"
            element={<Navigate to="/cooperativa/frecuencias" replace />}
          />
        )}
        <Route path="/mi-cuenta" element={<MiCuenta />} />
        <Route path="/abordaje" element={<ValidarAbordajePage key={usuario?.id} />} />
        <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
        <Route
          path="/restablecer-contrasena"
          element={<RestablecerContrasena />}
        />
        <Route path="/pago" element={<MetodoPago />} />
        <Route path="/pago/payphone/respuesta" element={<RespuestaPayphone />} />
        <Route path="/resumen" element={<ResumenCompraPage />} />
        <Route path="/pago/comprobante" element={<SubirComprobante />} />
        <Route path="/pago/seguimiento" element={<SeguimientoPago />} />
        <Route path="/pago/confirmacion" element={<ConfirmacionCompra />} />
        <Route path="/mis-viajes" element={<MisViajesPage />} />
        <Route path="/mis-viajes/reembolso" element={<SolicitarReembolso />} />

        {import.meta.env.DEV && (
          <Route path="/vista-previa/flota/buses" element={<Navigate to="/cooperativa/buses" replace />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/flota/planos" element={<Navigate to="/cooperativa/buses" replace />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/configuracion/cooperativa" element={<Navigate to="/cooperativa/configuracion" replace />} />
        )}
        {import.meta.env.DEV && (
          <Route
            path="/vista-previa/paradas-tarifas"
            element={<Navigate to="/cooperativa/frecuencias" replace />}
          />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/mikel-v3" element={<Navigate to="/cooperativa" replace />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/mikel-v3/asientos-normal" element={<Navigate to="/" replace />} />
        )}
        {import.meta.env.DEV && (
          <Route path="/vista-previa/mikel-v3/asientos-premium" element={<Navigate to="/" replace />} />
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
