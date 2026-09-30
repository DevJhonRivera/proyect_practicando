import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import Swal from "sweetalert2";

import { updateCorte } from "../../api/cortes.api";
import { enviarAsesoriaAVentas, getAsesoriaPorId } from "../../api/asesores.api";
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
import { obtenerUsuarioActual } from "../../utils/permisos";
import NovedadAsesoriaModal from "../asesores/NovedadAsesoriaModal";

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
  const usuario = obtenerUsuarioActual();
  const puedeEditar = ["ADMIN", "SUPERUSUARIO"].includes(usuario?.rol);
  const [searchParams] = useSearchParams();
  const [ordenAsesoria, setOrdenAsesoria] = useState(null);
  const [reportandoNovedad, setReportandoNovedad] = useState(false);
  const [vistaCortes, setVistaCortes] =
    useState("registrar");

  const {
    aplicarSugerencia,
    aplicarVehiculo,
    cortes,
    cortesFiltrados,
    excelColumns,
    form,
    guardar,
    indicadores,
    loading,
    loadingPiezasPpf,
    loadingSugerencias,
    mantenerDatosCarro,
    esPpfSeleccionado,
    piezasPpfCatalogo,
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
    setMantenerDatosCarro,
    setSearch,
    sugerencias,
    sugerenciasKey,
    vehiculosSugeridos,
  } = useCortesPage();

  useEffect(() => {
    const asesoriaId = searchParams.get("asesoria");
    if (!asesoriaId) return;
    let activa = true;
    getAsesoriaPorId(asesoriaId)
      .then((response) => {
        if (activa) setOrdenAsesoria(response.data?.data || null);
      })
      .catch((error) => Swal.fire({
        icon: "error",
        title: "No se pudo abrir el servicio",
        text: error.response?.data?.message || "La orden ya no está disponible.",
      }));
    return () => { activa = false; };
  }, [searchParams]);

  const cargarLineaAsesoria = (linea) => {
    if (ordenAsesoria?.garantia?.esGarantia && ordenAsesoria.garantia.estado !== "APROBADA") {
      Swal.fire({ icon: "warning", title: "Garantía pendiente", text: "Administración debe aprobar la garantía antes de consumir material." });
      return;
    }
    const yaRegistrado = cortes.some((corte) =>
      String(corte.asesoriaId || "") === String(ordenAsesoria?._id || "") &&
      corte.asesoriaLinea === linea.etiqueta
    );
    if (yaRegistrado) {
      Swal.fire({ icon: "warning", title: "Corte ya registrado", text: "Esta línea de material ya fue descontada. Use el historial si necesita corregirla." });
      return;
    }
    const materialSolicitado = String(linea.material || linea.referencia || "").trim().toUpperCase();
    const clasificacionSolicitada = Number(String(linea.porcentaje || "").match(/[\d.]+/)?.[0] || 0);
    const unidadSolicitada = String(linea.porcentaje || "").toUpperCase().includes("MICRAS")
      ? "MICRAS"
      : linea.clase === "PPF" ? "NINGUNA" : "PORCENTAJE";
    const rollo = rollosEnUso.find((item) => {
      const tipoRollo = String(item.tipoPolarizado || "").toUpperCase();
      const coincideMaterial = tipoRollo === materialSolicitado ||
        tipoRollo.includes(materialSolicitado) ||
        materialSolicitado.includes(tipoRollo);
      const coincideUnidad = (item.unidadMedida || "PORCENTAJE") === unidadSolicitada;
      const coincideClasificacion = unidadSolicitada === "NINGUNA" ||
        Number(item.porcentaje || 0) === clasificacionSolicitada;
      return coincideMaterial && coincideUnidad && coincideClasificacion;
    });
    const partes = linea.partes || [];
    const parte = partes[0] || "";
    const tipos = ["PANORAMICO", "LUNETA", "DELANTERAS", "TRASERAS", "FIJOS", "SUNROOF", "COMPLETO"];
    const tipoCorte = linea.clase === "PPF"
      ? "PIEZAS_PPF"
      : partes.length > 1 ? "OTROS" : tipos.includes(parte) ? parte : parte ? "OTROS" : "COMPLETO";
    const piezasPpf = linea.clase === "PPF"
      ? (partes.length ? partes : [linea.aplicacion || "PPF COMPLETO"]).map((pieza) => ({
          pieza,
          ubicacion: linea.aplicacion === "INTERIOR" ? "INTERIOR" : "EXTERIOR",
          cantidad: 1,
          anchoCm: 0,
          largoCm: 0,
          rotada: false,
        }))
      : [];
    setForm((actual) => ({
      ...actual,
      asesoriaId: ordenAsesoria._id,
      asesoriaLinea: linea.etiqueta,
      partesServicio: partes,
      placa: ordenAsesoria.vehiculo?.placa || "",
      marca: ordenAsesoria.vehiculo?.marca || "",
      modelo: ordenAsesoria.vehiculo?.anio || String(ordenAsesoria.vehiculo?.modelo || "").replace(/\D/g, ""),
      tipoServicio: ordenAsesoria.garantia?.esGarantia
        ? ordenAsesoria.garantia.tipo || "GARANTIA"
        : "VENTA",
      instalador: ordenAsesoria.garantia?.instalador || "",
      tipoCorte,
      tipoCorteDetalle: tipoCorte === "OTROS" ? partes.join(" + ") : "",
      rolloId: rollo?._id || "",
      origenMaterial: "ROLLO",
      piezasPpf,
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!rollo) {
      Swal.fire({ icon: "info", title: "Datos del carro cargados", text: "Seleccione el rollo disponible que corresponda al material solicitado." });
    }
  };

  const finalizarTrabajo = async () => {
    const garantiaSinCobro = Boolean(ordenAsesoria?.garantia?.esGarantia) && Number(ordenAsesoria?.comercial?.totalAcordado || 0) <= 0;
    const confirmacion = await Swal.fire({
      icon: "question",
      title: garantiaSinCobro ? "¿Finalizar la garantía?" : "¿Enviar la orden a Ventas?",
      text: "Confirme que ya registró todos los cortes necesarios.",
      showCancelButton: true,
      confirmButtonText: garantiaSinCobro ? "Sí, finalizar garantía" : "Sí, enviar a Ventas",
      cancelButtonText: "Seguir trabajando",
    });
    if (!confirmacion.isConfirmed) return;
    try {
      const response = await enviarAsesoriaAVentas(ordenAsesoria._id);
      setOrdenAsesoria(response.data?.data || ordenAsesoria);
      await Swal.fire(garantiaSinCobro
        ? { icon: "success", title: "Garantía finalizada", text: "El trabajo quedó cerrado sin cobro pendiente." }
        : { icon: "success", title: "Orden enviada a Ventas", text: "Ventas recibió una notificación para continuar con el pago." });
    } catch (error) {
      Swal.fire({ icon: "error", title: "No se pudo enviar", text: error.response?.data?.message || "Revise los cortes registrados." });
    }
  };

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
          <select id="corte-tipo" class="swal2-input" ${corte.esCortePpf ? "disabled" : ""}>
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
        <>
        {ordenAsesoria && <OrdenAsesoriaPanel orden={ordenAsesoria} cortes={cortes} onLoad={cargarLineaAsesoria} onFinish={finalizarTrabajo} onReport={() => setReportandoNovedad(true)} />}
        <CorteForm
          form={form}
          loadingSugerencias={loadingSugerencias}
          loadingPiezasPpf={loadingPiezasPpf}
          mantenerDatosCarro={mantenerDatosCarro}
          esPpfSeleccionado={esPpfSeleccionado}
          onApplySuggestion={aplicarSugerencia}
          onApplyVehicle={aplicarVehiculo}
          onChange={setForm}
          onMantenerDatosCarroChange={setMantenerDatosCarro}
          onSubmit={guardar}
          retazoSeleccionado={retazoSeleccionado}
          retazosDisponibles={retazosDisponibles}
          rolloSeleccionado={rolloSeleccionado}
          rollosEnUso={rollosEnUso}
          piezasPpfCatalogo={piezasPpfCatalogo}
          sugerencias={sugerencias}
          sugerenciasKey={sugerenciasKey}
          vehiculosSugeridos={vehiculosSugeridos}
        />
        </>
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
            canEdit={puedeEditar}
          />
        </>
      )}

      {reportandoNovedad && ordenAsesoria && (
        <NovedadAsesoriaModal
          asesoria={ordenAsesoria}
          usuario={usuario}
          onClose={() => setReportandoNovedad(false)}
          onSaved={async () => {
            const response = await getAsesoriaPorId(ordenAsesoria._id);
            setOrdenAsesoria(response.data?.data || ordenAsesoria);
          }}
        />
      )}
    </div>
  );
}

