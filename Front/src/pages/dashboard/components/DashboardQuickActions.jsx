import { Link } from "react-router-dom";
import {
  Activity,
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
    color: "bg-blue-50 text-blue-700 border-blue-100",
    modulo: "pedidos",
    accion: "write",
  },
  {
    title: "Entrada de mercancia",
    text: "Clasifica los rollos que llegaron.",
    url: "/recepciones",
    icon: Truck,
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    modulo: "recepciones",
    accion: "write",
  },
  {
    title: "Rollos en uso",
    text: "Revisa material listo para cortes.",
    url: "/uso",
    icon: Activity,
    color: "bg-amber-50 text-amber-700 border-amber-100",
    modulo: "rollos",
    accion: "read",
  },
  {
    title: "Registrar corte",
    text: "Guarda consumo por vehiculo.",
    url: "/cortes",
    icon: Scissors,
    color: "bg-indigo-50 text-indigo-700 border-indigo-100",
    modulo: "cortes",
    accion: "write",
  },
  {
    title: "Costos por pedido",
    text: "Calcula costo real de rollos.",
    url: "/finanzas",
    icon: CircleDollarSign,
    color: "bg-slate-50 text-slate-700 border-slate-200",
    modulo: "finanzas",
    accion: "read",
  },
  {
    title: "Ventas",
    text: "Registra valores de venta por vehiculo.",
    url: "/ventas",
    icon: BadgeDollarSign,
    color: "bg-rose-50 text-rose-700 border-rose-100",
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
    <section className="bg-white rounded-2xl shadow p-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">
          Acciones rapidas
        </h2>
        <p className="text-sm text-slate-500">
          Empieza por el paso que necesitas hacer hoy.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        {accionesPermitidas.map((accion) => {
          const Icon = accion.icon;

          return (
            <Link
              key={accion.url}
              to={accion.url}
              className={`border rounded-xl p-4 hover:shadow-md transition ${accion.color}`}
            >
              <Icon size={24} />
              <h3 className="font-bold mt-3">
                {accion.title}
              </h3>
              <p className="text-sm mt-1 opacity-80">
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
