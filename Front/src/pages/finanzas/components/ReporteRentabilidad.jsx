import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { formatoCop, formatoNumero } from "../finanzas.helpers";
import { getReporteFinanciero } from "../../../api/finanzas.api";

const fechaColombia = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota" }).format(new Date());
const iso = (fecha) => fecha.toISOString().slice(0, 10);

function rango(periodo, dia) {
  if (periodo === "todos") return {};
  if (periodo === "dia") return { desde: dia, hasta: dia };
  const fecha = new Date(`${dia}T00:00:00Z`);
  if (periodo === "semana") {
    fecha.setUTCDate(fecha.getUTCDate() - (fecha.getUTCDay() + 6) % 7);
    const desde = iso(fecha);
    fecha.setUTCDate(fecha.getUTCDate() + 6);
    return { desde, hasta: iso(fecha) };
  }
  fecha.setUTCMonth(fecha.getUTCMonth() + 1, 0);
  return { desde: `${dia.slice(0, 7)}-01`, hasta: iso(fecha) };
}

function ReporteRentabilidad({ reporte }) {
  const [periodo, setPeriodo] = useState("todos");
  const [dia, setDia] = useState(fechaColombia);
  const [material, setMaterial] = useState("");
  const [resultado, setResultado] = useState(null);
  const clave = JSON.stringify([periodo, dia, material]);
  const filtrado = periodo !== "todos" || !!material;
  useEffect(() => {
    if (!filtrado) return;
    const control = new AbortController();
    getReporteFinanciero({ ...rango(periodo, dia), material }, control.signal)
      .then(({ data }) => { if (!control.signal.aborted) setResultado({ clave, reporte, data }); })
      .catch(() => { if (!control.signal.aborted) setResultado({ clave, reporte, error: true }); });
    return () => control.abort();
  }, [clave, dia, filtrado, material, periodo, reporte]);
  const actual = resultado?.clave === clave && resultado.reporte === reporte ? resultado : null;
  const rentabilidad = (filtrado ? actual?.data : reporte)?.rentabilidad || {};

  return (
    <section className="bg-slate-900 text-white rounded-2xl shadow p-6">
      <div className="flex items-center gap-3 mb-5">
        <TrendingUp className="text-green-400" />
        <div>
          <h2 className="text-lg font-bold">
            Rentabilidad de cortes
          </h2>
          <p className="text-sm text-slate-400">
            Períodos según la fecha de venta en Colombia. El costo incluye los cortes vinculados a esas ventas.
          </p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-4 text-sm">
        <label>Período
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="mt-1 block rounded-lg bg-white p-2 text-slate-900">
            <option value="todos">Todo el historial</option>
            <option value="mes">Mes</option>
            <option value="semana">Semana (lunes a domingo)</option>
            <option value="dia">Día</option>
          </select>
        </label>
        {periodo !== "todos" && <label>Fecha de referencia
          <input type="date" value={dia} onChange={(e) => { if (e.target.value) setDia(e.target.value); }} className="mt-1 block rounded-lg bg-white p-2 text-slate-900" />
        </label>}
        <label>Material
          <select value={material} onChange={(e) => setMaterial(e.target.value)} className="mt-1 block rounded-lg bg-white p-2 text-slate-900">
            <option value="">Todos los materiales</option>
            {(reporte?.materiales || []).map((nombre) => <option key={nombre}>{nombre}</option>)}
          </select>
        </label>
      </div>
      {filtrado && !actual ? <p role="status">Calculando rentabilidad…</p> : actual?.error && filtrado ? <p role="alert">No se pudo calcular el reporte.</p> : <>
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
        <Metric
          label="Costo de material sobre ventas"
          value={rentabilidad.costoSobreVentasPorcentaje == null ? "Sin ventas" : `${formatoNumero.format(rentabilidad.costoSobreVentasPorcentaje)}%`}
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
      </>}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card bg-white/10 rounded-xl p-4">
      <p className="text-sm text-slate-400">
        {label}
      </p>
      <p className="metric-value font-bold mt-1">
        {value}
      </p>
    </div>
  );
}

export default ReporteRentabilidad;
