import { Search } from "lucide-react";

function CortesSearch({
  value,
  onChange,
  fechaDesde,
  fechaHasta,
  onFechaDesdeChange,
  onFechaHastaChange,
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_180px_180px] gap-3">
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
            className="w-full border rounded-xl p-3 pl-10"
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
      <span className="text-xs font-semibold text-slate-500">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full border rounded-xl p-3"
      />
    </label>
  );
}

export default CortesSearch;
