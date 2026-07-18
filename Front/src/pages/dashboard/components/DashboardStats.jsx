import {
  Archive,
  Package,
  Ruler,
  Truck,
  Wrench,
  XCircle,
} from "lucide-react";

function DashboardStats({ indicadores }) {
  const cards = [
    {
      titulo: "Total rollos",
      valor: indicadores.totalRollos || 0,
      icono: Package,
      color: "bg-blue-600 text-white",
      borde: "border-blue-100",
      descripcion: "Rollos registrados",
    },
    {
      titulo: "Metros disponibles",
      valor: `${Number(indicadores.metrosDisponibles || 0).toFixed(2)} m`,
      icono: Ruler,
      color: "bg-emerald-600 text-white",
      borde: "border-emerald-100",
      descripcion: "Inventario disponible",
    },
    {
      titulo: "En uso",
      valor: indicadores.enUso || 0,
      icono: Wrench,
      color: "bg-amber-500 text-white",
      borde: "border-amber-100",
      descripcion: "Rollos activos para cortes",
    },
    {
      titulo: "Bodega",
      valor: indicadores.reserva || 0,
      icono: Archive,
      color: "bg-indigo-600 text-white",
      borde: "border-indigo-100",
      descripcion: "Rollos guardados",
    },
    {
      titulo: "Entrada",
      valor: indicadores.recepcion || 0,
      icono: Truck,
      color: "bg-cyan-600 text-white",
      borde: "border-cyan-100",
      descripcion: "Pendientes de clasificar",
    },
    {
      titulo: "Agotados",
      valor: indicadores.agotados || 0,
      icono: XCircle,
      color: "bg-red-600 text-white",
      borde: "border-red-100",
      descripcion: "Sin metros disponibles",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icono;

        return (
          <article
            key={card.titulo}
            className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.borde}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500">
                  {card.titulo}
                </p>
                <p className="mt-2 break-words text-3xl font-bold text-slate-950">
                  {card.valor}
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  {card.descripcion}
                </p>
              </div>

              <div className={`shrink-0 rounded-xl p-3 shadow-sm ${card.color}`}>
                <Icon size={24} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default DashboardStats;
