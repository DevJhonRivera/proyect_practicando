import { CalendarDays, Search } from "lucide-react";

function CortesSearch({
  value,
  onChange,
  fechaDesde,
  fechaHasta,
  onFechaDesdeChange,
  onFechaHastaChange,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-bold text-slate-800">
          Buscar cortes
        </h2>
        <p className="text-sm text-slate-500">
          Filtra por texto o por rango de fechas.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-3.5 text-slate-400"
          />

          <input
            type="text"
            placeholder="Buscar por marca, modelo, placa, rollo, retazo, servicio, instalador o tipo de corte..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-3 pl-10 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <FechaInput
          label="Desde"
          value={fechaDesde}
          onChange={onFechaDesdeChange}
        />

        <FechaInput
          label="Hasta"
          value={fechaHasta}
          onChange={onFechaHastaChange}
        />
      </div>
    </div>
  );
}

function FechaInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="relative mt-1">
        <CalendarDays
          size={18}
          className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
        />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
        />
      </div>
    </label>
  );
}

export default CortesSearch;
