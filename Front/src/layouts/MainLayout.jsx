import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import StockReservaNotifier from "../components/alertas/StockReservaNotifier";
import { getMisPermisos } from "../api/roles.api";
import {
  guardarPermisosUsuarioActual,
  obtenerUsuarioActual,
  tienePermiso,
} from "../utils/permisos";

function MainLayout() {
  const [, setPermisosActualizados] = useState(0);
  const usuario = obtenerUsuarioActual();
  const puedeVerAlertas = tienePermiso(
    usuario,
    "alertas",
    "read"
  );

  useEffect(() => {
    let active = true;

    const cargarPermisos = async () => {
      try {
        const res = await getMisPermisos();
        guardarPermisosUsuarioActual(
          res.data.rol,
          res.data.permisos || []
        );

        if (active) {
          setPermisosActualizados((actual) => actual + 1);
        }
      } catch {
        if (active) {
          setPermisosActualizados((actual) => actual + 1);
        }
      }
    };

    cargarPermisos();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:flex-row lg:overflow-hidden">

      <Sidebar />

      <main
        data-main-scroll
        className="min-w-0 flex-1 bg-slate-100 p-4 lg:h-screen lg:overflow-y-auto lg:overscroll-contain lg:p-6"
      >
        <Outlet />
      </main>

      {puedeVerAlertas && <StockReservaNotifier />}

    </div>
  );
}

export default MainLayout;
