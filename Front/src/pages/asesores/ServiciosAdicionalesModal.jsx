import { useEffect, useState } from "react";
import { ListPlus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import AppModal from "../../components/ui/AppModal";
import { createServicioAdicional, deleteServicioAdicional, getServiciosAdicionales } from "../../api/serviciosAdicionales.api";

const CATEGORIAS = ["LAVADO", "POLICHADA", "DETAILING", "PDR", "PINTURA", "ASEGURADA", "OTRO"];
const soloDigitos = (value) => String(value || "").replace(/\D/g, "");

export default function ServiciosAdicionalesModal({ onClose }) {
  const [servicios, setServicios] = useState([]);
  const [form, setForm] = useState({ categoria: "DETAILING", nombre: "", precioSugerido: "" });
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    const response = await getServiciosAdicionales();
    setServicios(response.data?.data || []);
  };
  useEffect(() => { cargar().catch(() => setServicios([])); }, []);

  const guardar = async (event) => {
    event.preventDefault();
    if (form.nombre.trim().length < 3) return Swal.fire({ icon: "warning", title: "Ingrese el nombre del servicio" });
    try {
      setGuardando(true);
      await createServicioAdicional(form);
      setForm((actual) => ({ ...actual, nombre: "", precioSugerido: "" }));
      await cargar();
      Swal.fire({ icon: "success", title: "Servicio añadido", timer: 1200, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: "error", title: "No fue posible guardar", text: error.response?.data?.message || error.message });
    } finally { setGuardando(false); }
  };

  const eliminar = async (servicio) => {
    const confirmacion = await Swal.fire({ icon: "warning", title: "Retirar del catálogo", text: `${servicio.categoria} · ${servicio.nombre}`, showCancelButton: true, confirmButtonText: "Retirar", cancelButtonText: "Cancelar", confirmButtonColor: "#b91c1c" });
    if (!confirmacion.isConfirmed) return;
    try { await deleteServicioAdicional(servicio._id); await cargar(); }
    catch (error) { Swal.fire({ icon: "error", title: "No fue posible retirar", text: error.response?.data?.message || error.message }); }
  };

  return <AppModal title="Catálogo de servicios" subtitle="Opciones disponibles para las cotizaciones de los asesores" icon={ListPlus} onClose={onClose} maxWidth="max-w-4xl">
    <form onSubmit={guardar} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-6 md:items-end">
      <label className="md:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">CATEGORÍA</span><select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full rounded-lg border bg-white p-2.5">{CATEGORIAS.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="md:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">NOMBRE</span><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value.toUpperCase() })} placeholder="Ej: CERÁMICO 10 AÑOS" className="w-full rounded-lg border p-2.5" /></label>
      <label><span className="mb-1 block text-xs font-bold text-slate-600">PRECIO SUGERIDO</span><input value={form.precioSugerido ? Number(form.precioSugerido).toLocaleString("es-CO") : ""} onChange={(e) => setForm({ ...form, precioSugerido: soloDigitos(e.target.value) })} inputMode="numeric" placeholder="Opcional" className="w-full rounded-lg border p-2.5" /></label>
      <button disabled={guardando} className="rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60">{guardando ? "Guardando..." : "Añadir"}</button>
    </form>
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
      <div className="max-h-[390px] divide-y overflow-y-auto">{servicios.map((servicio) => <div key={servicio._id} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50"><div className="min-w-0"><p className="truncate font-bold text-slate-800">{servicio.nombre}</p><p className="text-xs text-slate-500">{servicio.categoria}{servicio.precioSugerido ? ` · Precio sugerido $${Number(servicio.precioSugerido).toLocaleString("es-CO")}` : " · Sin precio sugerido"}</p></div><button type="button" onClick={() => eliminar(servicio)} title="Retirar del catálogo" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={18}/></button></div>)}</div>
    </div>
  </AppModal>;
}
