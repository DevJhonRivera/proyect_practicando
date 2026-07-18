import {
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";

import {
  EstadoBadge,
  TipoBadge,
} from "./AlertBadges";

function AlertasSummary({
  indicadores,
  ultimasAlertas,
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <UltimasAlertas alertas={ultimasAlertas} />
      <EstadoGeneral indicadores={indicadores} />
    </div>
  );
}

function UltimasAlertas({ alertas }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-600">
            Actividad reciente
          </p>

          <h2 className="text-xl font-black text-slate-900">
            Ultimas alertas
          </h2>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-100">
          <AlertTriangle size={20} />
        </div>
      </div>

      {alertas.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-green-700">
          <CheckCircle size={20} />
          <span className="font-semibold">
            No hay alertas recientes.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((alerta) => (
            <div
              key={alerta._id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-100 hover:bg-red-50/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <TipoBadge tipo={alerta.tipo} />
                    <EstadoBadge atendida={alerta.atendida} />
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {alerta.mensaje}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  {new Date(alerta.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EstadoGeneral({ indicadores }) {
  const requiereRevision =
    indicadores.alertasCriticas > 0;

  return (
    <div className="rounded-xl bg-slate-950 p-6 text-white shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Diagnostico
          </p>

          <h2 className="text-xl font-black">
            Estado general
          </h2>
        </div>

        <div
          className={
            requiereRevision
              ? "flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-300 ring-1 ring-red-400/20"
              : "flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15 text-green-300 ring-1 ring-green-400/20"
          }
        >
          {requiereRevision
            ? <AlertTriangle size={20} />
            : <ShieldCheck size={20} />}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <Metric
          label="Total de alertas filtradas"
          value={indicadores.totalAlertas}
        />
        <Metric
          label="Alertas criticas"
          value={indicadores.alertasCriticas}
          valueClassName="text-red-400"
        />
        <Metric
          label="Alertas generadas hoy"
          value={indicadores.alertasHoy}
        />

        <div className="flex justify-between rounded-xl bg-white/5 px-4 py-3">
          <span className="text-slate-300">Estado</span>
          <strong
            className={
              requiereRevision
                ? "text-red-400"
                : "text-green-400"
            }
          >
            {requiereRevision
              ? "Requiere revision"
              : "Estable"}
          </strong>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClassName = "",
}) {
  return (
    <div className="flex justify-between border-b border-slate-800 pb-3">
      <span className="text-slate-300">{label}</span>
      <strong className={valueClassName}>
        {value}
      </strong>
    </div>
  );
}

export default AlertasSummary;
