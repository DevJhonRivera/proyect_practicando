import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Ruler, Search, UserRoundCheck } from "lucide-react";
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

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const etapasActivas = new Set([
  "PENDIENTE_COORDINACION", "PENDIENTE_APROBACION_CORTE", "PENDIENTE_INVENTARIO",
  "EN_PROCESO", "MATERIAL_LISTO", "EN_INSTALACION",
]);

const lineasOrden = (orden) => [
  ...(orden.polarizados || []).map((item, index) => ({ linea: `POLARIZADO ${index + 1}`, material: `${item.material} ${item.porcentaje}`, partes: item.partes || [] })),
  ...(orden.ppf || []).map((item, index) => ({ linea: `PPF ${index + 1}`, material: `PPF ${item.referencia}`, partes: item.aplicacion === "PIEZAS" ? item.piezas || [] : [item.aplicacion] })),
];

const agruparServiciosPpf = (items = []) => {
  const grupos = new Map();
  items.forEach((item) => {
    const referencia = String(item.referencia || "PPF").trim().toUpperCase();
    const actual = grupos.get(referencia) || { servicio: `PPF ${referencia}`, piezas: [] };
    actual.piezas.push(...(item.piezas?.length ? item.piezas : [item.aplicacion]).filter(Boolean));
    grupos.set(referencia, actual);
  });
  return [...grupos.entries()].map(([referencia, item]) => ({ servicio: item.servicio, descripcion: `PPF ${referencia} · ${[...new Set(item.piezas)].join(", ")}` }));
};

const serviciosOrden = (orden) => [
  ...(orden.polarizados || []).map((item, index) => ({ servicio: `POLARIZADO ${index + 1}`, descripcion: `${item.material} ${item.porcentaje} · ${(item.partes || []).join(", ")}` })),
  ...agruparServiciosPpf(orden.ppf || []),
  ...(orden.serviciosAdicionales || []).map((item, index) => ({ servicio: `ADICIONAL ${index + 1}`, descripcion: `${item.tipo} ${item.detalle || ""}`.trim() })),
];

