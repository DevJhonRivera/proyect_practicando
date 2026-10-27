import {
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import { lazy, Suspense } from "react";

const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage"));
const PedidoList = lazy(() => import("../pages/pedidos/PedidoList"));
const PedidoCreate = lazy(() => import("../pages/pedidos/PedidoCreate"));
const RecepcionList = lazy(() => import("../pages/recepciones/RecepcionList"));
const ReservaPage = lazy(() => import("../pages/reserva/ReservaPage"));
const UsoPage = lazy(() => import("../pages/uso/UsoPage"));
const CortesPage = lazy(() => import("../pages/cortes/CortesPage"));
const PiezasPpfPage = lazy(() => import("../pages/piezasPpf/PiezasPpfPage"));
const AlertasPage = lazy(() => import("../pages/alertas/AlertasPage"));
const RetazosPage = lazy(() => import("../pages/retazos/RetazosPage"));
const FinanzasPage = lazy(() => import("../pages/finanzas/FinanzasPage"));
const VentasPage = lazy(() => import("../pages/ventas/VentasPage"));
const AuditoriaPage = lazy(() => import("../pages/auditoria/AuditoriaPage"));
const UsuariosPage = lazy(() => import("../pages/usuarios/UsuariosPage"));
const AsesoresPage = lazy(() => import("../pages/asesores/AsesoresPage"));
const CoordinacionPage = lazy(() => import("../pages/coordinacion/CoordinacionPage"));
const MedidasVehiculosPage = lazy(() => import("../pages/medidasVehiculos/MedidasVehiculosPage"));
const AccesoriosPage = lazy(() => import("../pages/accesorios/AccesoriosPage"));
const OrdenesTrabajoPage = lazy(() => import("../pages/ordenesTrabajo/OrdenesTrabajoPage"));

import PrivateRoute from "./PrivateRoute";
import MainLayout from "../layouts/MainLayout";
import {
  obtenerUsuarioActual,
  tienePermiso,
} from "../utils/permisos";
import { cerrarSesion } from "../utils/session";

function RutaPermitida({ modulo, accion = "read", children }) {
  const usuario = obtenerUsuarioActual();

  if (!tienePermiso(usuario, modulo, accion)) {
    cerrarSesion({
      redirect: false,
    });

    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRouter() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-600">Cargando módulo...</div>}>
    <Routes>

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      <Route
        element={<PrivateRoute />}
      >

        <Route
          element={<MainLayout />}
        >

          <Route
            index
            element={
              <Navigate
                to="/dashboard"
                replace
              />
            }
          />

          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            path="/ordenes-trabajo"
            element={<RutaPermitida modulo="dashboard"><OrdenesTrabajoPage /></RutaPermitida>}
          />

          <Route
            path="/usuarios"
            element={
              <RutaPermitida modulo="usuarios" accion="write">
                <UsuariosPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/pedidos"
            element={
              <RutaPermitida modulo="pedidos">
                <PedidoList />
              </RutaPermitida>
            }
          />

          <Route
            path="/pedidos/nuevo"
            element={
              <RutaPermitida modulo="pedidos" accion="write">
                <PedidoCreate />
              </RutaPermitida>
            }
          />

          <Route
            path="/recepciones"
            element={
              <RutaPermitida modulo="recepciones" accion="write">
                <RecepcionList />
              </RutaPermitida>
            }
          />

          <Route
            path="/reserva"
            element={
              <RutaPermitida modulo="rollos">
                <ReservaPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/uso"
            element={
              <RutaPermitida modulo="rollos">
                <UsoPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/cortes"
            element={
              <RutaPermitida modulo="cortes" accion="write">
                <CortesPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/piezas-ppf"
            element={
              <RutaPermitida modulo="piezasPpf" accion="read">
                <PiezasPpfPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/medidas-vehiculos"
            element={
              <RutaPermitida modulo="medidasVehiculos" accion="read">
                <MedidasVehiculosPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/retazos"
            element={
              <RutaPermitida modulo="retazos">
                <RetazosPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/accesorios"
            element={<RutaPermitida modulo="accesorios"><AccesoriosPage /></RutaPermitida>}
          />

          <Route
            path="/alertas"
            element={
              <RutaPermitida modulo="alertas">
                <AlertasPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/finanzas"
            element={
              <RutaPermitida modulo="finanzas">
                <FinanzasPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/costeo-pedidos"
            element={
              <RutaPermitida modulo="pedidos" accion="read">
                <FinanzasPage soloCosteo />
              </RutaPermitida>
            }
          />

          <Route
            path="/ventas"
            element={
              <RutaPermitida modulo="ventas" accion="write">
                <VentasPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/asesores"
            element={
              <RutaPermitida modulo="asesores">
                <AsesoresPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/coordinacion"
            element={
              <RutaPermitida modulo="coordinacion">
                <CoordinacionPage />
              </RutaPermitida>
            }
          />

          <Route
            path="/auditoria"
            element={
              <RutaPermitida modulo="finanzas">
                <AuditoriaPage />
              </RutaPermitida>
            }
          />

        </Route>

      </Route>

    </Routes>
    </Suspense>
  );
}

export default AppRouter;
