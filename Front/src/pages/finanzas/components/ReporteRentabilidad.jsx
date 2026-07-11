import { TrendingUp } from "lucide-react";

import { formatoCop } from "../finanzas.helpers";

function ReporteRentabilidad({ reporte }) {
  const rentabilidad =
    reporte?.rentabilidad || {};

  return (
    <section className="bg-slate-900 text-white rounded-2xl shadow p-6">
      <div className="flex items-center gap-3 mb-5">
        <TrendingUp className="text-green-400" />
        <div>
          <h2 className="text-lg font-bold">
            Rentabilidad de cortes
          </h2>
          <p className="text-sm text-slate-400">
            Ventas, costo de material y utilidad bruta.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric
          label="Ventas registradas"
          value={formatoCop.format(rentabilidad.totalVentas || 0)}
        />
        <Metric
          label="Costo material"
          value={formatoCop.format(rentabilidad.costoMaterial || 0)}
        />
        <Metric
          label="Utilidad bruta"
          value={formatoCop.format(rentabilidad.utilidadBruta || 0)}
        />
      </div>

      <div className="mt-5 border-t border-slate-700 pt-4 flex justify-between text-sm">
        <span className="text-slate-400">
          Margen bruto
        </span>
        <strong>
          {Number(rentabilidad.margenBrutoPorcentaje || 0).toFixed(2)}%
        </strong>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-white/10 rounded-xl p-4">
      <p className="text-sm text-slate-400">
        {label}
      </p>
      <p className="text-xl font-bold mt-1">
        {value}
      </p>
    </div>
  );
}

export default ReporteRentabilidad;
