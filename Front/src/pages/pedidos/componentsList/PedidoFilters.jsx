import { FilterField, FilterSearch, FilterToolbar, filterControlClass } from "../../../components/ui/FilterToolbar";

function PedidoFilters({
  search,
  setSearch,
  estado,
  setEstado,
}) {
  const limpiarFiltros = () => {
    setSearch("");
    setEstado("TODOS");
  };

  return (
    <FilterToolbar activeCount={[search, estado !== "TODOS" ? estado : ""].filter(Boolean).length} onClear={limpiarFiltros} title="Filtros de pedidos">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
        <FilterField label="Buscar"><FilterSearch value={search} onChange={setSearch} placeholder="Código o proveedor"/></FilterField>
        <FilterField label="Estado"><select
          value={estado}
          onChange={(event) =>
            setEstado(event.target.value)
          }
          className={filterControlClass}
        >
          <option value="TODOS">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="PARCIAL">Parcial</option>
          <option value="COMPLETADO">Completado</option>
          <option value="CANCELADO">Cancelado</option>
        </select></FilterField>
      </div>
    </FilterToolbar>
  );
}

export default PedidoFilters;
