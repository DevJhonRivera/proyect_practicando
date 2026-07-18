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
    blue: {
      accent: "bg-blue-500",
      icon: "bg-blue-50 text-blue-700 ring-blue-100",
      text: "text-blue-700",
    },
    red: {
      accent: "bg-red-500",
      icon: "bg-red-50 text-red-700 ring-red-100",
      text: "text-red-700",
    },
    orange: {
      accent: "bg-amber-500",
      icon: "bg-amber-50 text-amber-700 ring-amber-100",
      text: "text-amber-700",
    },
    purple: {
      accent: "bg-violet-500",
      icon: "bg-violet-50 text-violet-700 ring-violet-100",
      text: "text-violet-700",
    },
  };
  const theme = colors[color];

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 ${theme.accent}`} />

      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {title}
          </p>

          <h2 className={`mt-2 text-4xl font-black ${theme.text}`}>
            {value}
          </h2>
        </div>

        <div className={`rounded-xl p-3 ring-1 ${theme.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default AlertasStats;
