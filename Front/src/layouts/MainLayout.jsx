import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import StockReservaNotifier from "../components/alertas/StockReservaNotifier";

function MainLayout() {
  return (
    <div className="flex min-h-screen">

      <Sidebar />

      <main className="flex-1 p-6 bg-slate-100">
        <Outlet />
      </main>

      <StockReservaNotifier />

    </div>
  );
}

export default MainLayout;
