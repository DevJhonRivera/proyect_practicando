import { useState } from "react";
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
  const [vistaCortes, setVistaCortes] =
    useState("registrar");

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
    retazoSeleccionado,
    retazosDisponibles,
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
          <input id="corte-tipo-detalle" class="swal2-input" placeholder="Detalle del corte" value="${escapeHtml(corte.tipoCorteDetalle || "")}" />
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      didOpen: () => {
        const popup = Swal.getPopup();
        const tipo = popup.querySelector("#corte-tipo");
        const detalle = popup.querySelector("#corte-tipo-detalle");
        const actualizarDetalle = () => {
          detalle.style.display = tipo.value === "OTROS" ? "block" : "none";
          if (tipo.value !== "OTROS") {
            detalle.value = "";
          }
        };

        tipo.addEventListener("change", actualizarDetalle);
        actualizarDetalle();
      },
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
          tipoCorteDetalle: mayusculas(valueOf("#corte-tipo-detalle")),
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

        if (
          payload.tipoCorte === "OTROS" &&
          !payload.tipoCorteDetalle
        ) {
          Swal.showValidationMessage(
            "Ingrese el detalle del corte"
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

      <CortesTabs
        vista={vistaCortes}
        onChange={setVistaCortes}
        total={cortesFiltrados.length}
      />

      {vistaCortes === "registrar" && (
        <CorteForm
          form={form}
          loadingSugerencias={loadingSugerencias}
          onApplySuggestion={aplicarSugerencia}
          onChange={setForm}
          onSubmit={guardar}
          retazoSeleccionado={retazoSeleccionado}
          retazosDisponibles={retazosDisponibles}
          rolloSeleccionado={rolloSeleccionado}
          rollosEnUso={rollosEnUso}
          sugerencias={sugerencias}
          sugerenciasKey={sugerenciasKey}
        />
      )}

      {vistaCortes === "historial" && (
        <>
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
        </>
      )}
    </div>
  );
}

function CortesTabs({ vista, onChange, total }) {
  const tabs = [
    {
      id: "registrar",
      label: "Registrar corte",
      detail: "Formulario de trabajo",
    },
    {
      id: "historial",
      label: "Historial",
      detail: `${total} cortes filtrados`,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="grid gap-2 md:grid-cols-2">
        {tabs.map((tab) => {
          const activo = vista === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded-xl px-4 py-3 text-left transition ${
                activo
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-bold">
                {tab.label}
              </span>
              <span
                className={`block text-xs ${
                  activo ? "text-slate-300" : "text-slate-400"
                }`}
              >
                {tab.detail}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CortesPage;
