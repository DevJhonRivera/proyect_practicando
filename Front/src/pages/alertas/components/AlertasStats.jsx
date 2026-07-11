import {
  AlertTriangle,
  Bell,
  Clock,
  ShieldAlert,
} from "lucide-react";

function AlertasStats({ indicadores }) {
  return (
    <div className="grid md:grid-cols-4 gap-5">
      <KpiCard
        title="Total alertas"
        value={indicadores.totalAlertas}
        icon={<Bell />}
        color="blue"
      />

      <KpiCard
        title="Criticas"
        value={indicadores.alertasCriticas}
        icon={<ShieldAlert />}
        color="red"
      />

      <KpiCard
        title="Alertas hoy"
        value={indicadores.alertasHoy}
        icon={<Clock />}
        color="orange"
      />

      <KpiCard
        title="Tipos"
        value={indicadores.tipos}
        icon={<AlertTriangle />}
        color="purple"
      />
    </div>
  );
}

function KpiCard({ title, value, icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
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

          <h2 className="text-3xl font-bold mt-1">
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

export default AlertasStats;
