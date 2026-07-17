import {
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import DashboardPage from "../pages/dashboard/DashboardPage";

import PedidoList from "../pages/pedidos/PedidoList";
import PedidoCreate from "../pages/pedidos/PedidoCreate";
import RecepcionList from "../pages/recepciones/RecepcionList";
import ReservaPage from "../pages/reserva/ReservaPage";
import UsoPage from "../pages/uso/UsoPage";
import CortesPage from "../pages/cortes/CortesPage";
import AlertasPage from "../pages/alertas/AlertasPage";
import RetazosPage from "../pages/retazos/RetazosPage";
import FinanzasPage from "../pages/finanzas/FinanzasPage";
import VentasPage from "../pages/ventas/VentasPage";
import AuditoriaPage from "../pages/auditoria/AuditoriaPage";
import UsuariosPage from "../pages/usuarios/UsuariosPage";

import PrivateRoute from "./PrivateRoute";
import MainLayout from "../layouts/MainLayout";
import {
  obtenerUsuarioActual,
  tienePermiso,
} from "../utils/permisos";

function RutaPermitida({ modulo, accion = "read", children }) {
  const usuario = obtenerUsuarioActual();

  if (!tienePermiso(usuario, modulo, accion)) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("permisosRolActual");

    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRouter() {
  return (
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
            path="/retazos"
            element={
              <RutaPermitida modulo="retazos">
                <RetazosPage />
              </RutaPermitida>
            }
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
            path="/ventas"
            element={
              <RutaPermitida modulo="ventas" accion="write">
                <VentasPage />
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
  );
}

export default AppRouter;
