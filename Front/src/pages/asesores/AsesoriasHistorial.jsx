import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Download, Eye, Filter, Pencil, ReceiptText, Search, TriangleAlert, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { getAsesorias, resolveNovedadAsesoria, reviewGarantiaAsesoria, reviewNovedadAsesoria } from "../../api/asesores.api";
import AppModal from "../../components/ui/AppModal";
import { obtenerUsuarioActual } from "../../utils/permisos";
import { descargarExcel } from "../../utils/excelExport";
import AsesoriaFormModal from "./AsesoriaFormModal";
import NovedadAsesoriaModal from "./NovedadAsesoriaModal";

const inicial = {
  buscar: "",
  desde: "",
  hasta: "",
  asesorId: "",
  estado: "",
  estadoPago: "",
  metodoPago: "",
  situacion: "",
  garantia: "",
};

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const resumenPolarizado = (items = []) =>
  items
    .map((item) => `${item.material || ""} ${item.porcentaje || ""}%: ${(item.partes || []).join(", ")}`)
    .join(" | ");

const resumenPpf = (items = []) =>
  items
    .map((item) => `${item.referencia || "PPF"}: ${item.aplicacion || ""}${item.piezas?.length ? ` (${item.piezas.join(", ")})` : ""}`)
    .join(" | ");

const resumenAdicionales = (items = []) =>
  items.map((item) => `${item.tipo || ""}${item.detalle ? `: ${item.detalle}` : ""}`).join(" | ");

const columnasExcel = [
  { header: "Código", value: (item) => item.codigo || "", width: 18 },
  { header: "Fecha", value: (item) => item.createdAt ? new Date(item.createdAt) : "", width: 14, numFmt: "dd/mm/yyyy" },
  { header: "Cliente", value: (item) => item.cliente?.nombre || "", width: 25 },
  { header: "Cédula", value: (item) => item.cliente?.cedula || "", width: 16 },
  { header: "Teléfono", value: (item) => item.cliente?.telefono || "", width: 16 },
  { header: "Placa", value: (item) => item.vehiculo?.placa || "", width: 14 },
  { header: "Marca", value: (item) => item.vehiculo?.marca || "", width: 18 },
  { header: "Modelo", value: (item) => item.vehiculo?.modelo || "", width: 18 },
  { header: "Año", value: (item) => item.vehiculo?.anio || "", width: 10 },
  { header: "Asesor", value: (item) => item.asesorNombre || "", width: 22 },
  { header: "Polarizado", value: (item) => resumenPolarizado(item.polarizados), width: 42 },
  { header: "PPF", value: (item) => resumenPpf(item.ppf), width: 42 },
  { header: "Servicios adicionales", value: (item) => resumenAdicionales(item.serviciosAdicionales), width: 38 },
  { header: "Valor venta", value: (item) => Number(item.comercial?.valorVenta || 0), width: 18, numFmt: "$#,##0" },
  { header: "Descuento", value: (item) => Number(item.comercial?.descuento || 0), width: 16, numFmt: "$#,##0" },
  { header: "Total acordado", value: (item) => Number(item.comercial?.totalAcordado || 0), width: 19, numFmt: "$#,##0" },
  { header: "Método de pago", value: (item) => (item.comercial?.metodoPagoPrevisto || "POR_DEFINIR").replaceAll("_", " "), width: 20 },
  { header: "Estado del pago", value: (item) => item.pago?.estado || "PENDIENTE", width: 18 },
  { header: "Valor recibido", value: (item) => Number(item.pago?.valorRecibido || 0), width: 18, numFmt: "$#,##0" },
  { header: "Estado", value: (item) => item.estado || "", width: 16 },
  { header: "Etapa", value: (item) => (item.flujo?.etapa || "PENDIENTE_INVENTARIO").replaceAll("_", " "), width: 24 },
  { header: "Situación", value: (item) => (item.situacionActual || "NORMAL").replaceAll("_", " "), width: 22 },
  { header: "Garantía", value: (item) => item.garantia?.esGarantia ? (item.garantia.estado || "PENDIENTE") : "NO APLICA", width: 18 },
  { header: "Responsable garantía", value: (item) => item.garantia?.responsable?.replaceAll("_", " ") || "", width: 22 },
  { header: "Última novedad", value: (item) => item.novedades?.at(-1)?.descripcion || "", width: 42 },
];

