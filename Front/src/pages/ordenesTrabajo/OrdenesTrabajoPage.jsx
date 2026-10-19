import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarDays, Check, Circle, Clock3, RefreshCw, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { getOrdenesTrabajo } from "../../api/ordenesTrabajo.api";
import { obtenerUsuarioActual } from "../../utils/permisos";

const ETAPAS = ["Recepción", "Coordinación", "Inventario", "Instalación", "Ventas", "Pagado"];
const avancePorEtapa = {
  PENDIENTE_GARANTIA: 1, PENDIENTE_COORDINACION: 1,
  PENDIENTE_APROBACION_CORTE: 2, PENDIENTE_INVENTARIO: 2, EN_PROCESO: 2,
  MATERIAL_LISTO: 3, EN_INSTALACION: 3,
  PENDIENTE_PAGO: 4, FINALIZADA: 5,
};
const etapaLegible = (value) => String(value || "PENDIENTE").replaceAll("_", " ");
const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const FILTROS_INICIALES = { buscar: "", estado: "EN_CURSO", etapa: "", instaladorId: "", desde: "", hasta: "" };

const bloqueosOrden = (orden) => {
  const bloqueos = [];
  const accesorios = (orden.accesorios || []).filter((item) => Number(item.cantidadPendiente || 0) > 0);
  if (accesorios.length) bloqueos.push(`Accesorios pendientes: ${accesorios.map((item) => `${item.nombre} (${item.cantidadPendiente})`).join(", ")}`);
  const novedades = (orden.novedades || []).filter((item) => item.estado === "PENDIENTE" || (item.estado === "APROBADA" && ["FALTA_MATERIAL", "MATERIAL_DEFECTUOSO", "ROLLO_EQUIVOCADO", "ERROR_REGISTRO", "TRABAJO_PENDIENTE"].includes(item.tipo)));
  if (novedades.length) bloqueos.push(`Novedades abiertas: ${novedades.map((item) => etapaLegible(item.tipo)).join(", ")}`);
  if (orden.garantia?.esGarantia && orden.garantia.estado === "PENDIENTE") bloqueos.push("Garantía pendiente de aprobación");
  return bloqueos;
};

const destinoOrden = (orden, rol) => {
  const id = orden._id;
  const etapa = orden.flujo?.etapa;
  if (rol === "ASESOR") return `/asesores?asesoria=${id}`;
  if (rol === "INSTALADOR" || rol === "COORDINADOR") return `/coordinacion?asesoria=${id}`;
  if (rol === "VENTAS") return `/ventas?asesoria=${id}`;
  if ((orden.accesorios || []).some((item) => Number(item.cantidadPendiente || 0) > 0) && rol === "INVENTARIO") return "/accesorios";
  if (["PENDIENTE_APROBACION_CORTE", "PENDIENTE_INVENTARIO", "EN_PROCESO"].includes(etapa)) return `/cortes?asesoria=${id}`;
  if (["MATERIAL_LISTO", "EN_INSTALACION", "PENDIENTE_COORDINACION"].includes(etapa)) return `/coordinacion?asesoria=${id}`;
  if (etapa === "PENDIENTE_PAGO") return `/ventas?asesoria=${id}`;
  return `/asesores?asesoria=${id}`;
};

const accionOrden = (orden, rol) => {
  if (rol === "ASESOR") return "Ver servicio";
  if (rol === "INSTALADOR") return "Abrir mi trabajo";
  if (rol === "VENTAS") return orden.flujo?.etapa === "FINALIZADA" ? "Ver orden" : "Registrar pago";
  if ((orden.accesorios || []).some((item) => Number(item.cantidadPendiente || 0) > 0) && rol === "INVENTARIO") return "Revisar accesorios";
  const labels = { PENDIENTE_GARANTIA: "Revisar garantía", PENDIENTE_COORDINACION: "Preparar orden", PENDIENTE_APROBACION_CORTE: "Revisar propuesta", PENDIENTE_INVENTARIO: "Registrar cortes", EN_PROCESO: "Continuar cortes", MATERIAL_LISTO: "Gestionar instalación", EN_INSTALACION: "Ver instalaciones", PENDIENTE_PAGO: "Registrar pago", FINALIZADA: "Ver orden finalizada", CANCELADA: "Ver cancelación" };
  return labels[orden.flujo?.etapa] || "Abrir orden";
};

