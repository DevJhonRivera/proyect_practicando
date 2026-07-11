import {
  Car,
  ClipboardList,
  Ruler,
  Scissors,
} from "lucide-react";

function CortesStats({ indicadores }) {
  return (
    <div className="grid md:grid-cols-4 gap-5">
      <KpiCard
        title="Cortes"
        value={indicadores.totalCortes}
        icon={<Scissors />}
        color="blue"
      />

      <KpiCard
        title="Metros usados"
        value={`${indicadores.totalMetros.toFixed(2)} m`}
        icon={<Ruler />}
        color="green"
      />

      <KpiCard
        title="Vehiculos"
        value={indicadores.vehiculosAtendidos}
        icon={<Car />}
        color="orange"
      />

      <KpiCard
        title="Promedio corte"
        value={`${indicadores.promedioCorte.toFixed(2)} m`}
        icon={<ClipboardList />}
        color="purple"
      />
    </div>
  );
}

function KpiCard({ title, value, icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-500 text-sm">
            {title}
          </p>

          <h2 className="text-2xl font-bold mt-1">
            {value}
          </h2>
        </div>

        <div className={`p-3 rounded-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default CortesStats;
