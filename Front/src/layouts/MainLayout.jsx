import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import logo from "../assets/polarizadosya.png";
import StockReservaNotifier from "../components/alertas/StockReservaNotifier";
import { getMisPermisos } from "../api/roles.api";
import {
  guardarPermisosUsuarioActual,
  obtenerUsuarioActual,
  tienePermiso,
} from "../utils/permisos";

function MainLayout() {
  const [, setPermisosActualizados] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);
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
    <div className="flex min-h-screen bg-slate-100 lg:h-screen lg:min-h-0 lg:overflow-hidden">

      <Sidebar
        open={menuAbierto}
        onClose={cerrarMenu}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5">
              <img src={logo} alt="Polarizados YA" className="h-8 w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">Polarizados YA</p>
              <p className="text-xs text-slate-500">Control operativo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
          >
            <Menu size={22} />
          </button>
        </header>

        <main
          data-main-scroll
          className="min-w-0 flex-1 bg-slate-100 p-3 sm:p-4 lg:h-screen lg:overflow-y-auto lg:overscroll-contain lg:p-6"
        >
          <Outlet />
        </main>
      </div>

      {puedeVerAlertas && <StockReservaNotifier />}

    </div>
  );
}

export default MainLayout;
