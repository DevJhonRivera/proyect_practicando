import { FilterField, FilterSearch, FilterToolbar, filterControlClass } from "../../../components/ui/FilterToolbar";

function CortesSearch({
  value,
  onChange,
  fechaDesde,
  fechaHasta,
  onFechaDesdeChange,
  onFechaHastaChange,
}) {
  return (
    <FilterToolbar activeCount={[value, fechaDesde, fechaHasta].filter(Boolean).length} onClear={() => { onChange(""); onFechaDesdeChange(""); onFechaHastaChange(""); }} title="Filtros de cortes">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px] lg:items-end">
        <FilterField label="Buscar"><FilterSearch value={value} onChange={onChange} placeholder="Marca, placa, rollo, servicio o instalador"/></FilterField>

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
    </FilterToolbar>
  );
}

function FechaInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">{label}</span>
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={filterControlClass}
        />
      </div>
    </label>
  );
}

export default CortesSearch;
