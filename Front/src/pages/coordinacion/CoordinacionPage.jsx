import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardCheck, Plus, Ruler, Search, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import {
  getInstaladoresCoordinacion,
  getOrdenesCoordinacion,
  reviewPropuestaCoordinacion,
  savePropuestaCoordinacion,
  sendTrabajoToSales,
  updateAsignacionCoordinacion,
} from "../../api/coordinacion.api";
import { obtenerUsuarioActual } from "../../utils/permisos";
import ExcelButton from "../../components/ui/ExcelButton";
import { getMedidasVehiculos } from "../../api/medidasVehiculos.api";
import NovedadAsesoriaModal from "../asesores/NovedadAsesoriaModal";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const fechaInput = (fecha) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const quincenaActual = () => {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() <= 15 ? 1 : 16);
  const fin = hoy.getDate() <= 15
    ? new Date(hoy.getFullYear(), hoy.getMonth(), 15)
    : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return { desde: fechaInput(inicio), hasta: fechaInput(fin) };
};
const normalizarNombre = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
const nombresCompatibles = (a, b) => {
  const primero = normalizarNombre(a);
  const segundo = normalizarNombre(b);
  if (!primero || !segundo) return false;
  if (primero === segundo) return true;
  const tokensA = primero.split(/\s+/).filter((item) => item.length >= 3);
  const tokensB = segundo.split(/\s+/).filter((item) => item.length >= 3);
  return tokensA.some((item) => tokensB.includes(item));
};

const nombreMasCompleto = (a, b) =>
  String(b || "").trim().length > String(a || "").trim().length ? b : a;

const nombresInstaladoresUnificados = (items = []) => {
  const grupos = [];
  items.forEach((item) => {
    const nombre = item.instaladorNombre || "";
    if (!nombre) return;
    const instaladorId = String(item.instaladorId || "");
    const existente = grupos.find((grupo) =>
      (instaladorId && grupo.ids.has(instaladorId)) || nombresCompatibles(grupo.nombre, nombre)
    );
    if (existente) {
      existente.nombre = nombreMasCompleto(existente.nombre, nombre);
      if (instaladorId) existente.ids.add(instaladorId);
      return;
    }
    grupos.push({ nombre, ids: new Set(instaladorId ? [instaladorId] : []) });
  });
  return grupos.map((grupo) => grupo.nombre).sort();
};

const etapasActivas = new Set([
  "PENDIENTE_COORDINACION", "PENDIENTE_APROBACION_CORTE", "PENDIENTE_INVENTARIO",
  "EN_PROCESO", "MATERIAL_LISTO", "EN_INSTALACION",
]);

const expandirPartesMedibles = (partes = []) => [...new Set(partes.flatMap((parte) =>
  String(parte || "").toUpperCase() === "U" ? ["DELANTERAS", "TRASERAS", "LUNETA", "FIJOS", "CUSTODIAS"] : [parte]
))];

const lineasOrden = (orden) => [
  ...(orden.polarizados || []).map((item, index) => ({ linea: `POLARIZADO ${index + 1}`, material: `${item.material} ${item.porcentaje}`, partes: expandirPartesMedibles(item.partes || []) })),
  ...(orden.ppf || []).map((item, index) => ({ linea: `PPF ${index + 1}`, material: `PPF ${item.referencia}`, partes: item.piezas?.length ? item.piezas : [item.aplicacion].filter(Boolean) })),
];

const agruparServiciosPpf = (items = []) => {
  const grupos = new Map();
  items.forEach((item) => {
    const referencia = String(item.referencia || "PPF").trim().toUpperCase();
    const actual = grupos.get(referencia) || { servicio: `PPF ${referencia}`, piezas: [] };
    actual.piezas.push(...(item.piezas?.length ? item.piezas : [item.aplicacion]).filter(Boolean));
    grupos.set(referencia, actual);
  });
  return [...grupos.entries()].map(([referencia, item]) => {
    const partes = [...new Set(item.piezas)];
    return { servicio: item.servicio, descripcion: `PPF ${referencia} · ${partes.join(", ")}`, partes };
  });
};

const serviciosOrden = (orden) => [
  ...(orden.polarizados || []).map((item, index) => ({ servicio: `POLARIZADO ${index + 1}`, descripcion: `${item.material} ${item.porcentaje} · ${(item.partes || []).join(", ")}`, partes: expandirPartesMedibles(item.partes || []) })),
  ...agruparServiciosPpf(orden.ppf || []),
  ...(orden.serviciosAdicionales || []).map((item, index) => ({ servicio: `ADICIONAL ${index + 1}`, descripcion: `${item.tipo} ${item.detalle || ""}`.trim(), partes: [item.detalle || item.tipo].filter(Boolean) })),
];

const partesGuardadas = (servicio, descripcion) => {
  const textoGuardado = normalizarNombre(descripcion);
  return (servicio.partes || [])
    .filter((parte) => textoGuardado.includes(normalizarNombre(parte)))
    .join(" | ");
};

const valorCobradoServicio = (orden, servicio) => {
  const nombre = String(servicio || "").trim().toUpperCase();
  const polarizado = nombre.match(/^POLARIZADO\s+(\d+)$/);
  if (polarizado) {
    return Number(orden.polarizados?.[Number(polarizado[1]) - 1]?.valor || 0);
  }

  if (nombre.startsWith("PPF ")) {
    const referencia = nombre.replace(/^PPF\s+/, "").trim();
    return (orden.ppf || [])
      .filter((item) => String(item.referencia || "PPF").trim().toUpperCase() === referencia)
      .reduce((total, item) => total + Number(item.valor || 0), 0);
  }

  const adicional = nombre.match(/^ADICIONAL\s+(\d+)$/);
  if (adicional) {
    return Number(orden.serviciosAdicionales?.[Number(adicional[1]) - 1]?.valor || 0);
  }

  return 0;
};

function CoordinacionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const asesoriaObjetivo = searchParams.get("asesoria") || "";
  const usuario = obtenerUsuarioActual();
  const puedeLiquidarInstaladores = ["VENTAS", "ADMIN", "SUPERUSUARIO"].includes(usuario?.rol);
  const [ordenes, setOrdenes] = useState([]);
  const [instaladores, setInstaladores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enviandoVentasId, setEnviandoVentasId] = useState("");
  const [seleccionada, setSeleccionada] = useState(null);
  const [reportandoRecorte, setReportandoRecorte] = useState(null);
  const [filtrosInstalador, setFiltrosInstalador] = useState(() => ({ ...quincenaActual(), instalador: "TODOS", material: "TODOS", estado: "TODOS", buscar: "" }));

  const cargar = async () => {
    try {
      setLoading(true);
      const [ordenesResponse, instaladoresResponse] = await Promise.all([
        getOrdenesCoordinacion(),
        ["COORDINADOR", "ADMIN", "SUPERUSUARIO"].includes(usuario?.rol)
          ? getInstaladoresCoordinacion()
          : Promise.resolve({ data: { data: [] } }),
      ]);
      setOrdenes(ordenesResponse.data?.data || []);
      setInstaladores(instaladoresResponse.data?.data || []);
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible cargar coordinación", text: error.response?.data?.message || "Intente nuevamente." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const ordenesBase = useMemo(() => ordenes.filter((orden) => {
    if (usuario?.rol === "INSTALADOR") return orden.coordinacion?.asignaciones?.some((item) => String(item.instaladorId) === String(usuario._id)) || String(orden.garantia?.instaladorId || "") === String(usuario._id) || (orden.garantia?.tipo === "GARANTIA_INSTALADOR" && nombresCompatibles(orden.garantia?.instalador, usuario.nombre)) || orden.novedades?.some((item) => String(item.instaladorId || "") === String(usuario._id));
    return etapasActivas.has(orden.flujo?.etapa);
  }), [ordenes, usuario]);

  const instalacionesPropias = useMemo(() => (usuario?.rol === "INSTALADOR" ? ordenesBase : ordenes).flatMap((orden) => {
    const asignaciones = orden.coordinacion?.asignaciones || [];
    const garantiaInstalador = orden.garantia?.esGarantia && (orden.garantia?.responsable === "INSTALADOR" || orden.garantia?.tipo === "GARANTIA_INSTALADOR");
    const garantiaCorresponde = usuario?.rol !== "INSTALADOR" || String(orden.garantia?.instaladorId || "") === String(usuario._id) || nombresCompatibles(orden.garantia?.instalador, usuario.nombre);
    const filas = asignaciones.map((item) => ({ ...item, ordenId: orden._id, codigo: orden.codigo, placa: orden.vehiculo?.placa || "", vehiculo: `${orden.vehiculo?.marca || ""} ${orden.vehiculo?.modelo || ""}`.trim(), cliente: orden.cliente?.nombre || "", fecha: item.fechaFinalizacion || item.fechaInicio || orden.createdAt, valorCobrado: valorCobradoServicio(orden, item.servicio), descuentoGarantia: 0, valorNeto: Number(item.valorInstalacion || 0) }));
    if (garantiaInstalador && garantiaCorresponde && orden.garantia?.estado === "FINALIZADA") {
      const costoMaterial = Number(orden.garantia?.costoMaterial || 0);
      filas.push({ _id: `garantia-${orden._id}`, ordenId: orden._id, codigo: orden.codigo, placa: orden.vehiculo?.placa || "", vehiculo: `${orden.vehiculo?.marca || ""} ${orden.vehiculo?.modelo || ""}`.trim(), cliente: orden.cliente?.nombre || "", instaladorId: orden.garantia.instaladorId, instaladorNombre: orden.garantia.instalador || "INSTALADOR SIN NOMBRE", servicio: "DESCUENTO GARANTIA", descripcion: "GARANTÍA - COSTO DE MATERIAL", estado: "COMPLETADA", fecha: orden.flujo?.fechaFinalizacion || orden.createdAt, valorInstalacion: 0, descuentoGarantia: costoMaterial, valorNeto: -costoMaterial, costoPendiente: costoMaterial <= 0, esAjusteGarantia: true });
    }
    (orden.novedades || [])
      .filter((item) => item.tipo === "REPETICION_CORTE" && item.responsableCosto === "INSTALADOR" && item.estado === "RESUELTA")
      .forEach((item) => {
        const costoMaterial = Number(item.costoMaterialReal || 0);
        filas.push({ _id: `repeticion-${item._id}`, ordenId: orden._id, codigo: orden.codigo, placa: orden.vehiculo?.placa || "", vehiculo: `${orden.vehiculo?.marca || ""} ${orden.vehiculo?.modelo || ""}`.trim(), cliente: orden.cliente?.nombre || "", instaladorId: item.instaladorId, instaladorNombre: item.instaladorNombre || "INSTALADOR SIN NOMBRE", servicio: "DESCUENTO MATERIAL", descripcion: `REPETICIÓN DE CORTE - ${(item.serviciosAfectados || []).join(", ")}`, estado: "COMPLETADA", fecha: item.fechaResolucion || item.fecha, valorInstalacion: 0, descuentoGarantia: costoMaterial, valorNeto: -costoMaterial, costoPendiente: costoMaterial <= 0, esAjusteGarantia: true });
      });
    return filas.filter((item) => {
      if (usuario?.rol !== "INSTALADOR") return true;
      if (String(item.instaladorId || "") === String(usuario._id)) return true;
      return item.esAjusteGarantia && nombresCompatibles(item.instaladorNombre, usuario.nombre);
    });
  }), [ordenes, ordenesBase, usuario]);

  const materialesInstalador = useMemo(() => [...new Set(instalacionesPropias.map((item) => item.descripcion).filter(Boolean))].sort(), [instalacionesPropias]);
  const nombresInstaladores = useMemo(
    () => nombresInstaladoresUnificados(instalacionesPropias),
    [instalacionesPropias]
  );
  const instalacionesFiltradas = useMemo(() => instalacionesPropias.filter((item) => {
    const fechaItem = item.fecha ? new Date(item.fecha) : null;
    const fechaValida = fechaItem && !Number.isNaN(fechaItem.getTime());
    const desde = filtrosInstalador.desde ? new Date(`${filtrosInstalador.desde}T00:00:00`) : null;
    const hasta = filtrosInstalador.hasta ? new Date(`${filtrosInstalador.hasta}T23:59:59.999`) : null;
    const texto = `${item.codigo} ${item.placa} ${item.vehiculo} ${item.cliente} ${item.descripcion}`.toLowerCase();
    return (!desde || (fechaValida && fechaItem >= desde))
      && (!hasta || (fechaValida && fechaItem <= hasta))
      && (filtrosInstalador.instalador === "TODOS" || nombresCompatibles(item.instaladorNombre, filtrosInstalador.instalador))
      && (filtrosInstalador.material === "TODOS" || item.descripcion === filtrosInstalador.material)
      && (filtrosInstalador.estado === "TODOS" || item.estado === filtrosInstalador.estado)
      && (!filtrosInstalador.buscar || texto.includes(filtrosInstalador.buscar.toLowerCase()));
  }), [instalacionesPropias, filtrosInstalador]);

  const visibles = usuario?.rol === "INSTALADOR"
    ? ordenesBase.filter((orden) => {
        const tieneAsignacionActiva = (orden.coordinacion?.asignaciones || []).some(
          (item) => String(item.instaladorId) === String(usuario._id) && item.estado !== "COMPLETADA"
        );
        const ordenActiva = !["FINALIZADA", "CANCELADA"].includes(orden.flujo?.etapa);
        return tieneAsignacionActiva && ordenActiva;
      })
    : ordenesBase;
  const visiblesOrdenadas = useMemo(() => {
    if (!asesoriaObjetivo) return visibles;
    const objetivo = ordenesBase.find((item) => String(item._id) === asesoriaObjetivo);
    const base = objetivo && !visibles.some((item) => String(item._id) === asesoriaObjetivo)
      ? [objetivo, ...visibles]
      : visibles;
    return [...base].sort((a, b) => Number(String(b._id) === asesoriaObjetivo) - Number(String(a._id) === asesoriaObjetivo));
  }, [visibles, ordenesBase, asesoriaObjetivo]);

  useEffect(() => {
    if (loading || !asesoriaObjetivo) return;
    const orden = ordenesBase.find((item) => String(item._id) === asesoriaObjetivo);
    if (!orden) {
      Swal.fire({ icon: "info", title: "Trabajo no disponible", text: "La orden ya terminó, fue cancelada o no está asignada a este perfil." });
      setSearchParams({}, { replace: true });
      return;
    }
    window.setTimeout(() => document.getElementById(`orden-${asesoriaObjetivo}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }, [asesoriaObjetivo, loading, ordenesBase, setSearchParams]);
  const instalacionesCompletadas = instalacionesFiltradas.filter((item) => item.estado === "COMPLETADA");
  const solicitudesDescuentoMaterial = useMemo(() => ordenes.flatMap((orden) => (orden.novedades || [])
    .filter((item) => item.tipo === "REPETICION_CORTE" && item.responsableCosto === "INSTALADOR" && ["PENDIENTE", "APROBADA"].includes(item.estado) && (usuario?.rol !== "INSTALADOR" || String(item.instaladorId || "") === String(usuario._id)))
    .map((item) => ({ ...item, ordenId: orden._id, codigo: orden.codigo, placa: orden.vehiculo?.placa || "", vehiculo: `${orden.vehiculo?.marca || ""} ${orden.vehiculo?.modelo || ""}`.trim() }))), [ordenes, usuario]);
  const trabajosCompletados = instalacionesCompletadas.filter((item) => !item.esAjusteGarantia);
  const ajustesGarantia = instalacionesCompletadas.filter((item) => item.esAjusteGarantia);
  const ajustesSinCosto = ajustesGarantia.filter((item) => item.costoPendiente);
  const totalInstalacionesBruto = trabajosCompletados.reduce((total, item) => total + Number(item.valorInstalacion || 0), 0);
  const totalDescuentosGarantia = instalacionesCompletadas.reduce((total, item) => total + Number(item.descuentoGarantia || 0), 0);
  const totalInstalacion = instalacionesCompletadas.reduce((total, item) => total + Number(item.valorNeto ?? item.valorInstalacion ?? 0), 0);
  const totalesPorInstalador = useMemo(() => {
    const totales = [];
    instalacionesCompletadas.forEach((item) => {
      const nombre = item.instaladorNombre || "SIN INSTALADOR";
      const instaladorId = String(item.instaladorId || "");
      let actual = totales.find((grupo) =>
        (instaladorId && grupo.ids.has(instaladorId)) || nombresCompatibles(grupo.nombre, nombre)
      );
      if (!actual) {
        actual = { nombre, ids: new Set(), trabajos: 0, total: 0, descuentos: 0 };
        totales.push(actual);
      }
      actual.nombre = nombreMasCompleto(actual.nombre, nombre);
      if (instaladorId) actual.ids.add(instaladorId);
      if (!item.esAjusteGarantia) actual.trabajos += 1;
      actual.total += Number(item.valorNeto ?? item.valorInstalacion ?? 0);
      actual.descuentos = Number(actual.descuentos || 0) + Number(item.descuentoGarantia || 0);
    });
    return totales.sort((a, b) => b.total - a.total);
  }, [instalacionesCompletadas]);
  const excelInstalaciones = [
    { header: "Fecha", value: (item) => item.fecha ? new Date(item.fecha).toLocaleDateString("es-CO") : "" },
    { header: "Orden", value: (item) => item.codigo },
    { header: "Placa", value: (item) => item.placa },
    { header: "Vehículo", value: (item) => item.vehiculo, width: 24 },
    { header: "Cliente", value: (item) => item.cliente, width: 24 },
    { header: "Instalador", value: (item) => item.instaladorNombre, width: 24 },
    { header: "Material o servicio", value: (item) => item.descripcion, width: 36 },
    { header: "Estado", value: (item) => item.estado?.replaceAll("_", " ") },
    ...(usuario?.rol === "INSTALADOR" ? [] : [
      { header: "Valor cobrado al cliente", value: (item) => Number(item.valorCobrado || 0) },
    ]),
    { header: "Valor instalación", value: (item) => Number(item.valorInstalacion || 0) },
    { header: "Descuento de material", value: (item) => Number(item.descuentoGarantia || 0) },
    { header: "Neto a pagar", value: (item) => Number(item.valorNeto ?? item.valorInstalacion ?? 0) },
  ];

  const revisar = async (orden, decision) => {
    let observacion = "";
    if (decision === "RECHAZAR") {
      const resultado = await Swal.fire({ title: "Rechazar propuesta", input: "textarea", inputLabel: "Indique qué debe corregir el coordinador", showCancelButton: true, confirmButtonText: "Rechazar", inputValidator: (value) => value.trim().length < 5 ? "Escriba el motivo" : undefined });
      if (!resultado.isConfirmed) return;
      observacion = resultado.value;
    }
    try {
      await reviewPropuestaCoordinacion(orden._id, { decision, observacion });
      await cargar();
      Swal.fire({ icon: "success", title: decision === "APROBAR" ? "Propuesta aprobada" : "Propuesta devuelta al coordinador", timer: 1600, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible revisar", text: error.response?.data?.message });
    }
  };

  const cambiarTrabajo = async (orden, asignacion, estado) => {
    try {
      await updateAsignacionCoordinacion(orden._id, asignacion._id, { estado });
      await cargar();
      Swal.fire({ icon: "success", title: estado === "COMPLETADA" ? "Trabajo completado" : "Trabajo iniciado", timer: 1300, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible actualizar", text: error.response?.data?.message });
    }
  };

  const enviarVentas = async (orden) => {
    if (enviandoVentasId) return;
    try {
      setEnviandoVentasId(String(orden._id));
      await sendTrabajoToSales(orden._id);
      if (asesoriaObjetivo === String(orden._id)) setSearchParams({}, { replace: true });
      await cargar();
      Swal.fire({ icon: "success", title: "Servicio enviado a Ventas", text: "La orden quedó disponible para registrar el pago.", timer: 1800, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: "warning", title: "El servicio todavía no está listo", text: error.response?.data?.message });
    } finally {
      setEnviandoVentasId("");
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Cargando coordinación...</div>;

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><ClipboardCheck className="text-blue-600" /><div><h1 className="text-xl font-black text-slate-900">{usuario?.rol === "INSTALADOR" ? "Mis trabajos asignados" : "Coordinación de servicios"}</h1><p className="text-sm text-slate-500">Medidas, propuesta de corte, aprobación de Inventario e instalación.</p></div></div>
      </header>

      {(usuario?.rol === "INSTALADOR" || puedeLiquidarInstaladores) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-900">{usuario?.rol === "INSTALADOR" ? "Historial de instalaciones" : "Liquidación de instaladores"}</h2>
              <p className="text-sm text-slate-500">{instalacionesFiltradas.filter((item) => !item.esAjusteGarantia).length} trabajo(s) encontrados · {trabajosCompletados.length} completado(s)</p>
            </div>
            <ExcelButton title={usuario?.rol === "INSTALADOR" ? "Mis instalaciones" : "Liquidación de instaladores"} fileName={usuario?.rol === "INSTALADOR" ? "mis-instalaciones" : "liquidacion-instaladores"} sheetName="Instalaciones" columns={excelInstalaciones} rows={instalacionesFiltradas} />
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <div className="min-w-0 rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="text-[10px] font-black uppercase text-blue-700">Instalaciones del periodo</p><p className="mt-1 truncate text-lg font-black tabular-nums text-blue-950" title={cop.format(totalInstalacionesBruto)}>{cop.format(totalInstalacionesBruto)}</p></div>
            <div className="min-w-0 rounded-lg border border-red-100 bg-red-50 p-3"><p className="text-[10px] font-black uppercase text-red-700">Descuentos de material</p><p className="mt-1 truncate text-lg font-black tabular-nums text-red-800" title={cop.format(totalDescuentosGarantia)}>-{cop.format(totalDescuentosGarantia)}</p>{ajustesSinCosto.length > 0 && <p className="mt-1 text-[10px] font-bold text-amber-700">{ajustesSinCosto.length} garantía(s) pendiente(s) de costeo</p>}</div>
            <div className="min-w-0 rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-[10px] font-black uppercase text-emerald-700">Neto a pagar</p><p className="mt-1 truncate text-lg font-black tabular-nums text-emerald-900" title={cop.format(totalInstalacion)}>{cop.format(totalInstalacion)}</p></div>
          </div>
          {ajustesGarantia.length > 0 && <details open={ajustesSinCosto.length > 0} className="mb-4 overflow-hidden rounded-lg border border-red-200 bg-red-50/60"><summary className="cursor-pointer px-3 py-2 text-xs font-bold text-red-800">Ver descuentos de material ({ajustesGarantia.length})</summary><div className="divide-y divide-red-100 border-t border-red-100 bg-white">{ajustesGarantia.map((item) => <div key={item._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"><div><p className="font-bold text-slate-800">{item.codigo} · {item.placa}</p><p className="text-slate-500">{item.vehiculo || "Vehículo"} · garantía atribuida al instalador</p></div>{item.costoPendiente ? <strong className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">Pendiente de costeo</strong> : <strong className="text-red-700">-{cop.format(item.descuentoGarantia)}</strong>}</div>)}</div></details>}
          {solicitudesDescuentoMaterial.length > 0 && <details open={usuario?.rol === "INSTALADOR"} className="mb-4 overflow-hidden rounded-lg border border-amber-200 bg-amber-50/70"><summary className="cursor-pointer px-3 py-2 text-xs font-bold text-amber-900">Material pendiente de descuento ({solicitudesDescuentoMaterial.length})</summary><div className="divide-y divide-amber-100 border-t border-amber-100 bg-white">{solicitudesDescuentoMaterial.map((item) => <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-xs"><div className="min-w-0"><p className="font-bold text-slate-800">{item.codigo} · {item.placa} · {item.instaladorNombre}</p><p className="mt-0.5 text-slate-600">{item.serviciosAfectados?.join(", ") || "Servicio por definir"} · {item.descripcion}</p><p className="mt-1 font-semibold text-amber-700">Estado: {item.estado === "PENDIENTE" ? "Esperando aprobación" : item.estado === "APROBADA" ? "Esperando nuevo corte" : "En proceso de costeo"}</p></div><div className="text-right"><p className="font-black text-amber-800">{Number(item.valorImpacto || 0) > 0 ? `Estimado: -${cop.format(item.valorImpacto)}` : "Valor por calcular"}</p><p className="mt-1 text-[10px] text-slate-400">Se descontará el costo real del corte</p></div></div>)}</div></details>}
          {puedeLiquidarInstaladores && totalesPorInstalador.length > 0 && <div className="mb-4 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{totalesPorInstalador.map((item) => <div key={item.nombre} className="min-w-0 rounded-lg border border-emerald-100 bg-emerald-50 p-3"><p className="break-words text-xs font-bold uppercase text-emerald-700">{item.nombre}</p><p className="mt-1 break-all text-base font-black tabular-nums text-emerald-900 sm:text-lg">{cop.format(item.total)}</p><p className="text-xs text-emerald-700">{item.trabajos} instalación(es) completada(s)</p>{item.descuentos > 0 && <p className="mt-1 text-xs font-bold text-red-700">Descuentos de material: -{cop.format(item.descuentos)}</p>}</div>)}</div></div>}
          <div className={`grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 ${puedeLiquidarInstaladores ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
            <label className="text-[10px] font-black uppercase text-slate-500">Desde<input type="date" max={filtrosInstalador.hasta || undefined} value={filtrosInstalador.desde} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, desde: event.target.value }))} className="mt-1 h-9 w-full rounded-md border bg-white px-2.5 text-sm font-normal text-slate-700" /></label>
            <label className="text-[10px] font-black uppercase text-slate-500">Hasta<input type="date" min={filtrosInstalador.desde || undefined} value={filtrosInstalador.hasta} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, hasta: event.target.value }))} className="mt-1 h-9 w-full rounded-md border bg-white px-2.5 text-sm font-normal text-slate-700" /></label>
            {puedeLiquidarInstaladores && <label className="text-[10px] font-black uppercase text-slate-500">Instalador<select value={filtrosInstalador.instalador} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, instalador: event.target.value }))} className="mt-1 h-9 w-full rounded-md border bg-white px-2.5 text-sm font-normal text-slate-700"><option value="TODOS">Todos</option>{nombresInstaladores.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}</select></label>}
            <label className="text-[10px] font-black uppercase text-slate-500">Material o servicio<select value={filtrosInstalador.material} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, material: event.target.value }))} className="mt-1 h-9 w-full rounded-md border bg-white px-2.5 text-sm font-normal text-slate-700"><option value="TODOS">Todos</option>{materialesInstalador.map((material) => <option key={material} value={material}>{material}</option>)}</select></label>
            <label className="text-[10px] font-black uppercase text-slate-500">Estado<select value={filtrosInstalador.estado} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, estado: event.target.value }))} className="mt-1 h-9 w-full rounded-md border bg-white px-2.5 text-sm font-normal text-slate-700"><option value="TODOS">Todos</option><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="COMPLETADA">Completada</option></select></label>
            <label className="text-[10px] font-black uppercase text-slate-500">Buscar<div className="relative mt-1"><Search className="absolute left-2.5 top-2.5 text-slate-400" size={15} /><input value={filtrosInstalador.buscar} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, buscar: event.target.value }))} placeholder="Placa, cliente u orden" className="h-9 w-full rounded-md border bg-white pl-8 pr-3 text-sm font-normal text-slate-700" /></div></label>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                <tr>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Orden / placa</th>
                  <th className="p-3 text-left">Instalador</th>
                  <th className="p-3 text-left">Servicio realizado</th>
                  {usuario?.rol !== "INSTALADOR" && <th className="p-3 text-right">Cobrado al cliente</th>}
                  <th className="p-3 text-right">Pago instalación</th>
                  <th className="p-3 text-right">Descuento</th>
                  <th className="p-3 text-right">Neto</th>
                </tr>
              </thead>
              <tbody>
                {instalacionesFiltradas.length === 0 ? (
                  <tr><td colSpan={usuario?.rol === "INSTALADOR" ? 7 : 8} className="p-6 text-center text-slate-500">No hay servicios para los filtros seleccionados.</td></tr>
                ) : instalacionesFiltradas.map((item) => (
                  <tr key={`${item.ordenId}-${item._id}`} className="border-t border-slate-200">
                    <td className="p-3 text-slate-600">{item.fecha ? new Date(item.fecha).toLocaleDateString("es-CO") : "-"}</td>
                    <td className="p-3"><p className="font-bold text-slate-800">{item.codigo}</p><p className="text-xs text-slate-500">{item.placa}</p></td>
                    <td className="p-3 font-semibold text-slate-700">{item.instaladorNombre || "-"}</td>
                    <td className="p-3"><p className="font-semibold text-slate-800">{item.esAjusteGarantia ? "GARANTIA" : item.servicio}</p><p className="max-w-xs text-xs text-slate-500">{item.descripcion || "-"}</p></td>
                    {usuario?.rol !== "INSTALADOR" && <td className="p-3 text-right font-bold text-blue-700">{item.esAjusteGarantia ? "No aplica" : cop.format(item.valorCobrado || 0)}</td>}
                    <td className="p-3 text-right font-semibold text-slate-700">{cop.format(item.valorInstalacion || 0)}</td>
                    <td className="p-3 text-right font-bold text-red-700">{Number(item.descuentoGarantia || 0) > 0 ? `-${cop.format(item.descuentoGarantia)}` : "-"}</td>
                    <td className={`p-3 text-right font-black ${Number(item.valorNeto || 0) < 0 ? "text-red-700" : "text-emerald-700"}`}>{cop.format(item.valorNeto || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {visiblesOrdenadas.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">No hay trabajos pendientes para este perfil.</div> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visiblesOrdenadas.map((orden) => <OrdenCard key={orden._id} orden={orden} destacada={String(orden._id) === asesoriaObjetivo} usuario={usuario} enviandoVentas={String(orden._id) === enviandoVentasId} onPrepare={() => setSeleccionada(orden)} onReview={revisar} onWork={cambiarTrabajo} onSales={enviarVentas} onReport={() => setReportandoRecorte(orden)} />)}
        </div>
      )}

      {seleccionada && <AsignacionModal orden={seleccionada} instaladores={instaladores} onClose={() => setSeleccionada(null)} onSaved={async () => { setSeleccionada(null); await cargar(); }} />}
      {reportandoRecorte && <NovedadAsesoriaModal asesoria={reportandoRecorte} usuario={usuario} instaladores={instaladores} onClose={() => setReportandoRecorte(null)} onSaved={async () => { setReportandoRecorte(null); await cargar(); }} />}
    </div>
  );
}

function AsignacionModal({ orden, instaladores, onClose, onSaved }) {
  const servicios = serviciosOrden(orden);
  const lineas = lineasOrden(orden);
  const garantiaInstalador = orden.garantia?.esGarantia && (orden.garantia?.tipo === "GARANTIA_INSTALADOR" || orden.garantia?.responsable === "INSTALADOR");
  const [fichaMedidas, setFichaMedidas] = useState(null);
  const [propuesta, setPropuesta] = useState(() => lineas.map((linea) => {
    const actual = orden.coordinacion?.propuesta?.find((item) => item.linea === linea.linea);
    const medidasPiezas = (linea.partes || []).map((pieza) => {
      const medida = actual?.medidasPiezas?.find((item) => item.pieza === pieza);
      return { pieza, anchoCm: medida?.anchoCm || "", largoCm: medida?.largoCm || "", cantidad: medida?.cantidad || 1 };
    });
    return { ...linea, medidasPiezas, metrosPropuestos: actual?.metrosPropuestos || "", observacion: actual?.observacion || "" };
  }));
  const [asignaciones, setAsignaciones] = useState(() => servicios.flatMap((servicio) => {
    const existentes = (orden.coordinacion?.asignaciones || []).filter((item) => item.servicio === servicio.servicio);
    if (!existentes.length) return [{ ...servicio, descripcion: (servicio.partes || []).join(" | "), instaladorId: "", valorInstalacion: "" }];
    return existentes.map((item) => ({
      ...servicio,
      ...item,
      descripcion: partesGuardadas(servicio, item.descripcion),
      instaladorId: item.instaladorId || "",
      valorInstalacion: item.valorInstalacion || "",
    }));
  }));
  useEffect(() => {
    getMedidasVehiculos().then((response) => {
      const lista = response.data?.data || [];
      const marca = String(orden.vehiculo?.marca || "").toUpperCase();
      const modelo = String(orden.vehiculo?.modelo || "").toUpperCase();
      const anio = String(orden.vehiculo?.anio || "");
      const coincidencias = lista.filter((item) => item.marca === marca && item.modelo === modelo);
      const ficha = coincidencias.find((item) => item.anio === anio) || coincidencias.find((item) => !item.anio) || coincidencias[0] || null;
      setFichaMedidas(ficha);
      if (!ficha) return;
      const clavePorPieza = {
        DELANTERAS: "delanteras", TRASERAS: "traseras", PANORAMICO: "panoramico", "PANORÁMICO": "panoramico",
        LUNETA: "luneta", FIJOS: "fijos", CUSTODIAS: "custodias", SUNROOF: "sunroof", "SUN ROOF": "sunroof",
      };
      setPropuesta((actual) => actual.map((linea) => ({
        ...linea,
        medidasPiezas: linea.medidasPiezas.map((medida) => {
          const guardada = ficha.medidas?.[clavePorPieza[String(medida.pieza || "").toUpperCase()]];
          if (!guardada || Number(guardada.anchoCm) <= 0 || Number(guardada.largoCm) <= 0) return medida;
          const yaTieneMedida = Number(medida.anchoCm) > 0 || Number(medida.largoCm) > 0;
          return yaTieneMedida ? medida : { ...medida, anchoCm: guardada.anchoCm, largoCm: guardada.largoCm, cantidad: guardada.cantidad || 1 };
        }),
      })));
    }).catch(() => setFichaMedidas(null));
  }, [orden]);
  const guardar = async () => {
    try {
      const cortesLargos = propuesta.filter((item) => Number(item.metrosPropuestos || 0) > 3);
      if (cortesLargos.length) {
        const detalle = cortesLargos.map((item) =>
          `${item.material}: ${Number(item.metrosPropuestos).toFixed(2)} m para ${(item.partes || []).join(", ") || item.linea}`
        ).join("\n");
        const confirmacion = await Swal.fire({
          icon: "warning",
          title: "Propuesta superior a 3 metros",
          text: `${detalle}\n\n¿Está seguro de enviar estos cortes a Inventario?`,
          showCancelButton: true,
          confirmButtonText: "Sí, enviar propuesta",
          cancelButtonText: "Revisar medidas",
          confirmButtonColor: "#2563eb",
        });
        if (!confirmacion.isConfirmed) return;
      }
      await savePropuestaCoordinacion(orden._id, { propuesta, asignaciones });
      Swal.fire({ icon: "success", title: "Responsables asignados" });
      onSaved();
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible asignar", text: error.response?.data?.message });
    }
  };
  const actualizarAsignacion = (index, cambios) => setAsignaciones((actual) => actual.map((fila, i) => i === index ? { ...fila, ...cambios } : fila));
  const actualizarMedidaPieza = (lineaIndex, piezaIndex, campo, valor) => setPropuesta((actual) => actual.map((linea, i) => i === lineaIndex ? {
    ...linea,
    medidasPiezas: linea.medidasPiezas.map((medida, j) => j === piezaIndex ? { ...medida, [campo]: valor } : medida),
  } : linea));
  const dividirServicio = (servicio) => setAsignaciones((actual) => {
    const indices = actual.map((item, index) => item.servicio === servicio.servicio ? index : -1).filter((index) => index >= 0);
    const posicion = indices.length ? indices.at(-1) + 1 : actual.length;
    const nueva = { ...servicio, descripcion: "", instaladorId: "", valorInstalacion: "" };
    return [...actual.slice(0, posicion), nueva, ...actual.slice(posicion)];
  });
  const quitarAsignacion = (index, servicio) => {
    if (asignaciones.filter((item) => item.servicio === servicio).length <= 1) {
      Swal.fire({ icon: "info", title: "Este servicio necesita al menos un instalador" });
      return;
    }
    setAsignaciones((actual) => actual.filter((_, i) => i !== index));
  };

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4">
    <div className="mx-auto my-6 max-w-4xl rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b p-5"><div><h2 className="text-lg font-black">Propuesta {orden.codigo}</h2><p className="text-sm text-slate-500">{orden.vehiculo?.placa} · propuesta de corte, responsables y precios</p></div><button onClick={onClose} className="rounded-lg border px-3 py-2">Cerrar</button></div>
      <div className="space-y-5 p-5">
        <section>
          <h3 className="mb-3 font-bold">Propuesta de corte</h3>
          {fichaMedidas ? <div className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><strong>Medidas encontradas:</strong> {resumenFichaMedidas(fichaMedidas)}</div> : <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No hay una ficha para este vehículo. El coordinador puede ingresar las medidas tomadas para cada pieza.</div>}
          {propuesta.map((item, index) => <div key={item.linea} className="mb-3 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid items-end gap-3 bg-slate-50 p-3 md:grid-cols-[1fr_180px]">
              <div><p className="text-[10px] font-black uppercase text-blue-700">{item.linea}</p><p className="font-bold text-slate-900">{item.material}</p><p className="text-xs text-slate-500">{item.partes.join(", ") || item.linea}</p></div>
              <Input label="Metros propuestos" step="0.01" value={item.metrosPropuestos} onChange={(value) => setPropuesta((actual) => actual.map((fila, i) => i === index ? { ...fila, metrosPropuestos: value } : fila))} />
            </div>
            {item.medidasPiezas.length > 0 && <div className="divide-y divide-slate-100">
              {item.medidasPiezas.map((medida, piezaIndex) => <div key={medida.pieza} className="grid items-end gap-2 p-3 sm:grid-cols-[minmax(150px,1fr)_120px_120px_100px]">
                <div><p className="text-xs font-black uppercase text-slate-700">{medida.pieza}</p><p className="text-[10px] text-slate-400">Medida tomada por Coordinación</p></div>
                <Input label="Ancho (cm)" step="0.01" value={medida.anchoCm} onChange={(value) => actualizarMedidaPieza(index, piezaIndex, "anchoCm", value)} />
                <Input label="Largo (cm)" step="0.01" value={medida.largoCm} onChange={(value) => actualizarMedidaPieza(index, piezaIndex, "largoCm", value)} />
                <Input label="Cantidad" value={medida.cantidad} onChange={(value) => actualizarMedidaPieza(index, piezaIndex, "cantidad", value)} />
              </div>)}
            </div>}
          </div>)}
        </section>
        <section>
          <div className="mb-3"><h3 className="font-bold">Instaladores y precios</h3><p className="text-xs text-slate-500">Puede asignar toda la instalación a una persona o dividir cada servicio entre varios instaladores.</p>{garantiaInstalador && <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">Garantía por instalador: únicamente el responsable de la garantía puede quedar sin pago. Si otro instalador realiza el trabajo, debe registrar su precio.</p>}</div>
          <div className="space-y-4">{servicios.map((servicio) => <div key={servicio.servicio} className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-3 py-2"><div><p className="text-sm font-black text-slate-800">{servicio.descripcion}</p><p className="text-[10px] font-bold uppercase text-slate-400">{servicio.servicio}</p></div><button type="button" onClick={() => dividirServicio(servicio)} className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50"><Plus size={14}/>Dividir entre otro instalador</button></div>
            <div className="divide-y divide-slate-100">{asignaciones.map((item, index) => item.servicio === servicio.servicio ? <div key={`${item.servicio}-${index}`} className="grid items-end gap-3 p-3 md:grid-cols-[minmax(0,1fr)_220px_170px_auto]">
              <SelectorPartes partes={servicio.partes || []} value={item.descripcion} onChange={(value) => actualizarAsignacion(index, { descripcion: value })} />
              <label className="text-xs font-bold text-slate-500">Instalador<select value={item.instaladorId} onChange={(event) => actualizarAsignacion(index, { instaladorId: event.target.value })} className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm font-normal"><option value="">Seleccione instalador</option>{instaladores.map((instalador) => <option key={instalador._id} value={instalador._id}>{instalador.nombre}</option>)}</select></label>
              <Input label={garantiaInstalador && String(item.instaladorId) === String(orden.garantia?.instaladorId || "") ? "Precio instalación (opcional)" : "Precio instalación"} value={item.valorInstalacion} onChange={(value) => actualizarAsignacion(index, { valorInstalacion: value })}/>
              <button type="button" onClick={() => quitarAsignacion(index, item.servicio)} title="Quitar esta asignación" className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={16}/></button>
            </div> : null)}</div>
          </div>)}</div>
        </section>
        <button onClick={guardar} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Enviar propuesta a Inventario</button>
      </div>
    </div>
  </div>;
}

function resumenFichaMedidas(ficha) {
  const labels = { delanteras: "Delanteras", traseras: "Traseras", panoramico: "Panorámico", luneta: "Luneta", fijos: "Fijos", custodias: "Custodias", sunroof: "Sun roof" };
  return Object.entries(ficha.medidas || {}).filter(([, item]) => Number(item?.anchoCm) > 0 && Number(item?.largoCm) > 0).map(([key, item]) => `${labels[key] || key} ${item.anchoCm}×${item.largoCm} cm (${item.cantidad})`).join(" · ") || "Sin dimensiones registradas";
}

function Input({ label, value, onChange, step = "1" }) {
  return <label className="text-xs font-bold text-slate-500">{label}<input type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm font-normal text-slate-700" /></label>;
}

function SelectorPartes({ partes, value, onChange }) {
  const seleccionadas = new Set(String(value || "").split(/\s*(?:\||,)\s*/).filter(Boolean));
  const cambiar = (parte) => {
    const nuevas = new Set(seleccionadas);
    if (nuevas.has(parte)) nuevas.delete(parte);
    else nuevas.add(parte);
    onChange(partes.filter((item) => nuevas.has(item)).join(" | "));
  };

  return <fieldset className="min-w-0">
    <legend className="text-xs font-bold text-slate-500">Partes asignadas</legend>
    <div className="mt-1 grid max-h-28 gap-1 overflow-y-auto rounded-lg border bg-slate-50 p-2 sm:grid-cols-2">
      {partes.map((parte) => <label key={parte} className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50">
        <input type="checkbox" checked={seleccionadas.has(parte)} onChange={() => cambiar(parte)} className="h-4 w-4 accent-blue-600" />
        <span className="break-words">{parte}</span>
      </label>)}
    </div>
  </fieldset>;
}

function OrdenCard({ orden, destacada, usuario, enviandoVentas, onPrepare, onReview, onWork, onSales, onReport }) {
  const etapa = orden.flujo?.etapa || "PENDIENTE_COORDINACION";
  const asignaciones = orden.coordinacion?.asignaciones || [];
  const propias = usuario?.rol === "INSTALADOR" ? asignaciones.filter((item) => String(item.instaladorId) === String(usuario._id)) : asignaciones;
  const instalacionesPendientes = asignaciones.filter((item) => item.estado !== "COMPLETADA");
  const instalacionesCompletas = asignaciones.length > 0 && instalacionesPendientes.length === 0;
  const tiposBloqueantes = ["FALTA_MATERIAL", "MATERIAL_DEFECTUOSO", "ROLLO_EQUIVOCADO", "ERROR_REGISTRO", "TRABAJO_PENDIENTE", "REPETICION_CORTE"];
  const novedadesActivas = (orden.novedades || []).filter((item) => item.estado === "PENDIENTE" || (item.estado === "APROBADA" && tiposBloqueantes.includes(item.tipo)));
  const accesoriosPendientes = (orden.accesorios || []).filter((item) => Number(item.cantidadPendiente || 0) > 0);
  const puedeProponer = ["COORDINADOR", "ADMIN", "SUPERUSUARIO"].includes(usuario?.rol) && (etapa === "PENDIENTE_COORDINACION" || orden.coordinacion?.estadoPropuesta === "RECHAZADA");
  const puedeRevisar = ["INVENTARIO", "ADMIN", "SUPERUSUARIO"].includes(usuario?.rol) && etapa === "PENDIENTE_APROBACION_CORTE";
  const puedeGestionarEnvio = ["COORDINADOR", "ADMIN", "SUPERUSUARIO"].includes(usuario?.rol) && ["MATERIAL_LISTO", "EN_INSTALACION"].includes(etapa);
  const puedeEnviar = puedeGestionarEnvio && instalacionesCompletas && novedadesActivas.length === 0 && accesoriosPendientes.length === 0;
  return <article id={`orden-${orden._id}`} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${destacada ? "border-blue-500 ring-4 ring-blue-100" : "border-slate-200"}`}>
    <div className="border-b bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold text-blue-700">{orden.codigo}</p><h2 className="text-lg font-black text-slate-900">{orden.vehiculo?.placa} · {orden.vehiculo?.marca} {orden.vehiculo?.modelo}</h2><p className="text-sm text-slate-500">{orden.cliente?.nombre} · Asesor: {orden.asesorNombre}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{etapa.replaceAll("_", " ")}</span></div></div>
    <div className="space-y-3 p-4">
      {orden.coordinacion?.observacionInventario && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">Inventario: {orden.coordinacion.observacionInventario}</p>}
      {orden.garantia?.esGarantia && <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900"><p className="font-bold">Garantía · {(orden.garantia.responsable || "POR_DEFINIR").replaceAll("_", " ")}</p>{orden.garantia.responsable === "INSTALADOR" && <p className="mt-1 text-xs">Responsable: {orden.garantia.instalador || "Sin seleccionar"} · Descuento exclusivo de material: {cop.format(orden.garantia.costoMaterial || 0)}</p>}</div>}
      {novedadesActivas.length > 0 && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p className="font-bold">Orden bloqueada por novedad</p><p className="mt-1 text-xs">{novedadesActivas.map((item) => item.tipo.replaceAll("_", " ")).join(" · ")}. Administración debe marcarla como solucionada.</p></div>}
      {accesoriosPendientes.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-bold">Accesorios pendientes de Inventario</p><p className="mt-1 text-xs">{accesoriosPendientes.map((item) => `${item.nombre} ${item.marca || ""}: faltan ${item.cantidadPendiente}`).join(" · ")}. La orden no puede enviarse a Ventas hasta recibirlos.</p></div>}
      {orden.coordinacion?.propuesta?.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase text-slate-500">Propuesta de corte</p>{orden.coordinacion.propuesta.map((item) => <div key={item.linea} className="border-t py-2 text-sm text-slate-700"><p><strong>{item.linea}</strong> · {item.metrosPropuestos} m · {item.anchoCm || 0} × {item.largoCm || 0} cm · {item.cantidad} pieza(s)</p>{item.observacion && <p className="mt-1 text-xs text-slate-500">{item.observacion}</p>}</div>)}</div>}
      {propias.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase text-slate-500">Instalaciones</p>{propias.map((item) => <div key={item._id} className="mb-2 rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-slate-800">{item.descripcion || item.servicio}</p><p className="text-xs text-slate-500">{item.instaladorNombre} · {item.estado.replaceAll("_", " ")}</p><p className="mt-1 text-sm font-black text-emerald-700">Instalación: {cop.format(item.valorInstalacion || 0)}</p>{item.fechaFinalizacion && <p className="text-xs text-slate-400">Terminada: {new Date(item.fechaFinalizacion).toLocaleString("es-CO")}</p>}</div>{usuario?.rol === "INSTALADOR" && item.estado === "PENDIENTE" && <button onClick={() => onWork(orden, item, "EN_PROCESO")} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Iniciar</button>}{usuario?.rol === "INSTALADOR" && item.estado === "EN_PROCESO" && <button onClick={() => onWork(orden, item, "COMPLETADA")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Completar</button>}</div></div>)}</div>}
      {puedeGestionarEnvio && !instalacionesCompletas && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><p className="font-bold">Aún no se puede enviar a Ventas</p><p className="mt-1 text-xs">Falta completar: {instalacionesPendientes.map((item) => `${item.descripcion || item.servicio} - ${item.instaladorNombre || "sin instalador"}`).join(" · ") || "no hay instalaciones asignadas"}.</p></div>}
      <div className="flex flex-wrap gap-2 pt-1">{puedeProponer && <button onClick={onPrepare} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Ruler size={16} /> Preparar propuesta</button>}{usuario?.rol === "COORDINADOR" && ["MATERIAL_LISTO", "EN_INSTALACION"].includes(etapa) && <button onClick={onReport} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100">Solicitar recorte</button>}{puedeRevisar && <><button onClick={() => onReview(orden, "APROBAR")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Aprobar corte</button><button onClick={() => onReview(orden, "RECHAZAR")} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Rechazar</button></>}{puedeEnviar && <button disabled={enviandoVentas} onClick={() => onSales(orden)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{enviandoVentas ? "Enviando a Ventas..." : "Finalizar y enviar a Ventas"}</button>}</div>
    </div>
  </article>;
}

export default CoordinacionPage;
