import {
  Activity,
  BadgeDollarSign,
  BookOpen,
  Bell,
  Car,
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
  X,
} from "lucide-react";

import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../../assets/polarizadosya.png";
import {
  obtenerUsuarioActual,
  tienePermiso,
} from "../../utils/permisos";
import { cerrarSesion as cerrarSesionUsuario } from "../../utils/session";

function Sidebar({ open = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const usuario = obtenerUsuarioActual();
  const iniciales = String(usuario?.nombre || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toUpperCase();
  const rolLabel =
    usuario?.rol === "SUPERUSUARIO"
      ? "Superusuario"
      : usuario?.rol === "ADMIN"
      ? "Administrador"
      : usuario?.rol === "INVENTARIO"
      ? "Inventario"
      : usuario?.rol === "VENTAS"
      ? "Ventas"
      : usuario?.rol === "ASESOR"
      ? "Asesor"
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
        {
          icon: Car,
          text: "Piezas PPF",
          url: "/piezas-ppf",
          modulo: "piezasPpf",
          accion: "read",
        },
      ],
    },
    {
      section: "Comercial",
      items: [
        {
          icon: BookOpen,
          text: "Catálogo para asesores",
          url: "/asesores",
          modulo: "asesores",
          accion: "read",
        },
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
    cerrarSesionUsuario({
      redirect: false,
    });
    navigate("/login");
  };

  useEffect(() => {
    if (!open) return undefined;

    const cerrarConEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [open, onClose]);

  return (
    <>
    {open && (
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[1px] lg:hidden"
        onClick={onClose}
        aria-label="Cerrar menú"
      />
    )}
    <aside
      className={`
      fixed inset-y-0 left-0 z-50
      h-dvh w-[min(86vw,20rem)]
      transition-transform duration-200 ease-out
      ${open ? "visible translate-x-0" : "invisible -translate-x-full"}
      lg:visible lg:static lg:z-auto lg:h-screen lg:w-72 lg:translate-x-0
      min-h-0 overflow-hidden
      bg-slate-950
      text-white
      flex
      flex-col
      shrink-0
      border-r
      border-white/[0.08]
      shadow-2xl shadow-slate-950/30
      lg:shadow-xl lg:shadow-slate-950/10`}
      aria-label="Navegación principal"
    >
      <div
        className="
        px-4
        py-4
        shrink-0
        border-b
        border-white/[0.08]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-white px-2 shadow-sm shadow-black/20">
            <img
              src={logo}
              alt="Polarizados YA"
              className="h-10 w-full object-contain"
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight text-white">
              Polarizados YA
            </h1>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              Control operativo
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.08] hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-white/[0.08] pt-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-bold text-blue-200 ring-1 ring-inset ring-blue-400/20">
            {iniciales}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">
              {usuario?.nombre || "Usuario"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{rolLabel}</p>
          </div>
        </div>
      </div>

      <nav
        className="
        flex-1
        min-h-0
        overflow-y-auto
        overscroll-contain
        px-3
        py-4
        space-y-5
        sidebar-scroll"
      >
        {menusPermitidos.map((group) => (
          <div key={group.section}>
            <p
              className="
              text-xs
              uppercase
              tracking-[0.08em]
              text-slate-600
              font-semibold
              mb-1.5
              px-2.5"
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
                    onClick={onClose}
                    className={({ isActive }) =>
                      `
                      flex
                      items-center
                      gap-3
                      min-h-10
                      px-3
                      py-2
                      rounded-lg
                      transition-colors
                      duration-150
                      text-sm
                      font-medium
                      relative

                      ${
                        isActive
                          ? "bg-blue-500/15 text-white shadow-sm shadow-black/10 before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-blue-400"
                          : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"
                      }
                    `
                    }
                  >
                    <Icon size={18} strokeWidth={1.9} className="shrink-0" />
                    <span className="truncate">{item.text}</span>
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
        shrink-0
        border-t
        border-white/[0.08]"
      >
        <button
          onClick={cerrarSesion}
          className="
          w-full
          flex
          items-center
          gap-3
          min-h-10
          px-3
          py-2
          rounded-lg
          text-slate-400
          hover:bg-red-500/10
          hover:text-red-300
          transition-colors
          text-sm
          font-medium"
        >
          <LogOut size={18} strokeWidth={1.9} />
          Cerrar sesion
        </button>

        <p className="mt-2 px-3 text-[10px] text-slate-700">
          Polarizados YA 2026
        </p>
      </div>
    </aside>
    </>
  );
}

export default Sidebar;