function AsesoriasHistorial({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const usuario = obtenerUsuarioActual();
  const [filtros, setFiltros] = useState(inicial);
  const [aplicados, setAplicados] = useState(inicial);
  const [resultado, setResultado] = useState({
    items: [],
    pagination: { page: 1, total: 0, totalPages: 1 },
    asesores: [],
    resumen: {},
    alcance: "PROPIOS",
  });
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [alcanceExcel, setAlcanceExcel] = useState("FILTRADO");
  const [seleccionada, setSeleccionada] = useState(null);
  const [editando, setEditando] = useState(null);
  const [reportandoNovedad, setReportandoNovedad] = useState(null);
  const puedeEditar = ["ADMIN", "SUPERUSUARIO"].includes(usuario?.rol);
  const puedeReportarNovedad = puedeEditar;

  const cargar = async (page = 1, filtrosActuales = aplicados) => {
    try {
      setLoading(true);
      const response = await getAsesorias({
        ...filtrosActuales,
        page,
        limit: 10,
      });
      setResultado(response.data?.data || resultado);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible cargar los servicios",
        text: error.response?.data?.message || "Intente nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar(1, aplicados);
  }, [refreshKey]);

  const cambiar = (campo, value) =>
    setFiltros((actual) => ({ ...actual, [campo]: value }));

  const aplicar = () => {
    setAplicados(filtros);
    cargar(1, filtros);
  };

  const limpiar = () => {
    setFiltros(inicial);
    setAplicados(inicial);
    cargar(1, inicial);
  };

  const descargarServicios = async () => {
    try {
      setExportando(true);
      const filtrosExcel = alcanceExcel === "TODO" ? inicial : aplicados;
      const primera = await getAsesorias({ ...filtrosExcel, page: 1, limit: 50 });
      const datosIniciales = primera.data?.data;
      const items = [...(datosIniciales?.items || [])];
      const totalPages = datosIniciales?.pagination?.totalPages || 1;

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await getAsesorias({ ...filtrosExcel, page, limit: 50 });
        items.push(...(response.data?.data?.items || []));
      }

      if (items.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Sin servicios",
          text: "No hay servicios para descargar con la selección actual.",
        });
        return;
      }

      await descargarExcel({
        fileName: alcanceExcel === "TODO" ? "todos-los-servicios-asesores" : "servicios-asesores-filtrados",
        title: alcanceExcel === "TODO" ? "Todos los servicios de asesores" : "Servicios de asesores filtrados",
        subtitle: `${items.length} servicios exportados`,
        columns: columnasExcel,
        rows: items,
        sheetName: "Servicios",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible descargar el Excel",
        text: error.response?.data?.message || "Intente nuevamente.",
      });
    } finally {
      setExportando(false);
    }
  };

  const revisarNovedad = async (asesoria, novedad, decision) => {
    const esAprobacion = decision === "APROBAR";
    const confirmacion = await Swal.fire({
      icon: esAprobacion ? "question" : "warning",
      title: esAprobacion ? "¿Aprobar solicitud?" : "¿Rechazar solicitud?",
      text: novedad.descripcion,
      input: "textarea",
      inputLabel: "Observación de administración",
      inputPlaceholder: esAprobacion ? "Ej: CAMBIO AUTORIZADO" : "Indique por qué se rechaza",
      showCancelButton: true,
      confirmButtonText: esAprobacion ? "Aprobar" : "Rechazar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: esAprobacion ? "#16a34a" : "#dc2626",
      inputValidator: (value) => !esAprobacion && !value.trim() ? "Indique el motivo del rechazo" : undefined,
    });
    if (!confirmacion.isConfirmed) return;

    try {
      const response = await reviewNovedadAsesoria(asesoria._id, novedad._id, {
        decision,
        observacion: confirmacion.value || "",
      });
      setSeleccionada(response.data?.data || null);
      await cargar(resultado.pagination.page);
      Swal.fire({
        icon: "success",
        title: esAprobacion ? "Solicitud aprobada" : "Solicitud rechazada",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "No fue posible revisar la solicitud",
        text: error.response?.data?.message || "Intente nuevamente.",
      });
    }
  };

  const resolverNovedad = async (asesoria, novedad) => {
    const resultadoResolucion = await Swal.fire({
      icon: "question",
      title: "Resolver novedad",
      input: "textarea",
      inputLabel: "¿Cómo se solucionó?",
      inputPlaceholder: "Ej: LLEGÓ EL MATERIAL Y YA ESTÁ DISPONIBLE",
      showCancelButton: true,
      confirmButtonText: "Marcar como resuelta",
      inputValidator: (value) => value.trim().length < 5 ? "Describa la solución" : undefined,
    });
    if (!resultadoResolucion.isConfirmed) return;
    try {
      const response = await resolveNovedadAsesoria(asesoria._id, novedad._id, { observacion: resultadoResolucion.value });
      setSeleccionada(response.data?.data || null);
      await cargar(resultado.pagination.page);
      Swal.fire({ icon: "success", title: "Novedad resuelta", timer: 1400, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible resolverla", text: error.response?.data?.message });
    }
  };

  const revisarGarantia = async (asesoria, decision) => {
    const aprobar = decision === "APROBAR";
    const resultadoRevision = await Swal.fire({
      icon: aprobar ? "question" : "warning",
      title: aprobar ? "Aprobar garantía" : "Rechazar garantía",
      html: aprobar ? `
        <select id="garantia-responsable" class="swal2-select" style="display:flex;width:80%;margin:1rem auto">
          <option value="EMPRESA">Responde la empresa</option>
          <option value="INSTALADOR">Responde el instalador</option>
          <option value="PROVEEDOR">Responde el proveedor</option>
          <option value="CLIENTE">Asume el cliente</option>
        </select>
        <input id="garantia-instalador" class="swal2-input" placeholder="Nombre del instalador (si aplica)" />
        <textarea id="garantia-observacion" class="swal2-textarea" placeholder="Observación administrativa"></textarea>
      ` : `<textarea id="garantia-observacion" class="swal2-textarea" placeholder="Motivo del rechazo"></textarea>`,
      showCancelButton: true,
      confirmButtonText: aprobar ? "Aprobar y enviar a Inventario" : "Rechazar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: aprobar ? "#16a34a" : "#dc2626",
      preConfirm: () => {
        const responsable = document.getElementById("garantia-responsable")?.value || "CLIENTE";
        const instalador = document.getElementById("garantia-instalador")?.value?.trim() || "";
        const observacion = document.getElementById("garantia-observacion")?.value?.trim() || "";
        if (aprobar && responsable === "INSTALADOR" && !instalador) {
          Swal.showValidationMessage("Ingrese el nombre del instalador responsable");
          return false;
        }
        if (!aprobar && observacion.length < 5) {
          Swal.showValidationMessage("Indique el motivo del rechazo");
          return false;
        }
        return { decision, responsable, instalador, observacion };
      },
    });
    if (!resultadoRevision.isConfirmed) return;

    try {
      const response = await reviewGarantiaAsesoria(asesoria._id, resultadoRevision.value);
      setSeleccionada(response.data?.data || null);
      await cargar(resultado.pagination.page);
      Swal.fire({ icon: "success", title: aprobar ? "Garantía aprobada" : "Garantía rechazada", timer: 1600, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible revisar la garantía", text: error.response?.data?.message || "Intente nuevamente." });
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 p-5">
        <div className="flex items-center gap-3">
          <ReceiptText className="text-blue-600" />
          <div>
            <h2 className="font-bold text-slate-800">
              {resultado.alcance === "TODOS" ? "Servicios de todos los asesores" : "Mis servicios"}
            </h2>
            <p className="text-xs text-slate-500">Consulta las recepciones y acuerdos comerciales registrados.</p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input value={filtros.buscar} onChange={(e) => cambiar("buscar", e.target.value)} placeholder="Código, cliente, cédula, placa, marca o modelo..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3" />
          </div>
          <input type="date" value={filtros.desde} onChange={(e) => cambiar("desde", e.target.value)} className="rounded-xl border border-slate-200 p-3" title="Desde" />
          <input type="date" value={filtros.hasta} onChange={(e) => cambiar("hasta", e.target.value)} className="rounded-xl border border-slate-200 p-3" title="Hasta" />

          {resultado.alcance === "TODOS" && (
            <Select value={filtros.asesorId} onChange={(v) => cambiar("asesorId", v)} placeholder="Todos los asesores">
              {resultado.asesores.map((asesor) => <option key={asesor.id} value={asesor.id}>{asesor.nombre}</option>)}
            </Select>
          )}
          <Select value={filtros.estado} onChange={(v) => cambiar("estado", v)} placeholder="Todos los estados">
            {['BORRADOR','COTIZACION','APROBADA','CANCELADA'].map((v) => <option key={v}>{v}</option>)}
          </Select>
          <Select value={filtros.estadoPago} onChange={(v) => cambiar("estadoPago", v)} placeholder="Cualquier estado de pago">
            {['PENDIENTE','PARCIAL','PAGADO','RECHAZADO'].map((v) => <option key={v}>{v}</option>)}
          </Select>
          <Select value={filtros.metodoPago} onChange={(v) => cambiar("metodoPago", v)} placeholder="Cualquier forma de pago">
            {['POR_DEFINIR','EFECTIVO','TRANSFERENCIA','TARJETA','CREDITO','MIXTO'].map((v) => <option key={v}>{v.replaceAll('_', ' ')}</option>)}
          </Select>
          <Select value={filtros.situacion} onChange={(v) => cambiar("situacion", v)} placeholder="Cualquier situación">
            {['NORMAL','NOVEDAD_ABIERTA','ESPERANDO_MATERIAL','PENDIENTE_CLIENTE','TRABAJO_PENDIENTE','CANCELADA'].map((v) => <option key={v} value={v}>{v.replaceAll('_', ' ')}</option>)}
          </Select>
          <Select value={filtros.garantia} onChange={(v) => cambiar("garantia", v)} placeholder="Todas las garantías">
            <option value="NO_APLICA">Sin garantía</option>
            {['PENDIENTE','APROBADA','RECHAZADA','FINALIZADA'].map((v) => <option key={v} value={v}>Garantía {v.toLowerCase()}</option>)}
          </Select>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <select value={alcanceExcel} onChange={(e) => setAlcanceExcel(e.target.value)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800">
            <option value="FILTRADO">Excel con filtros aplicados</option>
            <option value="TODO">Excel con todos los servicios</option>
          </select>
          <button type="button" onClick={descargarServicios} disabled={exportando || loading} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
            <Download size={17} /> {exportando ? "Preparando..." : "Descargar Excel"}
          </button>
          <button type="button" onClick={limpiar} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50"><X size={16} /> Limpiar</button>
          <button type="button" onClick={aplicar} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white hover:bg-slate-800"><Filter size={16} /> Aplicar filtros</button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-slate-200 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Servicios" value={resultado.resumen?.cantidad || 0} />
        <Metric label="Valor acordado" value={cop.format(resultado.resumen?.valorAcordado || 0)} />
        <Metric label="Descuentos" value={cop.format(resultado.resumen?.descuentos || 0)} />
        <Metric label="Valor recibido" value={cop.format(resultado.resumen?.valorRecibido || 0)} />
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-500">Cargando servicios...</div>
      ) : resultado.items.length === 0 ? (
        <div className="p-10 text-center text-slate-500">No se encontraron servicios con estos filtros.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="p-4 text-left">Código / Fecha</th><th className="p-4 text-left">Cliente</th><th className="p-4 text-left">Vehículo</th><th className="p-4 text-left">Asesor</th><th className="p-4 text-left">Total</th><th className="p-4 text-left">Etapa</th><th className="p-4 text-right">Siguiente paso</th></tr>
            </thead>
            <tbody>
              {resultado.items.map((item) => (
                <tr key={item._id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="p-4"><p className="font-semibold text-slate-800">{item.codigo}</p><p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString('es-CO')}</p></td>
                  <td className="p-4"><p className="font-medium text-slate-700">{item.cliente?.nombre}</p><p className="text-xs text-slate-500">CC {item.cliente?.cedula}</p></td>
                  <td className="p-4"><p className="font-semibold text-slate-700">{item.vehiculo?.placa}</p><p className="text-xs text-slate-500">{item.vehiculo?.marca} {item.vehiculo?.modelo}</p></td>
                  <td className="p-4 text-slate-600">{item.asesorNombre}</td>
                  <td className="p-4 font-bold text-blue-700">{cop.format(item.comercial?.totalAcordado || 0)}</td>
                  <td className="p-4"><EtapaBadge etapa={item.flujo?.etapa} /><SituacionBadge situacion={item.situacionActual} /></td>
                  <td className="p-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => setSeleccionada(item)} className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200" title="Ver detalles"><Eye size={17} /></button>{puedeReportarNovedad && <button type="button" onClick={() => setReportandoNovedad(item)} className="rounded-lg bg-amber-50 p-2 text-amber-700 hover:bg-amber-100" title="Reportar novedad"><TriangleAlert size={17} /></button>}{puedeEditar && <button type="button" onClick={() => setEditando(item)} className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100" title="Corregir servicio"><Pencil size={17} /></button>}<AccionFlujo item={item} rol={usuario?.rol} onNavigate={navigate} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm">
        <span className="text-slate-500">Página {resultado.pagination.page} de {resultado.pagination.totalPages} · {resultado.pagination.total} registros</span>
        <div className="flex gap-2">
          <button type="button" disabled={resultado.pagination.page <= 1 || loading} onClick={() => cargar(resultado.pagination.page - 1)} className="rounded-lg border p-2 disabled:opacity-35" title="Anterior"><ChevronLeft size={18} /></button>
          <button type="button" disabled={resultado.pagination.page >= resultado.pagination.totalPages || loading} onClick={() => cargar(resultado.pagination.page + 1)} className="rounded-lg border p-2 disabled:opacity-35" title="Siguiente"><ChevronRight size={18} /></button>
        </div>
      </div>

      {seleccionada && <Detalle asesoria={seleccionada} puedeRevisar={puedeEditar} onReview={revisarNovedad} onResolve={resolverNovedad} onReviewGarantia={revisarGarantia} onClose={() => setSeleccionada(null)} />}
      {editando && (
        <AsesoriaFormModal
          asesoria={editando}
          onClose={() => setEditando(null)}
          onSaved={() => cargar(resultado.pagination.page)}
        />
      )}
      {reportandoNovedad && (
        <NovedadAsesoriaModal
          asesoria={reportandoNovedad}
          usuario={usuario}
          onClose={() => setReportandoNovedad(null)}
          onSaved={() => cargar(resultado.pagination.page)}
        />
      )}
    </section>
  );
}

function Select({ value, onChange, placeholder, children }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-slate-200 bg-white p-3"><option value="">{placeholder}</option>{children}</select>;
}

function Metric({ label, value }) {
  return <div className="min-w-0 rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-bold text-slate-800">{value}</p></div>;
}

function Detalle({ asesoria, puedeRevisar, onReview, onResolve, onReviewGarantia, onClose }) {
  return (
    <AppModal title={asesoria.codigo} subtitle={`${asesoria.vehiculo?.placa} · ${asesoria.cliente?.nombre}`} icon={ReceiptText} maxWidth="max-w-2xl" onClose={onClose}>
      <FlujoVisual etapa={asesoria.flujo?.etapa} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Info label="Asesor" value={asesoria.asesorNombre} />
        <Info label="Estado" value={asesoria.estado} />
        <Info label="Cliente" value={`${asesoria.cliente?.nombre} · CC ${asesoria.cliente?.cedula}`} />
        <Info label="Contacto" value={`${asesoria.cliente?.telefono || 'Sin teléfono'} · ${asesoria.cliente?.correo || 'Sin correo'}`} />
        <Info label="Vehículo" value={`${asesoria.vehiculo?.marca} ${asesoria.vehiculo?.modelo} ${asesoria.vehiculo?.anio || ''}`} />
        <Info label="Placa / Color" value={`${asesoria.vehiculo?.placa} · ${asesoria.vehiculo?.color || 'Sin color'}`} />
        <Info label="Rayones" value={asesoria.recepcion?.tieneRayones ? asesoria.recepcion.detalleRayones : 'No reportados'} />
        <Info label="Pertenencias" value={asesoria.recepcion?.dejaObjetos ? asesoria.recepcion.detalleObjetos : 'No reportadas'} />
        <Info label="Valor de venta" value={cop.format(asesoria.comercial?.valorVenta || 0)} />
        <Info label="Descuento" value={cop.format(asesoria.comercial?.descuento || 0)} />
        <Info label="Total acordado" value={cop.format(asesoria.comercial?.totalAcordado || 0)} />
        <Info label="Pago previsto" value={`${(asesoria.comercial?.metodoPagoPrevisto || 'POR DEFINIR').replaceAll('_', ' ')} · ${asesoria.pago?.estado || 'PENDIENTE'}`} />
      </div>
      {asesoria.garantia?.esGarantia && <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-violet-900">Solicitud de garantía</p><EstadoGarantia estado={asesoria.garantia.estado} /></div><p className="mt-2 text-sm text-slate-700">{asesoria.garantia.motivo}</p><p className="mt-2 text-xs text-slate-600">Tipo: {(asesoria.garantia.tipo || 'GARANTIA_EMPRESA').replaceAll('_', ' ')} · Responsable: {(asesoria.garantia.responsable || 'POR_DEFINIR').replaceAll('_', ' ')}</p>{asesoria.garantia.instalador && <p className="mt-1 text-xs text-slate-600">Instalador: {asesoria.garantia.instalador}</p>}{asesoria.garantia.fechaRevision && <p className="mt-1 text-xs text-slate-500">Revisó: {asesoria.garantia.revisadoPorNombre} · {asesoria.garantia.observacionRevision || 'Sin observación'}</p>}{puedeRevisar && asesoria.garantia.estado === 'PENDIENTE' && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onReviewGarantia(asesoria, 'APROBAR')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Aprobar garantía</button><button type="button" onClick={() => onReviewGarantia(asesoria, 'RECHAZAR')} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Rechazar</button></div>}</div>}
      <div className="mt-5 space-y-2"><p className="text-xs font-bold uppercase text-slate-500">Servicios cotizados</p>{[...(asesoria.polarizados || []).map((item) => `${item.material} ${item.porcentaje} · ${(item.partes || []).join(', ')} · ${cop.format(item.valor || 0)}`), ...(asesoria.ppf || []).map((item) => `PPF ${item.referencia} · ${item.aplicacion} · ${cop.format(item.valor || 0)}`), ...(asesoria.serviciosAdicionales || []).map((item) => `${item.tipo} ${item.detalle || ''} · ${cop.format(item.valor || 0)}`)].map((texto, index) => <div key={`${texto}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">{texto}</div>)}</div>
      {asesoria.novedades?.length > 0 && <div className="mt-5 space-y-2"><p className="text-xs font-bold uppercase text-amber-700">Historial de novedades</p>{[...asesoria.novedades].reverse().map((novedad, index) => <div key={`${novedad.fecha}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-amber-900">{novedad.tipo.replaceAll('_', ' ')}</p><EstadoNovedad estado={novedad.estado} /></div><p className="text-xs text-amber-700">{new Date(novedad.fecha).toLocaleString('es-CO')}</p></div><p className="mt-1 text-sm text-slate-700">{novedad.descripcion}</p>{novedad.serviciosAfectados?.length > 0 && <p className="mt-1 text-xs font-semibold text-red-700">Servicios retirados: {novedad.serviciosAfectados.join(', ')}</p>}<p className="mt-2 text-xs text-slate-500">Reportó: {novedad.usuarioNombre || 'Usuario'} · Costo: {(novedad.responsableCosto || 'NO_APLICA').replaceAll('_', ' ')}{novedad.valorImpacto ? ` · ${cop.format(novedad.valorImpacto)}` : ''}</p>{novedad.fechaRevision && <p className="mt-1 text-xs text-slate-500">Revisó: {novedad.revisadoPorNombre} · {novedad.observacionRevision || 'Sin observación'}</p>}{puedeRevisar && novedad.estado === 'PENDIENTE' && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onReview(asesoria, novedad, 'APROBAR')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Aprobar solicitud</button><button type="button" onClick={() => onReview(asesoria, novedad, 'RECHAZAR')} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Rechazar</button></div>}{puedeRevisar && novedad.estado === 'APROBADA' && ['FALTA_MATERIAL','MATERIAL_DEFECTUOSO','ROLLO_EQUIVOCADO','ERROR_REGISTRO','TRABAJO_PENDIENTE'].includes(novedad.tipo) && <button type="button" onClick={() => onResolve(asesoria, novedad)} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Marcar solucionada</button>}</div>)}</div>}
    </AppModal>
  );
}

const ETAPAS = ["PENDIENTE_GARANTIA", "PENDIENTE_INVENTARIO", "EN_PROCESO", "PENDIENTE_PAGO", "FINALIZADA"];

function EtapaBadge({ etapa = "PENDIENTE_INVENTARIO" }) {
  const estilos = etapa === "CANCELADA" ? "bg-red-100 text-red-700" : etapa === "FINALIZADA" ? "bg-emerald-100 text-emerald-700" : etapa === "PENDIENTE_PAGO" ? "bg-violet-100 text-violet-700" : etapa === "EN_PROCESO" ? "bg-blue-100 text-blue-700" : etapa === "PENDIENTE_GARANTIA" ? "bg-fuchsia-100 text-fuchsia-700" : "bg-amber-100 text-amber-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${estilos}`}>{etapa.replaceAll("_", " ")}</span>;
}

function SituacionBadge({ situacion = "NORMAL" }) {
  if (!situacion || situacion === "NORMAL" || situacion === "CANCELADA") return null;
  return <span className="mt-1 block w-fit rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">{situacion.replaceAll("_", " ")}</span>;
}

function EstadoNovedad({ estado = "APROBADA" }) {
  const estilos = estado === "PENDIENTE" ? "bg-amber-200 text-amber-900" : estado === "RECHAZADA" ? "bg-red-100 text-red-700" : estado === "RESUELTA" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${estilos}`}>{estado}</span>;
}

function EstadoGarantia({ estado = "PENDIENTE" }) {
  const estilos = estado === "PENDIENTE" ? "bg-amber-200 text-amber-900" : estado === "RECHAZADA" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${estilos}`}>{estado}</span>;
}

function AccionFlujo({ item, rol, onNavigate }) {
  const etapa = item.flujo?.etapa || "PENDIENTE_INVENTARIO";
  const puedeInventario = ["INVENTARIO", "ADMIN", "SUPERUSUARIO"].includes(rol);
  const puedeVentas = ["VENTAS", "ADMIN", "SUPERUSUARIO"].includes(rol);
  const destino = (etapa === "PENDIENTE_INVENTARIO" || etapa === "EN_PROCESO") && puedeInventario
    ? `/cortes?asesoria=${item._id}`
    : etapa === "PENDIENTE_PAGO" && puedeVentas
    ? `/ventas?asesoria=${item._id}`
    : "";
  if (!destino) return <span className="self-center text-xs text-slate-400">{etapa === "FINALIZADA" ? "Completada" : etapa === "CANCELADA" ? "Cancelada" : "Esperando siguiente área"}</span>;
  return <button type="button" onClick={() => onNavigate(destino)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Continuar <ArrowRight size={14} /></button>;
}

function FlujoVisual({ etapa = "PENDIENTE_INVENTARIO" }) {
  const esGarantia = etapa === "PENDIENTE_GARANTIA";
  const etapas = esGarantia ? ETAPAS : ETAPAS.slice(1);
  const indice = etapas.indexOf(etapa);
  const nombres = esGarantia ? ["Garantía", "Inventario", "Trabajo", "Pago", "Finalizada"] : ["Inventario", "Trabajo", "Pago", "Finalizada"];
  return <div className={`grid gap-1 ${esGarantia ? "grid-cols-5" : "grid-cols-4"}`}>{nombres.map((nombre, posicion) => <div key={nombre} className="min-w-0 text-center"><div className={`mx-auto h-2 rounded-full ${posicion <= indice ? "bg-blue-600" : "bg-slate-200"}`} /><p className={`mt-2 truncate text-[11px] font-bold ${posicion <= indice ? "text-blue-700" : "text-slate-400"}`}>{nombre}</p></div>)}</div>;
}

function Info({ label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 break-words font-semibold text-slate-800">{value}</p></div>;
}

export default AsesoriasHistorial;