const turnoOrden = (orden, usuario) => {
  const etapa = orden.flujo?.etapa;
  const rol = usuario?.rol;
  if (["ADMIN", "SUPERUSUARIO"].includes(rol) && !["FINALIZADA", "CANCELADA"].includes(etapa)) return { habilitado: true, responsable: "Administración" };
  if ((orden.accesorios || []).some((item) => Number(item.cantidadPendiente || 0) > 0)) {
    return { habilitado: rol === "INVENTARIO", responsable: "Inventario" };
  }
  if (etapa === "PENDIENTE_GARANTIA") return { habilitado: false, responsable: "Administración" };
  if (etapa === "PENDIENTE_COORDINACION") return { habilitado: rol === "COORDINADOR", responsable: "Coordinación" };
  if (["PENDIENTE_APROBACION_CORTE", "PENDIENTE_INVENTARIO", "EN_PROCESO"].includes(etapa)) return { habilitado: rol === "INVENTARIO", responsable: "Inventario" };
  if (["MATERIAL_LISTO", "EN_INSTALACION"].includes(etapa)) {
    const asignado = (orden.coordinacion?.asignaciones || []).some((item) => String(item.instaladorId) === String(usuario?._id) && item.estado !== "COMPLETADA");
    if (rol === "INSTALADOR") return { habilitado: asignado, responsable: asignado ? "Tú tienes trabajo asignado" : "Instaladores asignados" };
    return { habilitado: rol === "COORDINADOR", responsable: "Coordinación e instaladores" };
  }
  if (etapa === "PENDIENTE_PAGO") return { habilitado: rol === "VENTAS", responsable: "Ventas" };
  if (etapa === "FINALIZADA") return { habilitado: false, responsable: "Proceso terminado" };
  if (etapa === "CANCELADA") return { habilitado: false, responsable: "Orden cancelada" };
  return { habilitado: false, responsable: "Pendiente de asignación" };
};

