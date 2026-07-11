import AlertasFilters from "./components/AlertasFilters";
import AlertasHeader from "./components/AlertasHeader";
import AlertasStats from "./components/AlertasStats";
import AlertasSummary from "./components/AlertasSummary";
import AlertasTable from "./components/AlertasTable";
import { useAlertasPage } from "./hooks/useAlertasPage";

function AlertasPage() {
  const {
    alertasFiltradas,
    atender,
    atenderVisibles,
    cargar,
    estado,
    excelColumns,
    indicadores,
    loading,
    pendientesFiltradas,
    search,
    setEstado,
    setSearch,
    setTipo,
    tipo,
    tipos,
    ultimasAlertas,
  } = useAlertasPage();

  if (loading) {
    return (
      <div className="p-8 text-slate-600">
        Cargando alertas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AlertasHeader onRefresh={cargar} />

      <AlertasStats indicadores={indicadores} />

      <AlertasFilters
        estado={estado}
        onEstadoChange={setEstado}
        onSearchChange={setSearch}
        onTipoChange={setTipo}
        search={search}
        tipo={tipo}
        tipos={tipos}
      />

      <AlertasSummary
        indicadores={indicadores}
        ultimasAlertas={ultimasAlertas}
      />

      <AlertasTable
        alertas={alertasFiltradas}
        columnasExcel={excelColumns}
        onAtender={atender}
        onAtenderVisibles={atenderVisibles}
        pendientes={pendientesFiltradas}
      />
    </div>
  );
}

export default AlertasPage;
