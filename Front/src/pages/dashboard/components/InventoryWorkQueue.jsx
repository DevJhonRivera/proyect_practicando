import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Boxes, ClipboardCheck, DollarSign, PackageCheck, RefreshCcw, Scissors, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { getBandejaInventario } from "../../../api/inventario.api";

const materialLabel = (item) => item.unidadMedida === "NINGUNA"
  ? item.tipoPolarizado
  : `${item.tipoPolarizado} ${Number(item.porcentaje || 0)}${item.unidadMedida === "MICRAS" ? " MICRAS" : "%"}`;

const SECCIONES = [
  ["propuestas", "Propuestas por revisar", "Aprueba o devuelve las medidas enviadas por Coordinación.", ClipboardCheck],
  ["cortes", "Cortes por realizar", "Material aprobado que todavía debe descontarse.", Scissors],
  ["reposiciones", "Reposiciones por garantía", "Nuevos cortes aprobados por material dañado durante la instalación.", RefreshCcw],
  ["recepciones", "Entradas por clasificar", "Rollos recibidos que aún no están disponibles.", PackageCheck],
  ["pedidosSinCostear", "Pedidos sin costear", "Asigna compra, flete y TRM antes de usar los rollos.", DollarSign],
  ["accesorios", "Accesorios por reponer", "Solicitudes pendientes y productos bajo el mínimo.", Boxes],
  ["reabastecimiento", "Material por pedir", "Sugerencias por consumo, reserva y tiempo de llegada.", ShoppingCart],
];

