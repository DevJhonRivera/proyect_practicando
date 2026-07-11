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

import PrivateRoute from "./PrivateRoute";
import MainLayout from "../layouts/MainLayout";

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
            path="/pedidos"
            element={<PedidoList />}
          />

          <Route
            path="/pedidos/nuevo"
            element={<PedidoCreate />}
          />

          <Route
            path="/recepciones"
            element={<RecepcionList />}
          />

          <Route
            path="/reserva"
            element={<ReservaPage />}
          />

          <Route
            path="/uso"
            element={<UsoPage />}
          />

          <Route
            path="/cortes"
            element={<CortesPage />}
          />

          <Route
            path="/retazos"
            element={<RetazosPage />}
          />

          <Route
            path="/alertas"
            element={<AlertasPage />}
          />

          <Route
            path="/finanzas"
            element={<FinanzasPage />}
          />

          <Route
            path="/ventas"
            element={<VentasPage />}
          />

          <Route
            path="/auditoria"
            element={<AuditoriaPage />}
          />

        </Route>

      </Route>

    </Routes>
  );
}

export default AppRouter;
