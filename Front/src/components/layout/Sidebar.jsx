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
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import logo from "../../assets/polarizadosya.png";

function Sidebar() {
  const navigate = useNavigate();

  const menus = [
    {
      section: "Principal",
      items: [
        {
          icon: LayoutDashboard,
          text: "Inicio",
          url: "/dashboard",
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
        },
        {
          icon: ClipboardPlus,
          text: "Crear pedido",
          url: "/pedidos/nuevo",
        },
        {
          icon: Truck,
          text: "Entrada de mercancia",
          url: "/recepciones",
        },
        {
          icon: CircleDollarSign,
          text: "Costos por pedido",
          url: "/finanzas",
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
        },
        {
          icon: Activity,
          text: "Rollos en uso",
          url: "/uso",
        },
        {
          icon: PackageOpen,
          text: "Retazos disponibles",
          url: "/retazos",
        },
        {
          icon: Bell,
          text: "Alertas de stock",
          url: "/alertas",
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
        },
        {
          icon: ClipboardList,
          text: "Auditoria comercial",
          url: "/auditoria",
        },
      ],
    },
  ];

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  return (
    <aside
      className="
      w-72
      min-h-screen
      bg-slate-950
      text-white
      flex
      flex-col
      border-r
      border-slate-800"
    >
      <div
        className="
        p-5
        border-b
        border-slate-800"
      >
        <div
          className="
          bg-white
          rounded-2xl
          p-3
          shadow"
        >
          <img
            src={logo}
            alt="Polarizados YA"
            className="
            w-full
            h-20
            object-contain"
          />
        </div>

        <div className="mt-4">
          <h2 className="text-lg font-bold">
            Control operativo
          </h2>

          <p className="text-sm text-slate-400">
            Compras, inventario y cortes
          </p>
        </div>
      </div>

      <nav
        className="
        flex-1
        overflow-y-auto
        p-4
        space-y-6"
      >
        {menus.map((group) => (
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
                      rounded-xl
                      transition
                      text-sm
                      font-medium

                      ${
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }
                    `
                    }
                  >
                    <Icon size={20} />
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
        p-4
        border-t
        border-slate-800"
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
          rounded-xl
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
