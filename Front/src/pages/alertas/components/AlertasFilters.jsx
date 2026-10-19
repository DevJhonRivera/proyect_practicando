import { FilterField, FilterSearch, FilterToolbar, filterControlClass } from "../../../components/ui/FilterToolbar";

function AlertasFilters({
  estado,
  onEstadoChange,
  onSearchChange,
  onTipoChange,
  search,
  tipo,
  tipos,
}) {
  const activos = [search, tipo !== "TODOS" ? tipo : "", estado !== "PENDIENTES" ? estado : ""].filter(Boolean).length;
  const limpiar = () => { onSearchChange(""); onTipoChange("TODOS"); onEstadoChange("PENDIENTES"); };
  return (
    <FilterToolbar activeCount={activos} onClear={limpiar} title="Filtros de alertas">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-end">
        <FilterField label="Buscar"><FilterSearch value={search} onChange={onSearchChange} placeholder="Tipo o mensaje"/></FilterField>
        <FilterField label="Tipo"><select value={tipo} onChange={(e) => onTipoChange(e.target.value)} className={filterControlClass}>
            {tipos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select></FilterField>
        <FilterField label="Estado"><select value={estado} onChange={(e) => onEstadoChange(e.target.value)} className={filterControlClass}>
            <option value="PENDIENTES">
              Pendientes
            </option>
            <option value="ATENDIDAS">
              Atendidas
            </option>
            <option value="TODAS">
              Todas
            </option>
          </select></FilterField>
      </div>
    </FilterToolbar>
  );
}

export default AlertasFilters;
