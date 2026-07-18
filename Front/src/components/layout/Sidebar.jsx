import {
  Activity,
  BadgeDollarSign,
  Bell,
  ClipboardList,
  Boxes,
  CircleDollarSign,
  ClipboardPlus,
  LayoutDashboard,
  LogOut,
  PackageOpen,
  Scissors,
  ShoppingCart,
  Truck,
  UserPlus,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import logo from "../../assets/polarizadosya.png";
import {
  obtenerUsuarioActual,
  tienePermiso,
} from "../../utils/permisos";

function Sidebar() {
  const navigate = useNavigate();
  const usuario = obtenerUsuarioActual();
  const rolLabel =
    usuario?.rol === "SUPERUSUARIO"
      ? "Superusuario"
      : usuario?.rol === "ADMIN"
      ? "Administrador"
      : usuario?.rol === "INVENTARIO"
      ? "Inventario"
      : usuario?.rol === "VENTAS"
      ? "Ventas"
      : "Usuario";

  const menus = [
    {
      section: "Principal",
      items: [
        {
          icon: LayoutDashboard,
          text: "Inicio",
          url: "/dashboard",
          modulo: "dashboard",
          accion: "read",
        },
        {
          icon: UserPlus,
          text: "Usuarios y perfiles",
          url: "/usuarios",
          modulo: "usuarios",
          accion: "write",
          soloAdmin: true,
        },
      ],
    },
    {
      section: "Compras",
      items: [
        {
          icon: ShoppingCart,
          text: "Pedidos de compra",
          url: "/pedidos",
          modulo: "pedidos",
          accion: "read",
        },
        {
          icon: ClipboardPlus,
          text: "Crear pedido",
          url: "/pedidos/nuevo",
          modulo: "pedidos",
          accion: "write",
        },
        {
          icon: Truck,
          text: "Entrada de mercancia",
          url: "/recepciones",
          modulo: "recepciones",
          accion: "write",
        },
        {
          icon: CircleDollarSign,
          text: "Costos por pedido",
          url: "/finanzas",
          modulo: "finanzas",
          accion: "read",
        },
      ],
    },
    {
      section: "Inventario",
      items: [
        {
          icon: Boxes,
          text: "Rollos en bodega",
          url: "/reserva",
          modulo: "rollos",
          accion: "read",
        },
        {
          icon: Activity,
          text: "Rollos en uso",
          url: "/uso",
          modulo: "rollos",
          accion: "read",
        },
        {
          icon: PackageOpen,
          text: "Retazos disponibles",
          url: "/retazos",
          modulo: "retazos",
          accion: "read",
        },
        {
          icon: Bell,
          text: "Alertas de stock",
          url: "/alertas",
          modulo: "alertas",
          accion: "read",
        },
      ],
    },
    {
      section: "Produccion",
      items: [
        {
          icon: Scissors,
          text: "Registrar cortes",
          url: "/cortes",
          modulo: "cortes",
          accion: "write",
        },
      ],
    },
    {
      section: "Comercial",
      items: [
        {
          icon: BadgeDollarSign,
          text: "Ventas",
          url: "/ventas",
          modulo: "ventas",
          accion: "write",
        },
        {
          icon: ClipboardList,
          text: "Auditoria comercial",
          url: "/auditoria",
          modulo: "finanzas",
          accion: "read",
        },
      ],
    },
  ];

  const menusPermitidos = menus
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.soloAdmin
          ? ["SUPERUSUARIO", "ADMIN"].includes(usuario?.rol)
          : tienePermiso(usuario, item.modulo, item.accion)
      ),
    }))
    .filter((group) => group.items.length > 0);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("permisosRolActual");
    navigate("/login");
  };

  return (
    <aside
      className="
      w-full
      lg:w-72
      lg:min-h-screen
      bg-[#07111f]
      text-white
      flex
      flex-col
      shrink-0
      border-r
      border-slate-800"
    >
      <div
        className="
        p-4
        lg:p-5
        border-b
        border-white/10"
      >
        <div
          className="
          bg-white
          rounded-xl
          p-3
          shadow-lg
          shadow-black/20"
        >
          <img
            src={logo}
            alt="Polarizados YA"
            className="
            w-full
            h-14
            lg:h-20
            object-contain"
          />
        </div>

        <div className="mt-3 lg:mt-4">
          <h2 className="text-lg font-bold leading-tight">
            Control operativo
          </h2>

          <p className="text-sm text-slate-400">
            Compras, inventario y cortes
          </p>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-xs uppercase text-slate-500">
              Sesion activa
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-slate-100">
                {usuario?.nombre || "Usuario"}
              </span>
              <span className="shrink-0 rounded-full bg-blue-500/15 px-2 py-1 text-[11px] font-bold text-blue-200">
                {rolLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <nav
        className="
        lg:flex-1
        overflow-y-auto
        max-h-[60vh]
        lg:max-h-none
        p-3
        lg:p-4
        space-y-4
        lg:space-y-6"
      >
        {menusPermitidos.map((group) => (
          <div key={group.section}>
            <p
              className="
              text-xs
              uppercase
              tracking-wider
              text-slate-500
              font-semibold
              mb-2
              px-3"
            >
              {group.section}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className={({ isActive }) =>
                      `
                      flex
                      items-center
                      gap-3
                      px-4
                      py-3
                      rounded-lg
                      transition
                      text-sm
                      font-medium
                      border
                      border-transparent

                      ${
                        isActive
                          ? "bg-white text-slate-950 shadow-lg shadow-black/20"
                          : "text-slate-300 hover:bg-white/[0.06] hover:text-white hover:border-white/10"
                      }
                    `
                    }
                  >
                    <Icon size={19} />
                    <span>{item.text}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className="
        p-3
        lg:p-4
        border-t
        border-white/10"
      >
        <button
          onClick={cerrarSesion}
          className="
          w-full
          flex
          items-center
          gap-3
          px-4
          py-3
          rounded-lg
          text-slate-300
          hover:bg-red-600
          hover:text-white
          transition
          text-sm
          font-medium"
        >
          <LogOut size={20} />
          Cerrar sesion
        </button>

        <p
          className="
          text-xs
          text-slate-600
          mt-4
          text-center"
        >
          Polarizados YA 2026
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
