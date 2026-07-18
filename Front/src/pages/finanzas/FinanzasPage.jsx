import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import { getPedidos } from "../../api/pedidos.api";
import {
  getCosteoPedido,
  getCosteos,
  getReporteFinanciero,
  getResumenFinanciero,
  saveCosteoPedido,
} from "../../api/finanzas.api";

import CosteoPedidoForm from "./components/CosteoPedidoForm";
import CosteoResultado from "./components/CosteoResultado";
import CosteosTable from "./components/CosteosTable";
import FinanzasHeader from "./components/FinanzasHeader";
import FinanzasStats from "./components/FinanzasStats";
import ReporteRentabilidad from "./components/ReporteRentabilidad";

import {
  crearDetallesFormulario,
  crearFormularioDesdeCosteo,
  crearPayloadCosteo,
  formularioInicial,
  numeroEntrada,
  obtenerTotalRollosPedido,
} from "./finanzas.helpers";

function FinanzasPage() {
  const [pedidos, setPedidos] = useState([]);
  const [costeos, setCosteos] = useState([]);
  const [reporte, setReporte] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [selectedPedidoId, setSelectedPedidoId] = useState("");
  const [selectedCosteo, setSelectedCosteo] = useState(null);
  const [vistaFinanzas, setVistaFinanzas] =
    useState("costear");
  const [form, setForm] = useState(formularioInicial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCosteo, setLoadingCosteo] = useState(false);

  const pedidoSeleccionado = useMemo(
    () =>
      pedidos.find(
        (pedido) => pedido._id === selectedPedidoId
      ),
    [pedidos, selectedPedidoId]
  );

  const pedidosCosteadosIds = useMemo(
    () =>
      new Set(
        costeos
          .map((costeo) => costeo.pedidoId?._id || costeo.pedidoId)
          .filter(Boolean)
          .map(String)
      ),
    [costeos]
  );

  const pedidosParaNuevoCosteo = useMemo(
    () =>
      pedidos.filter(
        (pedido) => !pedidosCosteadosIds.has(String(pedido._id))
      ),
    [pedidos, pedidosCosteadosIds]
  );

  const pedidosDisponiblesFormulario = useMemo(() => {
    if (
      selectedPedidoId &&
      pedidosCosteadosIds.has(String(selectedPedidoId)) &&
      pedidoSeleccionado
    ) {
      return [pedidoSeleccionado, ...pedidosParaNuevoCosteo];
    }

    return pedidosParaNuevoCosteo;
  }, [
    pedidoSeleccionado,
    pedidosCosteadosIds,
    pedidosParaNuevoCosteo,
    selectedPedidoId,
  ]);

  const totalRollosPedido = useMemo(
    () => obtenerTotalRollosPedido(form.detalles),
    [form.detalles]
  );

  const cargarDatos = useCallback(async () => {
    const [
      pedidosRes,
      costeosRes,
      resumenRes,
      reporteRes,
    ] =
      await Promise.all([
        getPedidos(),
        getCosteos(),
        getResumenFinanciero(),
        getReporteFinanciero(),
      ]);

    return {
      pedidos: pedidosRes.data || [],
      costeos: costeosRes.data || [],
      resumen: resumenRes.data || null,
      reporte: reporteRes.data || null,
    };
  }, []);

  const refrescar = useCallback(async () => {
    try {
      const data = await cargarDatos();

      setPedidos(data.pedidos);
      setCosteos(data.costeos);
      setResumen(data.resumen);
      setReporte(data.reporte);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No fue posible cargar la informacion financiera",
      });
    }
  }, [cargarDatos]);

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const data = await cargarDatos();

        if (!active) {
          return;
        }

        setPedidos(data.pedidos);
        setCosteos(data.costeos);
        setResumen(data.resumen);
        setReporte(data.reporte);

        const costeadosIds = new Set(
          (data.costeos || [])
            .map((costeo) => costeo.pedidoId?._id || costeo.pedidoId)
            .filter(Boolean)
            .map(String)
        );
        const primerPendiente = data.pedidos.find(
          (pedido) => !costeadosIds.has(String(pedido._id))
        );

        if (primerPendiente) {
          setSelectedPedidoId(primerPendiente._id);
        }
      } catch {
        if (active) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No fue posible cargar la informacion financiera",
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    cargarInicial();

    return () => {
      active = false;
    };
  }, [cargarDatos]);

  useEffect(() => {
    if (!selectedPedidoId || !pedidoSeleccionado) {
      return;
    }

    let active = true;

    const cargarCosteo = async () => {
      setLoadingCosteo(true);

      try {
        const res = await getCosteoPedido(selectedPedidoId);
        const costeo = res.data || null;

        if (!active) {
          return;
        }

        setSelectedCosteo(costeo);
        setForm(
          crearFormularioDesdeCosteo(
            pedidoSeleccionado,
            costeo
          )
        );
      } catch {
        if (active) {
          setSelectedCosteo(null);
          setForm({
            ...formularioInicial,
            detalles: crearDetallesFormulario(
              pedidoSeleccionado,
              null
            ),
          });
        }
      } finally {
        if (active) {
          setLoadingCosteo(false);
        }
      }
    };

    cargarCosteo();

    return () => {
      active = false;
    };
  }, [pedidoSeleccionado, selectedPedidoId]);

  const cambiarCampo = (campo, valor) => {
    setForm((actual) => {
      const siguiente = {
        ...actual,
        [campo]: valor,
      };

      if (campo === "moneda" && valor === "COP") {
        siguiente.trm = "1";
        siguiente.trmFlete = "1";
      }

      if (campo === "moneda" && valor === "USD") {
        siguiente.trm = actual.trm === "1" ? "" : actual.trm;
        siguiente.trmFlete =
          actual.trmFlete === "1" ? "" : actual.trmFlete;
      }

      return siguiente;
    });
  };

  const cambiarValorDetalle = (detallePedidoId, valor) => {
    setForm((actual) => ({
      ...actual,
      detalles: actual.detalles.map((detalle) =>
        detalle.detallePedidoId === detallePedidoId
          ? {
              ...detalle,
              valorUnitario: valor,
            }
          : detalle
      ),
    }));
  };

  const guardar = async () => {
    if (!selectedPedidoId) {
      return Swal.fire({
        icon: "warning",
        title: "Seleccione un pedido",
      });
    }

    if (form.moneda === "USD" && numeroEntrada(form.trm) <= 0) {
      return Swal.fire({
        icon: "warning",
        title: "Ingrese la TRM",
        text: "Para pedidos en dolares se necesita el valor del dolar de ese momento.",
      });
    }

    if (
      form.moneda === "USD" &&
      numeroEntrada(form.flete) > 0 &&
      numeroEntrada(form.trmFlete) <= 0
    ) {
      return Swal.fire({
        icon: "warning",
        title: "Ingrese la TRM del flete",
        text: "Para convertir el flete en dolares se necesita su TRM.",
      });
    }

    const sinPrecio = form.detalles.some(
      (detalle) => numeroEntrada(detalle.valorUnitario) <= 0
    );

    if (sinPrecio) {
      return Swal.fire({
        icon: "warning",
        title: "Faltan valores",
        text: "Ingrese el valor unitario de cada rollo del pedido.",
      });
    }

    setSaving(true);

    try {
      const payload = crearPayloadCosteo(
        selectedPedidoId,
        form
      );

      const res = await saveCosteoPedido(payload);

      setSelectedCosteo(res.data);
      await refrescar();

      Swal.fire({
        icon: "success",
        title: "Costeo guardado",
        text: "El costo del pedido quedo actualizado.",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "No fue posible guardar el costeo",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-slate-600">
        Cargando finanzas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FinanzasHeader onRefresh={refrescar} />

      <FinanzasStats resumen={resumen} />

      <FinanzasTabs
        vista={vistaFinanzas}
        onChange={setVistaFinanzas}
        pendientes={pedidosParaNuevoCosteo.length}
        costeos={costeos.length}
      />

      {vistaFinanzas === "rentabilidad" && (
        <ReporteRentabilidad reporte={reporte} />
      )}

      {vistaFinanzas === "costear" && (
      <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <CosteoPedidoForm
          pedidos={pedidosDisponiblesFormulario}
          selectedPedidoId={selectedPedidoId}
          modoEdicion={Boolean(selectedCosteo)}
          totalPedidos={pedidos.length}
          totalPedidosPendientes={pedidosParaNuevoCosteo.length}
          form={form}
          totalRollosPedido={totalRollosPedido}
          loadingCosteo={loadingCosteo}
          saving={saving}
          onSelectPedido={setSelectedPedidoId}
          onChangeField={cambiarCampo}
          onChangeDetalle={cambiarValorDetalle}
          onSave={guardar}
        />

        <CosteoResultado costeo={selectedCosteo} />
      </div>
      )}

      {vistaFinanzas === "historial" && (
      <CosteosTable
        costeos={costeos}
        onSelectPedido={(pedidoId) => {
          setSelectedPedidoId(pedidoId);
          setVistaFinanzas("costear");
        }}
      />
      )}
    </div>
  );
}

function FinanzasTabs({
  vista,
  onChange,
  pendientes,
  costeos,
}) {
  const tabs = [
    {
      id: "costear",
      label: "Costear pedido",
      detail: `${pendientes} pendientes`,
    },
    {
      id: "historial",
      label: "Historial",
      detail: `${costeos} costeos`,
    },
    {
      id: "rentabilidad",
      label: "Rentabilidad",
      detail: "Resumen comercial",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="grid gap-2 md:grid-cols-3">
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

export default FinanzasPage;