function OrdenAsesoriaPanel({ orden, cortes, onLoad, onFinish, onReport }) {
  const solicitudPendiente = orden.novedades?.some((item) => item.estado === "PENDIENTE");
  const garantiaBloqueada = orden.garantia?.esGarantia && orden.garantia.estado !== "APROBADA";
  const garantiaSinCobro = orden.garantia?.esGarantia && Number(orden.comercial?.totalAcordado || 0) <= 0;
  const lineas = [
    ...(orden.polarizados || []).map((item, index) => ({ ...item, clase: "POLARIZADO", etiqueta: `POLARIZADO ${index + 1}` })),
    ...(orden.ppf || []).map((item, index) => ({ ...item, clase: "PPF", material: item.referencia, partes: item.aplicacion === "PIEZAS" ? item.piezas : [item.aplicacion], etiqueta: `PPF ${index + 1}` })),
  ];
  return <section className="mb-5 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
    <div className="flex items-start gap-3 bg-blue-50 p-4"><ClipboardList className="mt-0.5 text-blue-700" size={22} /><div><h2 className="font-black text-slate-900">Servicio {orden.codigo}</h2><p className="text-sm text-slate-600">{orden.vehiculo?.placa} · {orden.vehiculo?.marca} {orden.vehiculo?.modelo} {orden.vehiculo?.anio} · Asesor: {orden.asesorNombre}</p>{orden.garantia?.esGarantia && <p className="mt-1 text-xs font-bold text-violet-700">Garantía {orden.garantia.estado} · {(orden.garantia.responsable || "POR_DEFINIR").replaceAll("_", " ")} · {orden.garantia.motivo}</p>}</div></div>
    <div className="divide-y divide-slate-100">
      {lineas.map((linea) => {
        const registrado = cortes.some((corte) => String(corte.asesoriaId || "") === String(orden._id) && corte.asesoriaLinea === linea.etiqueta);
        return <div key={linea.etiqueta} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold text-slate-900">{linea.clase}: {linea.material || linea.referencia} {linea.porcentaje || ""}</p><p className="mt-1 text-xs text-slate-500">{(linea.partes || []).join(" + ") || linea.aplicacion} · Venta: ${Number(linea.valor || 0).toLocaleString("es-CO")}</p></div><button type="button" disabled={registrado || garantiaBloqueada} onClick={() => onLoad(linea)} className={`rounded-lg px-4 py-2 text-sm font-bold ${registrado ? "cursor-not-allowed bg-emerald-100 text-emerald-700" : garantiaBloqueada ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-blue-600 text-white hover:bg-blue-700"}`}>{registrado ? "Corte registrado" : garantiaBloqueada ? "Esperando aprobación" : "Cargar corte agrupado"}</button></div>;
      })}
      {!lineas.length && <p className="p-4 text-sm text-slate-500">Esta orden solo contiene servicios que no requieren corte.</p>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4"><div><p className="text-sm font-semibold text-slate-600">Estado: {(orden.flujo?.etapa || "PENDIENTE_INVENTARIO").replaceAll("_", " ")}</p>{(solicitudPendiente || garantiaBloqueada) && <p className="mt-1 text-xs font-bold text-amber-700">Tiene una aprobación pendiente de administración</p>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={onReport} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100">Reportar problema</button>{orden.flujo?.etapa !== "PENDIENTE_PAGO" && orden.flujo?.etapa !== "FINALIZADA" && orden.flujo?.etapa !== "CANCELADA" && <button type="button" onClick={onFinish} disabled={solicitudPendiente || garantiaBloqueada} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">{solicitudPendiente || garantiaBloqueada ? "Esperando aprobación" : garantiaSinCobro ? "Finalizar garantía" : "Finalizar trabajo y enviar a Ventas"}</button>}</div></div>
  </section>;
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