export default function OrdenesTrabajoPage() {
  const usuario = obtenerUsuarioActual();
  const [items, setItems] = useState([]);
  const [instaladores, setInstaladores] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [loading, setLoading] = useState(true);

  const cargar = async (page = 1, silencioso = false) => {
    try {
      if (!silencioso) setLoading(true);
      const response = await getOrdenesTrabajo({ ...filtros, page, limit: 12 });
      setItems(response.data?.data?.items || []);
      setInstaladores(response.data?.data?.instaladores || []);
      setPagination(response.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error) { if (!silencioso) Swal.fire({ icon: "error", title: "No fue posible cargar las órdenes", text: error.response?.data?.message }); }
    finally { if (!silencioso) setLoading(false); }
  };

  useEffect(() => { const timer = setTimeout(() => cargar(1), 250); return () => clearTimeout(timer); }, [filtros]);
  useEffect(() => { const timer = setInterval(() => cargar(pagination.page, true), 20000); return () => clearInterval(timer); }, [filtros, pagination.page]);

  const resumen = useMemo(() => ({
    bloqueadas: items.filter((item) => bloqueosOrden(item).length).length,
    porCobrar: items.filter((item) => item.flujo?.etapa === "PENDIENTE_PAGO").length,
    instalando: items.filter((item) => item.flujo?.etapa === "EN_INSTALACION").length,
  }), [items]);
  const filtrosActivos = useMemo(() => [
    filtros.buscar,
    filtros.estado !== FILTROS_INICIALES.estado ? filtros.estado : "",
    filtros.etapa,
    filtros.instaladorId,
    filtros.desde,
    filtros.hasta,
  ].filter(Boolean).length, [filtros]);

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-900">Órdenes de trabajo</h1><p className="mt-1 text-sm text-slate-500">Sigue cada vehículo desde la recepción hasta el pago, aunque varios trabajos avancen al mismo tiempo.</p></div><button onClick={() => cargar(pagination.page)} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw size={17}/>Actualizar</button></header>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Órdenes encontradas" value={pagination.total}/><Metric label="Bloqueadas visibles" value={resumen.bloqueadas} tone="amber"/><Metric label="En instalación" value={resumen.instalando} tone="blue"/><Metric label="Listas para cobrar" value={resumen.porCobrar} tone="emerald"/></section>

    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600"><SlidersHorizontal size={15}/></span>
          Filtros
          {filtrosActivos > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-700">{filtrosActivos} {filtrosActivos === 1 ? "activo" : "activos"}</span>}
        </div>
        <button type="button" onClick={() => setFiltros(FILTROS_INICIALES)} disabled={filtrosActivos === 0} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-bold text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:cursor-default disabled:opacity-35" title="Restablecer filtros"><X size={14}/>Limpiar</button>
      </div>
      <div className="flex flex-col gap-3 p-3 xl:flex-row xl:items-end">
        <FilterField label="Buscar" className="min-w-0 flex-1 xl:min-w-[240px]">
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15}/><input value={filtros.buscar} onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })} placeholder="Placa, cliente, cédula u orden" className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/></div>
        </FilterField>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:shrink-0">
          <FilterField label="Estado" className="xl:w-36"><select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="EN_CURSO">En curso</option><option value="FINALIZADAS">Finalizadas</option><option value="CANCELADAS">Canceladas</option><option value="">Todas</option></select></FilterField>
          <FilterField label="Etapa" className="xl:w-44"><select value={filtros.etapa} onChange={(e) => setFiltros({ ...filtros, etapa: e.target.value, estado: "" })} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">Todas las etapas</option>{Object.keys(avancePorEtapa).map((etapa) => <option key={etapa} value={etapa}>{etapaLegible(etapa)}</option>)}</select></FilterField>
          {instaladores.length > 0 && <FilterField label="Instalador" className="sm:col-span-2 lg:col-span-1 xl:w-48"><select value={filtros.instaladorId} onChange={(e) => setFiltros({ ...filtros, instaladorId: e.target.value })} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">Todos</option>{instaladores.map((item) => <option key={item._id} value={item._id}>{item.nombre}</option>)}</select></FilterField>}
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-2 xl:shrink-0">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500"><CalendarDays size={12}/>Rango de fechas</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="min-w-0"><span className="sr-only">Desde</span><input type="date" title="Desde" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} className="h-8 min-w-0 w-full rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/></label>
            <label className="min-w-0"><span className="sr-only">Hasta</span><input type="date" title="Hasta" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} className="h-8 min-w-0 w-full rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/></label>
          </div>
        </div>
      </div>
    </section>

    {loading ? <div className="rounded-lg border bg-white p-12 text-center text-slate-500">Cargando órdenes...</div> : items.length === 0 ? <div className="rounded-lg border bg-white p-12 text-center text-slate-500">No hay órdenes con estos filtros.</div> : <div className="grid gap-4 2xl:grid-cols-2">{items.map((orden) => <OrdenCard key={orden._id} orden={orden} usuario={usuario}/>)}</div>}

    <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 text-sm"><span>Página {pagination.page} de {pagination.totalPages} · {pagination.total} órdenes</span><div className="flex gap-2"><button disabled={pagination.page <= 1} onClick={() => cargar(pagination.page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button><button disabled={pagination.page >= pagination.totalPages} onClick={() => cargar(pagination.page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Siguiente</button></div></div>
  </div>;
}

function FilterField({ label, className = "", children }) {
  return <label className={`block min-w-0 ${className}`}><span className="mb-1 block text-[10px] font-black uppercase text-slate-500">{label}</span>{children}</label>;
}

function Metric({ label, value, tone = "slate" }) {
  const estilos = { slate: "border-slate-200 text-slate-900", amber: "border-amber-200 text-amber-700", blue: "border-blue-200 text-blue-700", emerald: "border-emerald-200 text-emerald-700" };
  return <div className={`min-w-0 rounded-lg border bg-white p-4 ${estilos[tone]}`}><p className="truncate text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 truncate text-2xl font-black">{value}</p></div>;
}

