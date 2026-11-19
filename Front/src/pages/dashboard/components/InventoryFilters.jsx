import { FilterField, FilterToolbar, filterControlClass } from "../../../components/ui/FilterToolbar";
import { etiquetaDetalle } from "../../../utils/materiales";

function InventoryFilters({ materiales, porcentajes, estados, material, porcentaje, estado, orden, setMaterial, setPorcentaje, setEstado, setOrden }) {
  const limpiarFiltros = () => { setMaterial("TODOS"); setPorcentaje("TODOS"); setEstado("TODOS"); setOrden("material"); };
  const activos = [material !== "TODOS" ? material : "", porcentaje !== "TODOS" ? porcentaje : "", estado !== "TODOS" ? estado : "", orden !== "material" ? orden : ""].filter(Boolean).length;
  return (
    <FilterToolbar title="Filtros de inventario" activeCount={activos} onClear={limpiarFiltros} className="rounded-none border-x-0 border-t-0 shadow-none">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FilterField label="Material"><select value={material} onChange={(e) => setMaterial(e.target.value)} className={filterControlClass}>{materiales.map((item) => <option key={item} value={item}>{item}</option>)}</select></FilterField>
        <FilterField label="Clasificación"><select value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} className={filterControlClass}>{porcentajes.map((item) => <option key={item} value={item}>{item === "TODOS" ? "TODOS" : etiquetaDetalle({ porcentaje: item, tipoPolarizado: material === "TODOS" ? "" : material })}</option>)}</select></FilterField>
        <FilterField label="Estado"><select value={estado} onChange={(e) => setEstado(e.target.value)} className={filterControlClass}>{estados.map((item) => <option key={item} value={item}>{item}</option>)}</select></FilterField>
        <FilterField label="Ordenar por"><select value={orden} onChange={(e) => setOrden(e.target.value)} className={filterControlClass}><option value="material">Material (A-Z)</option><option value="porcentaje">Clasificación</option><option value="rollos">Mayor cantidad de rollos</option><option value="metros">Mayor cantidad de metros</option></select></FilterField>
      </div>
    </FilterToolbar>
  );
}

export default InventoryFilters;