function CoordinacionPage() {
  const usuario = obtenerUsuarioActual();
  const puedeLiquidarInstaladores = ["VENTAS", "ADMIN", "SUPERUSUARIO"].includes(usuario?.rol);
  const [ordenes, setOrdenes] = useState([]);
  const [instaladores, setInstaladores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seleccionada, setSeleccionada] = useState(null);
  const [filtrosInstalador, setFiltrosInstalador] = useState({ desde: "", hasta: "", instalador: "TODOS", material: "TODOS", estado: "TODOS", buscar: "" });

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
    if (usuario?.rol === "INSTALADOR") return orden.coordinacion?.asignaciones?.some((item) => String(item.instaladorId) === String(usuario._id));
    return etapasActivas.has(orden.flujo?.etapa);
  }), [ordenes, usuario]);

  const instalacionesPropias = useMemo(() => (usuario?.rol === "INSTALADOR" ? ordenesBase : ordenes).flatMap((orden) =>
    (orden.coordinacion?.asignaciones || [])
      .filter((item) => usuario?.rol !== "INSTALADOR" || String(item.instaladorId) === String(usuario._id))
      .map((item) => ({ ...item, ordenId: orden._id, codigo: orden.codigo, placa: orden.vehiculo?.placa || "", vehiculo: `${orden.vehiculo?.marca || ""} ${orden.vehiculo?.modelo || ""}`.trim(), cliente: orden.cliente?.nombre || "", fecha: item.fechaFinalizacion || item.fechaInicio || orden.createdAt }))
  ), [ordenes, ordenesBase, usuario]);

  const materialesInstalador = useMemo(() => [...new Set(instalacionesPropias.map((item) => item.descripcion).filter(Boolean))].sort(), [instalacionesPropias]);
  const nombresInstaladores = useMemo(() => [...new Set(instalacionesPropias.map((item) => item.instaladorNombre).filter(Boolean))].sort(), [instalacionesPropias]);
  const instalacionesFiltradas = useMemo(() => instalacionesPropias.filter((item) => {
    const fechaItem = item.fecha ? new Date(item.fecha) : null;
    const fechaValida = fechaItem && !Number.isNaN(fechaItem.getTime());
    const desde = filtrosInstalador.desde ? new Date(`${filtrosInstalador.desde}T00:00:00`) : null;
    const hasta = filtrosInstalador.hasta ? new Date(`${filtrosInstalador.hasta}T23:59:59.999`) : null;
    const texto = `${item.codigo} ${item.placa} ${item.vehiculo} ${item.cliente} ${item.descripcion}`.toLowerCase();
    return (!desde || (fechaValida && fechaItem >= desde))
      && (!hasta || (fechaValida && fechaItem <= hasta))
      && (filtrosInstalador.instalador === "TODOS" || item.instaladorNombre === filtrosInstalador.instalador)
      && (filtrosInstalador.material === "TODOS" || item.descripcion === filtrosInstalador.material)
      && (filtrosInstalador.estado === "TODOS" || item.estado === filtrosInstalador.estado)
      && (!filtrosInstalador.buscar || texto.includes(filtrosInstalador.buscar.toLowerCase()));
  }), [instalacionesPropias, filtrosInstalador]);

  const ordenesFiltradasIds = useMemo(() => new Set(instalacionesFiltradas.map((item) => String(item.ordenId))), [instalacionesFiltradas]);
  const visibles = usuario?.rol === "INSTALADOR" ? ordenesBase.filter((orden) => ordenesFiltradasIds.has(String(orden._id))) : ordenesBase;
  const instalacionesCompletadas = instalacionesFiltradas.filter((item) => item.estado === "COMPLETADA");
  const totalInstalacion = instalacionesCompletadas.reduce((total, item) => total + Number(item.valorInstalacion || 0), 0);
  const totalesPorInstalador = useMemo(() => {
    const totales = new Map();
    instalacionesCompletadas.forEach((item) => {
      const nombre = item.instaladorNombre || "SIN INSTALADOR";
      const actual = totales.get(nombre) || { nombre, trabajos: 0, total: 0 };
      actual.trabajos += 1;
      actual.total += Number(item.valorInstalacion || 0);
      totales.set(nombre, actual);
    });
    return [...totales.values()].sort((a, b) => b.total - a.total);
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
    { header: "Valor instalación", value: (item) => Number(item.valorInstalacion || 0) },
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
    try {
      await sendTrabajoToSales(orden._id);
      await cargar();
      Swal.fire({ icon: "success", title: "Servicio enviado a Ventas" });
    } catch (error) {
      Swal.fire({ icon: "warning", title: "El servicio todavía no está listo", text: error.response?.data?.message });
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
              <p className="text-sm text-slate-500">{instalacionesFiltradas.length} trabajo(s) encontrados · {instalacionesCompletadas.length} completado(s)</p>
              <p className="mt-1 text-base font-black text-emerald-700">Pago del periodo: {cop.format(totalInstalacion)}</p>
            </div>
            <ExcelButton title={usuario?.rol === "INSTALADOR" ? "Mis instalaciones" : "Liquidación de instaladores"} fileName={usuario?.rol === "INSTALADOR" ? "mis-instalaciones" : "liquidacion-instaladores"} sheetName="Instalaciones" columns={excelInstalaciones} rows={instalacionesFiltradas} />
          </div>
          {puedeLiquidarInstaladores && totalesPorInstalador.length > 0 && <div className="mb-4 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{totalesPorInstalador.map((item) => <div key={item.nombre} className="min-w-0 rounded-lg border border-emerald-100 bg-emerald-50 p-3"><p className="break-words text-xs font-bold uppercase text-emerald-700">{item.nombre}</p><p className="mt-1 break-all text-base font-black tabular-nums text-emerald-900 sm:text-lg">{cop.format(item.total)}</p><p className="text-xs text-emerald-700">{item.trabajos} instalación(es) completada(s)</p></div>)}</div></div>}
          <div className={`grid gap-3 md:grid-cols-2 ${puedeLiquidarInstaladores ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
            <label className="text-xs font-bold uppercase text-slate-500">Desde<input type="date" max={filtrosInstalador.hasta || undefined} value={filtrosInstalador.desde} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, desde: event.target.value }))} className="mt-1 w-full rounded-xl border bg-white p-3 text-sm font-normal text-slate-700" /></label>
            <label className="text-xs font-bold uppercase text-slate-500">Hasta<input type="date" min={filtrosInstalador.desde || undefined} value={filtrosInstalador.hasta} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, hasta: event.target.value }))} className="mt-1 w-full rounded-xl border bg-white p-3 text-sm font-normal text-slate-700" /></label>
            {puedeLiquidarInstaladores && <label className="text-xs font-bold uppercase text-slate-500">Instalador<select value={filtrosInstalador.instalador} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, instalador: event.target.value }))} className="mt-1 w-full rounded-xl border bg-white p-3 text-sm font-normal text-slate-700"><option value="TODOS">Todos</option>{nombresInstaladores.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}</select></label>}
            <label className="text-xs font-bold uppercase text-slate-500">Material o servicio<select value={filtrosInstalador.material} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, material: event.target.value }))} className="mt-1 w-full rounded-xl border bg-white p-3 text-sm font-normal text-slate-700"><option value="TODOS">Todos</option>{materialesInstalador.map((material) => <option key={material} value={material}>{material}</option>)}</select></label>
            <label className="text-xs font-bold uppercase text-slate-500">Estado<select value={filtrosInstalador.estado} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, estado: event.target.value }))} className="mt-1 w-full rounded-xl border bg-white p-3 text-sm font-normal text-slate-700"><option value="TODOS">Todos</option><option value="PENDIENTE">Pendiente</option><option value="EN_PROCESO">En proceso</option><option value="COMPLETADA">Completada</option></select></label>
            <label className="text-xs font-bold uppercase text-slate-500">Buscar<div className="relative mt-1"><Search className="absolute left-3 top-3.5 text-slate-400" size={17} /><input value={filtrosInstalador.buscar} onChange={(event) => setFiltrosInstalador((actual) => ({ ...actual, buscar: event.target.value }))} placeholder="Placa, cliente u orden" className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm font-normal text-slate-700" /></div></label>
          </div>
        </section>
      )}

      {visibles.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">No hay trabajos pendientes para este perfil.</div> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibles.map((orden) => <OrdenCard key={orden._id} orden={orden} usuario={usuario} onPrepare={() => setSeleccionada(orden)} onReview={revisar} onWork={cambiarTrabajo} onSales={enviarVentas} />)}
        </div>
      )}

      {seleccionada && <AsignacionModal orden={seleccionada} instaladores={instaladores} onClose={() => setSeleccionada(null)} onSaved={async () => { setSeleccionada(null); await cargar(); }} />}
    </div>
  );
}

function AsignacionModal({ orden, instaladores, onClose, onSaved }) {
  const servicios = serviciosOrden(orden);
  const lineas = lineasOrden(orden);
  const [fichaMedidas, setFichaMedidas] = useState(null);
  const [propuesta, setPropuesta] = useState(() => lineas.map((linea) => {
    const actual = orden.coordinacion?.propuesta?.find((item) => item.linea === linea.linea);
    return { ...linea, metrosPropuestos: actual?.metrosPropuestos || "", observacion: actual?.observacion || "" };
  }));
  const [asignaciones, setAsignaciones] = useState(() => servicios.map((servicio) => {
    const actual = orden.coordinacion?.asignaciones?.find((item) => item.servicio === servicio.servicio);
    return { ...servicio, instaladorId: actual?.instaladorId || "", valorInstalacion: actual?.valorInstalacion || "" };
  }));
  useEffect(() => {
    getMedidasVehiculos().then((response) => {
      const lista = response.data?.data || [];
      const marca = String(orden.vehiculo?.marca || "").toUpperCase();
      const modelo = String(orden.vehiculo?.modelo || "").toUpperCase();
      const anio = String(orden.vehiculo?.anio || "");
      const coincidencias = lista.filter((item) => item.marca === marca && item.modelo === modelo);
      setFichaMedidas(coincidencias.find((item) => item.anio === anio) || coincidencias.find((item) => !item.anio) || coincidencias[0] || null);
    }).catch(() => setFichaMedidas(null));
  }, [orden]);
  const guardar = async () => {
    try {
      await savePropuestaCoordinacion(orden._id, { propuesta, asignaciones });
      Swal.fire({ icon: "success", title: "Responsables asignados" });
      onSaved();
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible asignar", text: error.response?.data?.message });
    }
  };
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4"><div className="mx-auto my-6 max-w-3xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-lg font-black">Propuesta {orden.codigo}</h2><p className="text-sm text-slate-500">{orden.vehiculo?.placa} · propuesta de corte, responsables y precios</p></div><button onClick={onClose} className="rounded-lg border px-3 py-2">Cerrar</button></div><div className="space-y-5 p-5"><section><h3 className="mb-3 font-bold">Propuesta de corte</h3>{fichaMedidas ? <div className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><strong>Medidas encontradas:</strong> {resumenFichaMedidas(fichaMedidas)}</div> : <div className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No hay una ficha para este vehículo. Regístrela en Medidas de vehículos; aquí solo debe indicar los metros propuestos.</div>}{propuesta.map((item, index) => <div key={item.linea} className="mb-2 grid items-end gap-3 rounded-xl border p-3 md:grid-cols-[1fr_180px]"><div><p className="font-bold">{item.material}</p><p className="text-xs text-slate-500">{item.partes.join(", ") || item.linea}</p></div><Input label="Metros propuestos" step="0.01" value={item.metrosPropuestos} onChange={(value) => setPropuesta((actual) => actual.map((fila, i) => i === index ? { ...fila, metrosPropuestos: value } : fila))} /></div>)}</section><section><h3 className="mb-3 font-bold">Instaladores y precios</h3>{asignaciones.map((item, index) => <div key={item.servicio} className="grid items-end gap-3 rounded-xl border p-3 md:grid-cols-[1fr_230px_180px]"><div><p className="font-bold">{item.descripcion}</p><p className="text-xs text-slate-500">{item.servicio}</p></div><label className="text-xs font-bold text-slate-500">Instalador<select value={item.instaladorId} onChange={(event) => setAsignaciones((actual) => actual.map((fila, i) => i === index ? { ...fila, instaladorId: event.target.value } : fila))} className="mt-1 w-full rounded-xl border bg-white p-3 text-sm font-normal"><option value="">Seleccione instalador</option>{instaladores.map((instalador) => <option key={instalador._id} value={instalador._id}>{instalador.nombre}</option>)}</select></label><Input label="Precio instalación" value={item.valorInstalacion} onChange={(value) => setAsignaciones((actual) => actual.map((fila, i) => i === index ? { ...fila, valorInstalacion: value } : fila))} /></div>)}</section><button onClick={guardar} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Enviar propuesta a Inventario</button></div></div></div>;
}

function resumenFichaMedidas(ficha) {
  const labels = { delanteras: "Delanteras", traseras: "Traseras", panoramico: "Panorámico", luneta: "Luneta", fijos: "Fijos", custodias: "Custodias", sunroof: "Sun roof" };
  return Object.entries(ficha.medidas || {}).filter(([, item]) => Number(item?.anchoCm) > 0 && Number(item?.largoCm) > 0).map(([key, item]) => `${labels[key] || key} ${item.anchoCm}×${item.largoCm} cm (${item.cantidad})`).join(" · ") || "Sin dimensiones registradas";
}

function OrdenCard({ orden, usuario, onPrepare, onReview, onWork, onSales }) {
  const etapa = orden.flujo?.etapa || "PENDIENTE_COORDINACION";
  const asignaciones = orden.coordinacion?.asignaciones || [];
  const propias = usuario?.rol === "INSTALADOR" ? asignaciones.filter((item) => String(item.instaladorId) === String(usuario._id)) : asignaciones;
  const instalacionesPendientes = asignaciones.filter((item) => item.estado !== "COMPLETADA");
  const instalacionesCompletas = asignaciones.length > 0 && instalacionesPendientes.length === 0;
  const tiposBloqueantes = ["FALTA_MATERIAL", "MATERIAL_DEFECTUOSO", "ROLLO_EQUIVOCADO", "ERROR_REGISTRO", "TRABAJO_PENDIENTE"];
  const novedadesActivas = (orden.novedades || []).filter((item) => item.estado === "PENDIENTE" || (item.estado === "APROBADA" && tiposBloqueantes.includes(item.tipo)));
  const puedeProponer = ["COORDINADOR", "ADMIN", "SUPERUSUARIO"].includes(usuario?.rol) && (etapa === "PENDIENTE_COORDINACION" || orden.coordinacion?.estadoPropuesta === "RECHAZADA");
  const puedeRevisar = ["INVENTARIO", "ADMIN", "SUPERUSUARIO"].includes(usuario?.rol) && etapa === "PENDIENTE_APROBACION_CORTE";
  const puedeGestionarEnvio = ["COORDINADOR", "ADMIN", "SUPERUSUARIO"].includes(usuario?.rol) && ["MATERIAL_LISTO", "EN_INSTALACION"].includes(etapa);
  const puedeEnviar = puedeGestionarEnvio && instalacionesCompletas && novedadesActivas.length === 0;
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold text-blue-700">{orden.codigo}</p><h2 className="text-lg font-black text-slate-900">{orden.vehiculo?.placa} · {orden.vehiculo?.marca} {orden.vehiculo?.modelo}</h2><p className="text-sm text-slate-500">{orden.cliente?.nombre} · Asesor: {orden.asesorNombre}</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{etapa.replaceAll("_", " ")}</span></div></div>
    <div className="space-y-3 p-4">
      {orden.coordinacion?.observacionInventario && <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">Inventario: {orden.coordinacion.observacionInventario}</p>}
      {novedadesActivas.length > 0 && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><p className="font-bold">Orden bloqueada por novedad</p><p className="mt-1 text-xs">{novedadesActivas.map((item) => item.tipo.replaceAll("_", " ")).join(" · ")}. Administración debe marcarla como solucionada.</p></div>}
      {orden.coordinacion?.propuesta?.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase text-slate-500">Propuesta de corte</p>{orden.coordinacion.propuesta.map((item) => <div key={item.linea} className="border-t py-2 text-sm text-slate-700"><p><strong>{item.linea}</strong> · {item.metrosPropuestos} m · {item.anchoCm || 0} × {item.largoCm || 0} cm · {item.cantidad} pieza(s)</p>{item.observacion && <p className="mt-1 text-xs text-slate-500">{item.observacion}</p>}</div>)}</div>}
      {propias.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase text-slate-500">Instalaciones</p>{propias.map((item) => <div key={item._id} className="mb-2 rounded-xl border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-slate-800">{item.descripcion || item.servicio}</p><p className="text-xs text-slate-500">{item.instaladorNombre} · {item.estado.replaceAll("_", " ")}</p><p className="mt-1 text-sm font-black text-emerald-700">Instalación: {cop.format(item.valorInstalacion || 0)}</p>{item.fechaFinalizacion && <p className="text-xs text-slate-400">Terminada: {new Date(item.fechaFinalizacion).toLocaleString("es-CO")}</p>}</div>{usuario?.rol === "INSTALADOR" && item.estado === "PENDIENTE" && <button onClick={() => onWork(orden, item, "EN_PROCESO")} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Iniciar</button>}{usuario?.rol === "INSTALADOR" && item.estado === "EN_PROCESO" && <button onClick={() => onWork(orden, item, "COMPLETADA")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Completar</button>}</div></div>)}</div>}
      {puedeGestionarEnvio && !instalacionesCompletas && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><p className="font-bold">Aún no se puede enviar a Ventas</p><p className="mt-1 text-xs">Falta completar: {instalacionesPendientes.map((item) => `${item.descripcion || item.servicio} - ${item.instaladorNombre || "sin instalador"}`).join(" · ") || "no hay instalaciones asignadas"}.</p></div>}
      <div className="flex flex-wrap gap-2 pt-1">{puedeProponer && <button onClick={onPrepare} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Ruler size={16} /> Preparar propuesta</button>}{puedeRevisar && <><button onClick={() => onReview(orden, "APROBAR")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Aprobar corte</button><button onClick={() => onReview(orden, "RECHAZAR")} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Rechazar</button></>}{puedeEnviar && <button onClick={() => onSales(orden)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Finalizar y enviar a Ventas</button>}</div>
    </div>
  </article>;
}

function PropuestaModal({ orden, instaladores, onClose, onSaved }) {
  const lineas = lineasOrden(orden);
  const servicios = serviciosOrden(orden);
  const [propuesta, setPropuesta] = useState(() => lineas.map((linea) => {
    const actual = orden.coordinacion?.propuesta?.find((item) => item.linea === linea.linea);
    return { ...linea, anchoCm: actual?.anchoCm || "", largoCm: actual?.largoCm || "", cantidad: actual?.cantidad || 1, metrosPropuestos: actual?.metrosPropuestos || "", observacion: actual?.observacion || "" };
  }));
  const [asignaciones, setAsignaciones] = useState(() => servicios.map((servicio) => { const actual = orden.coordinacion?.asignaciones?.find((item) => item.servicio === servicio.servicio); return { ...servicio, instaladorId: actual?.instaladorId || "", valorInstalacion: actual?.valorInstalacion || "" }; }));

  const guardar = async () => {
    try {
      await savePropuestaCoordinacion(orden._id, { propuesta, asignaciones });
      Swal.fire({ icon: "success", title: "Propuesta enviada a Inventario" });
      onSaved();
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible enviar", text: error.response?.data?.message });
    }
  };

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-4"><div className="mx-auto my-6 max-w-4xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-lg font-black">Propuesta {orden.codigo}</h2><p className="text-sm text-slate-500">{orden.vehiculo?.placa} · registre medidas y responsables</p></div><button onClick={onClose} className="rounded-lg border px-3 py-2">Cerrar</button></div><div className="space-y-6 p-5"><section><h3 className="mb-3 flex items-center gap-2 font-bold"><Ruler size={18} /> Medidas y cortes</h3>{propuesta.map((item, index) => <div key={item.linea} className="mb-3 rounded-xl border p-4"><p className="mb-3 font-bold">{item.linea} · {item.material} · {item.partes.join(", ")}</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Input label="Ancho cm" value={item.anchoCm} onChange={(value) => setPropuesta((actual) => actual.map((fila, i) => i === index ? { ...fila, anchoCm: value } : fila))} /><Input label="Largo cm" value={item.largoCm} onChange={(value) => setPropuesta((actual) => actual.map((fila, i) => i === index ? { ...fila, largoCm: value } : fila))} /><Input label="Cantidad piezas" value={item.cantidad} onChange={(value) => setPropuesta((actual) => actual.map((fila, i) => i === index ? { ...fila, cantidad: value } : fila))} /><Input label="Metros a cortar" value={item.metrosPropuestos} step="0.01" onChange={(value) => setPropuesta((actual) => actual.map((fila, i) => i === index ? { ...fila, metrosPropuestos: value } : fila))} /></div><textarea value={item.observacion} onChange={(event) => setPropuesta((actual) => actual.map((fila, i) => i === index ? { ...fila, observacion: event.target.value.toUpperCase() } : fila))} rows="2" placeholder="Detalle por pieza. Ej: DELANTERAS 90×57 (2), TRASERAS 80×45 (2)" className="mt-3 w-full rounded-xl border p-3 text-sm" /></div>)}</section><section><h3 className="mb-3 flex items-center gap-2 font-bold"><UserRoundCheck size={18} /> Asignar instaladores y precio</h3>{asignaciones.map((item, index) => <div key={item.servicio} className="mb-2 grid items-end gap-3 rounded-xl border p-3 md:grid-cols-[1fr_230px_180px]"><div><p className="font-bold">{item.descripcion}</p><p className="text-xs text-slate-500">{item.servicio}</p></div><label className="text-xs font-bold text-slate-500">Instalador<select value={item.instaladorId} onChange={(event) => setAsignaciones((actual) => actual.map((fila, i) => i === index ? { ...fila, instaladorId: event.target.value } : fila))} className="mt-1 w-full rounded-xl border bg-white p-3 text-sm font-normal text-slate-700"><option value="">Seleccione instalador</option>{instaladores.map((instalador) => <option key={instalador._id} value={instalador._id}>{instalador.nombre}</option>)}</select></label><Input label="Precio instalación" value={item.valorInstalacion} onChange={(value) => setAsignaciones((actual) => actual.map((fila, i) => i === index ? { ...fila, valorInstalacion: value } : fila))} /></div>)}</section><button onClick={guardar} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Enviar propuesta a Inventario</button></div></div></div>;
}

function Input({ label, value, onChange, step = "1" }) {
  return <label className="text-sm font-semibold text-slate-600">{label}<input type="number" min="0" step={step} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border p-3" /></label>;
}

export default CoordinacionPage;
