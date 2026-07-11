import { CheckCircle } from "lucide-react";

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
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-bold mb-4">
        Ultimas alertas
      </h2>

      {alertas.length === 0 ? (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-2">
          <CheckCircle size={18} />
          No hay alertas recientes.
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((alerta) => (
            <div
              key={alerta._id}
              className="border rounded-xl p-4 flex justify-between items-start hover:bg-slate-50"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <TipoBadge tipo={alerta.tipo} />
                  <EstadoBadge atendida={alerta.atendida} />
                </div>

                <p className="text-slate-700 mt-2">
                  {alerta.mensaje}
                </p>
              </div>

              <span className="text-sm text-slate-500">
                {new Date(alerta.createdAt).toLocaleDateString()}
              </span>
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
    <div className="bg-slate-900 text-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-bold mb-4">
        Estado general
      </h2>

      <p className="text-slate-300">
        El sistema tiene actualmente:
      </p>

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

        <div className="flex justify-between">
          <span>Estado</span>
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
    <div className="flex justify-between border-b border-slate-700 pb-3">
      <span>{label}</span>
      <strong className={valueClassName}>
        {value}
      </strong>
    </div>
  );
}

export default AlertasSummary;