function InventoryWorkQueue() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getBandejaInventario();
      setData(response.data?.data || null);
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible cargar las tareas", text: error.response?.data?.message || "Intente nuevamente." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const accesorios = useMemo(() => [
    ...(data?.accesoriosPendientes || []).map((item) => ({ id: `p-${item._id}`, title: `${item.nombre} ${item.marca || ""}`.trim(), detail: `${item.cantidadPendiente} unidad(es) pendientes · ${item.ordenes.length} orden(es)`, action: "Revisar stock", url: "/accesorios" })),
    ...(data?.accesoriosBajos || []).map((item) => ({ id: `b-${item._id}`, title: `${item.nombre} ${item.marca || ""}`.trim(), detail: `Stock ${item.stock} · mínimo ${item.stockMinimo}`, action: "Reponer", url: "/accesorios" })),
  ], [data]);

  const items = useMemo(() => ({
    propuestas: (data?.propuestas || []).map((item) => ({ id: item._id, title: `${item.codigo} · ${item.vehiculo?.placa}`, detail: `${item.garantia?.esGarantia ? `GARANTÍA ${(item.garantia.responsable || item.garantia.tipo || "POR DEFINIR").replaceAll("_", " ")} · ` : ""}${item.vehiculo?.marca} ${item.vehiculo?.modelo} · ${item.coordinacion?.propuesta?.length || 0} material(es)`, action: "Revisar propuesta", url: `/cortes?asesoria=${item._id}` })),
    cortes: (data?.cortes || []).map((item) => ({ id: item._id, title: `${item.codigo} · ${item.vehiculo?.placa}`, detail: `${item.garantia?.esGarantia ? `GARANTÍA ${(item.garantia.responsable || item.garantia.tipo || "POR DEFINIR").replaceAll("_", " ")} · ` : ""}${item.faltantes.length} corte(s): ${item.faltantes.map((linea) => linea.material).join(", ")}`, action: "Registrar cortes", url: `/cortes?asesoria=${item._id}` })),
    reposiciones: (data?.reposiciones || []).map((item) => ({ id: item._id, title: `${item.codigo} · ${item.vehiculo?.placa}`, detail: `${item.serviciosAfectados.join(", ") || "Material por definir"} · Descuento a ${item.instaladorNombre || "instalador por definir"}`, action: "Registrar reposición", url: `/cortes?asesoria=${item.asesoriaId}&novedad=${item._id}` })),
    recepciones: (data?.recepciones || []).map((item) => ({ id: item._id, title: item.codigoRecepcion, detail: `${item.clasificados}/${item.cantidadRollos} rollos clasificados`, action: "Continuar entrada", url: `/recepciones?recepcion=${item._id}` })),
    pedidosSinCostear: (data?.pedidosSinCostear || []).map((item) => ({ id: item._id, title: item.codigoPedido, detail: `${item.proveedor} · ${item.estado}`, action: "Costear pedido", url: `/costeo-pedidos?pedido=${item._id}` })),
    accesorios,
    reabastecimiento: (data?.reabastecimiento || []).map((item) => ({ id: item.clave, title: materialLabel(item), detail: `${Number(item.stockMetros || 0).toFixed(2)} m · cobertura ${item.coberturaDias ?? "sin historial"} días · sugerido ${item.cantidadSugerida} rollo(s)`, action: "Crear pedido", url: "/pedidos/nuevo" })),
  }), [accesorios, data]);

  if (loading && !data) return <div className="flex min-h-[55vh] items-center justify-center"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" /><p className="mt-3 text-sm font-semibold text-slate-500">Organizando tareas de Inventario...</p></div></div>;
  const total = Object.values(items).reduce((sum, list) => sum + list.length, 0) + Number(data?.rollosSinCosto?.length || 0);

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase text-blue-700">Inventario</p><h1 className="text-2xl font-black text-slate-900">Tareas pendientes</h1><p className="mt-1 text-sm text-slate-500">Trabaja de arriba hacia abajo. Cada acción abre el registro correcto.</p></div><button type="button" onClick={cargar} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCcw size={16} className={loading ? "animate-spin" : ""} />Actualizar</button></header>
    <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">{SECCIONES.map(([key, title, , Icon]) => <button key={key} type="button" onClick={() => document.getElementById(`inv-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="min-w-0 rounded-md border border-slate-200 bg-white p-3 text-left hover:border-blue-300"><Icon size={17} className="text-blue-700" /><strong className="mt-2 block text-xl text-slate-900">{items[key]?.length || 0}</strong><span className="block text-xs font-semibold leading-tight text-slate-500">{title}</span></button>)}</div>
    {data?.rollosSinCosto?.length > 0 && <div className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-red-600" size={20} /><div><p className="font-bold text-red-900">{data.rollosSinCosto.length} rollo(s) en reserva no tienen costo</p><p className="text-sm text-red-700">No podrán pasar a uso hasta costear su pedido.</p></div></div><button onClick={() => navigate("/costeo-pedidos")} className="rounded-md bg-red-700 px-3 py-2 text-sm font-bold text-white">Ir a costeo</button></div>}
    {total === 0 ? <div className="rounded-md border border-emerald-200 bg-emerald-50 p-8 text-center"><PackageCheck className="mx-auto text-emerald-600" size={30} /><h2 className="mt-3 font-black text-emerald-900">Inventario al día</h2><p className="mt-1 text-sm text-emerald-700">No hay tareas operativas pendientes.</p></div> : SECCIONES.map(([key, title, description, Icon]) => <TaskSection key={key} sectionKey={key} title={title} description={description} Icon={Icon} items={items[key] || []} onOpen={navigate} />)}
  </div>;
}

function TaskSection({ sectionKey, title, description, Icon, items, onOpen }) {
  return <section id={`inv-${sectionKey}`} className="scroll-mt-4 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3"><Icon size={18} className="text-slate-700" /><div className="min-w-0"><h2 className="text-sm font-black text-slate-900">{title} <span className="ml-1 text-slate-400">{items.length}</span></h2><p className="truncate text-xs text-slate-500">{description}</p></div></div>{items.length === 0 ? <p className="px-4 py-5 text-sm text-slate-400">Sin pendientes.</p> : <div className="divide-y divide-slate-100">{items.slice(0, 20).map((item) => <div key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{item.detail}</p></div><button type="button" onClick={() => onOpen(item.url)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">{item.action}<ArrowRight size={14} /></button></div>)}</div>}</section>;
}

export default InventoryWorkQueue;
