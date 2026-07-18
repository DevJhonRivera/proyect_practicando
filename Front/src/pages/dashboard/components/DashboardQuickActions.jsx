import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  CircleDollarSign,
  ClipboardPlus,
  Scissors,
  Truck,
} from "lucide-react";
import {
  obtenerUsuarioActual,
  tienePermiso,
} from "../../../utils/permisos";

const acciones = [
  {
    title: "Crear pedido",
    text: "Registra una compra al proveedor.",
    url: "/pedidos/nuevo",
    icon: ClipboardPlus,
    color: "bg-blue-600",
    surface: "border-blue-100 hover:border-blue-200",
    modulo: "pedidos",
    accion: "write",
  },
  {
    title: "Entrada de mercancia",
    text: "Clasifica los rollos que llegaron.",
    url: "/recepciones",
    icon: Truck,
    color: "bg-emerald-600",
    surface: "border-emerald-100 hover:border-emerald-200",
    modulo: "recepciones",
    accion: "write",
  },
  {
    title: "Rollos en uso",
    text: "Revisa material listo para cortes.",
    url: "/uso",
    icon: Activity,
    color: "bg-amber-500",
    surface: "border-amber-100 hover:border-amber-200",
    modulo: "rollos",
    accion: "read",
  },
  {
    title: "Registrar corte",
    text: "Guarda consumo por vehiculo.",
    url: "/cortes",
    icon: Scissors,
    color: "bg-indigo-600",
    surface: "border-indigo-100 hover:border-indigo-200",
    modulo: "cortes",
    accion: "write",
  },
  {
    title: "Costos por pedido",
    text: "Calcula costo real de rollos.",
    url: "/finanzas",
    icon: CircleDollarSign,
    color: "bg-slate-900",
    surface: "border-slate-200 hover:border-slate-300",
    modulo: "finanzas",
    accion: "read",
  },
  {
    title: "Ventas",
    text: "Registra valores de venta por vehiculo.",
    url: "/ventas",
    icon: BadgeDollarSign,
    color: "bg-rose-600",
    surface: "border-rose-100 hover:border-rose-200",
    modulo: "ventas",
    accion: "write",
  },
];

function DashboardQuickActions() {
  const usuario = obtenerUsuarioActual();
  const accionesPermitidas = acciones.filter((accion) =>
    tienePermiso(usuario, accion.modulo, accion.accion)
  );

  if (accionesPermitidas.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">
          Acciones rapidas
        </h2>
        <p className="text-sm text-slate-500">
          Empieza por el paso que necesitas hacer hoy.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {accionesPermitidas.map((accion) => {
          const Icon = accion.icon;

          return (
            <Link
              key={accion.url}
              to={accion.url}
              className={`group rounded-xl border bg-white p-4 transition hover:shadow-md ${accion.surface}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`${accion.color} rounded-xl p-2.5 text-white shadow-sm`}>
                  <Icon size={20} />
                </div>
                <ArrowRight
                  size={18}
                  className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500"
                />
              </div>
              <h3 className="mt-4 font-bold text-slate-900">
                {accion.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {accion.text}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default DashboardQuickActions;