function OrdenCard({ orden, usuario }) {
  const etapa = orden.flujo?.etapa || "PENDIENTE_COORDINACION";
  const avance = avancePorEtapa[etapa] ?? 0;
  const bloqueos = bloqueosOrden(orden);
  const asignaciones = orden.coordinacion?.asignaciones || [];
  const turno = turnoOrden(orden, usuario);
  const servicios = [
    ...(orden.polarizados || []).map((item) => `${item.material} ${item.porcentaje}`),
    ...(orden.ppf || []).map((item) => `PPF ${item.referencia}`),
    ...(orden.serviciosAdicionales || []).map((item) => item.tipo),
    ...(orden.accesorios || []).map((item) => `${item.cantidad}× ${item.nombre}`),
  ];
  return <article className={`overflow-hidden rounded-lg border bg-white shadow-sm ${bloqueos.length ? "border-amber-300" : "border-slate-200"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-slate-50 p-4"><div className="min-w-0"><p className="text-xs font-bold text-blue-700">{orden.codigo}</p><h2 className="truncate text-lg font-black text-slate-900">{orden.vehiculo?.placa} · {orden.vehiculo?.marca} {orden.vehiculo?.modelo}</h2><p className="truncate text-sm text-slate-500">{orden.cliente?.nombre} · Asesor: {orden.asesorNombre}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${etapa === "FINALIZADA" ? "bg-emerald-100 text-emerald-700" : etapa === "CANCELADA" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{etapaLegible(etapa)}</span></div>
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-6 gap-1" aria-label={`Progreso: ${ETAPAS[avance]}`}>
        {ETAPAS.map((nombre, index) => <div key={nombre} className="min-w-0 text-center"><div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border ${index < avance || etapa === "FINALIZADA" ? "border-emerald-600 bg-emerald-600 text-white" : index === avance ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-300"}`}>{index < avance || etapa === "FINALIZADA" ? <Check size={14}/> : index === avance ? <Clock3 size={13}/> : <Circle size={12}/>}</div><p className="mt-1 truncate text-[9px] font-semibold text-slate-500 sm:text-[10px]">{nombre}</p></div>)}
      </div>
      <div><p className="text-xs font-bold uppercase text-slate-500">Servicios</p><p className="mt-1 line-clamp-2 text-sm text-slate-700">{servicios.join(" · ") || "Sin detalle"}</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><p className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500"><Users size={13}/>Instaladores</p>{asignaciones.length ? <div className="mt-1 space-y-1">{asignaciones.map((item) => <p key={item._id} className="text-xs text-slate-700"><strong>{item.instaladorNombre}</strong> · {item.descripcion || item.servicio} · {etapaLegible(item.estado)}</p>)}</div> : <p className="mt-1 text-xs text-slate-400">Aún sin asignar</p>}</div><div><p className="text-xs font-bold uppercase text-slate-500">Valor acordado</p><p className="mt-1 text-lg font-black text-slate-900">{cop.format(orden.comercial?.totalAcordado || 0)}</p><p className="text-xs text-slate-500">Pago: {etapaLegible(orden.pago?.estado)}</p></div></div>
      {bloqueos.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="flex items-center gap-2 font-bold"><AlertTriangle size={16}/>Esta orden necesita atención</p>{bloqueos.map((item) => <p key={item} className="mt-1 text-xs">{item}</p>)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div><p className="text-xs text-slate-400">Actualizada {new Date(orden.updatedAt).toLocaleString("es-CO")}</p><p className={`mt-1 text-xs font-bold ${turno.habilitado ? "text-emerald-700" : "text-slate-500"}`}>{turno.habilitado ? "Es tu turno" : `Turno de: ${turno.responsable}`}</p></div>{turno.habilitado ? <Link to={destinoOrden(orden, usuario?.rol)} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">{accionOrden(orden, usuario?.rol)}<ArrowRight size={15}/></Link> : <span className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-400">Esperando turno<Clock3 size={15}/></span>}</div>
    </div>
  </article>;
}
