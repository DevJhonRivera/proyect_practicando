import Swal from "sweetalert2";

import { updateCorte } from "../../api/cortes.api";
import CorteForm from "./components/CorteForm";
import CortesHeader from "./components/CortesHeader";
import CortesSearch from "./components/CortesSearch";
import CortesStats from "./components/CortesStats";
import CortesTable from "./components/CortesTable";
import {
  servicioLabels,
  tipoCorteLabels,
} from "./cortes.constants";
import { useCortesPage } from "./hooks/useCortesPage";

const mayusculas = (value) =>
  String(value || "").toUpperCase();

const soloNumeros = (value) =>
  String(value || "").replace(/\D/g, "");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function CortesPage() {
  const {
    aplicarSugerencia,
    cortesFiltrados,
    excelColumns,
    form,
    guardar,
    indicadores,
    loading,
    loadingSugerencias,
    recargar,
    rolloSeleccionado,
    rollosEnUso,
    search,
    fechaDesde,
    fechaHasta,
    setForm,
    setFechaDesde,
    setFechaHasta,
    setSearch,
    sugerencias,
    sugerenciasKey,
  } = useCortesPage();

  const editarCorte = async (corte) => {
    if (corte.ventaEstado === "PAGADA") {
      const confirmacion = await Swal.fire({
        icon: "warning",
        title: "Corte con venta pagada",
        text: "Este corte esta conectado a una venta pagada. Editelo solo si necesita corregir una auditoria.",
        showCancelButton: true,
        confirmButtonText: "Editar de todos modos",
        cancelButtonText: "Cancelar",
      });

      if (!confirmacion.isConfirmed) {
        return;
      }
    }

    const result = await Swal.fire({
      title: "Editar corte",
      html: `
        <div class="grid gap-2">
          <input id="corte-placa" class="swal2-input" placeholder="Placa" value="${escapeHtml(corte.placa || "")}" />
          <input id="corte-marca" class="swal2-input" placeholder="Marca" value="${escapeHtml(corte.marca || "")}" />
          <input id="corte-modelo" class="swal2-input" placeholder="Modelo" inputmode="numeric" value="${escapeHtml(corte.modelo || "")}" />
          <select id="corte-servicio" class="swal2-input">
            ${Object.entries(servicioLabels)
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${corte.tipoServicio === value ? "selected" : ""}>${label}</option>`
              )
              .join("")}
          </select>
          <input id="corte-instalador" class="swal2-input" placeholder="Instalador garantia" value="${escapeHtml(corte.instalador || "")}" />
          <select id="corte-tipo" class="swal2-input">
            ${Object.entries(tipoCorteLabels)
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${corte.tipoCorte === value ? "selected" : ""}>${label}</option>`
              )
              .join("")}
          </select>
          <input id="corte-venta" class="swal2-input" type="number" min="0" placeholder="Valor venta" value="${Number(corte.valorVenta || 0)}" />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const popup = Swal.getPopup();
        const valueOf = (id) =>
          popup.querySelector(id)?.value || "";
        const payload = {
          placa: mayusculas(valueOf("#corte-placa")),
          marca: mayusculas(valueOf("#corte-marca")),
          modelo: soloNumeros(valueOf("#corte-modelo")),
          tipoServicio: valueOf("#corte-servicio"),
          instalador: mayusculas(valueOf("#corte-instalador")),
          tipoCorte: valueOf("#corte-tipo"),
          valorVenta: Number(valueOf("#corte-venta") || 0),
        };

        if (!payload.placa || !payload.marca || !payload.modelo) {
          Swal.showValidationMessage(
            "Complete placa, marca y modelo"
          );
          return false;
        }

        if (
          payload.tipoServicio === "GARANTIA_INSTALADOR" &&
          !payload.instalador
        ) {
          Swal.showValidationMessage(
            "Ingrese el instalador de la garantia"
          );
          return false;
        }

        if (payload.valorVenta < 0) {
          Swal.showValidationMessage(
            "El valor de venta no puede ser negativo"
          );
          return false;
        }

        return payload;
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await updateCorte(corte._id, result.value);
      Swal.fire({
        icon: "success",
        title: "Corte actualizado",
      });
      await recargar();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible actualizar",
        text:
          error.response?.data?.message ||
          "Revise la informacion del corte",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-slate-600">
        Cargando cortes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CortesHeader onRefresh={recargar} />

      <CortesStats indicadores={indicadores} />

      <CorteForm
        form={form}
        loadingSugerencias={loadingSugerencias}
        onApplySuggestion={aplicarSugerencia}
        onChange={setForm}
        onSubmit={guardar}
        rolloSeleccionado={rolloSeleccionado}
        rollosEnUso={rollosEnUso}
        sugerencias={sugerencias}
        sugerenciasKey={sugerenciasKey}
      />

      <CortesSearch
        value={search}
        onChange={setSearch}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        onFechaDesdeChange={setFechaDesde}
        onFechaHastaChange={setFechaHasta}
      />

      <CortesTable
        cortes={cortesFiltrados}
        excelColumns={excelColumns}
        onEdit={editarCorte}
      />
    </div>
  );
}

export default CortesPage;
