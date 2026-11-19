import { useEffect, useMemo, useState } from "react";
import { Boxes, Edit3, PackagePlus, Plus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { adjustStockAccesorio, createAccesorio, deleteAccesorio, getAccesorios, getCatalogoAccesorios, updateAccesorio } from "../../api/accesorios.api";
import AppModal from "../../components/ui/AppModal";
import { FilterField, FilterSearch, FilterToolbar, filterControlClass } from "../../components/ui/FilterToolbar";
import { obtenerUsuarioActual, tienePermiso } from "../../utils/permisos";

const vacio = { codigo: "", categoria: "TAPETES", nuevaCategoria: false, productoExistenteId: "", nombre: "", marca: "", referencia: "", stock: "", stockMinimo: "", costoUnitario: "", precioSugerido: "" };
const categoriasBase = ["TAPETES", "PLUMILLAS", "MARCOS", "LUCES", "ACCESORIOS", "OTRO"];
const dinero = (valor) => Number(valor || 0).toLocaleString("es-CO");
const digitos = (valor) => String(valor || "").replace(/\D/g, "");

export default function AccesoriosPage() {
  const usuarioActual = obtenerUsuarioActual();
  const puedeEditar = ["INVENTARIO", "ADMIN", "SUPERUSUARIO"].includes(usuarioActual?.rol) || tienePermiso(usuarioActual, "accesorios", "write");
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [buscar, setBuscar] = useState("");
  const [categoria, setCategoria] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [catalogo, setCatalogo] = useState({ categorias: [], referencias: [] });
  const categorias = useMemo(() => [...new Set([...categoriasBase, ...(catalogo.categorias || [])])].sort(), [catalogo.categorias]);
  const referenciasCategoria = useMemo(() => (catalogo.referencias || []).filter((item) => item.categoria === form.categoria), [catalogo.referencias, form.categoria]);

  const cargarCatalogo = async () => {
    const response = await getCatalogoAccesorios();
    setCatalogo(response.data?.data || { categorias: [], referencias: [] });
  };

  const cargar = async (page = pagination.page) => {
    try {
      const response = await getAccesorios({ buscar, categoria, page, limit: 12 });
      setItems(response.data?.data?.items || []);
      setPagination(response.data?.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error) { Swal.fire({ icon: "error", title: "No fue posible cargar los accesorios", text: error.response?.data?.message }); }
  };
  useEffect(() => { const timer = setTimeout(() => cargar(1), 250); return () => clearTimeout(timer); }, [buscar, categoria]);
  useEffect(() => { cargarCatalogo().catch(() => setCatalogo({ categorias: [], referencias: [] })); }, []);

  const abrir = (item = null) => { setForm(item ? { ...vacio, ...item } : { ...vacio }); setModal(item ? "EDITAR" : "CREAR"); };
  const guardar = async () => {
    if (modal === "CREAR" && form.productoExistenteId) {
      const cantidad = Number(form.stock || 0);
      if (cantidad < 1) return Swal.fire({ icon: "warning", title: "Ingrese la cantidad que llegó" });
      try {
        setGuardando(true);
        await adjustStockAccesorio(form.productoExistenteId, { tipo: "ENTRADA", cantidad, motivo: "ENTRADA DE MERCANCIA DE LA MISMA REFERENCIA" });
        setModal(null); await Promise.all([cargar(1), cargarCatalogo()]);
        return Swal.fire({ icon: "success", title: "Existencias añadidas", text: "La entrada quedó registrada sobre la referencia existente.", timer: 1700, showConfirmButton: false });
      } catch (error) {
        return Swal.fire({ icon: "error", title: "No fue posible registrar la entrada", text: error.response?.data?.message || error.message });
      } finally { setGuardando(false); }
    }
    if (!form.nombre.trim() || !form.categoria) return Swal.fire({ icon: "warning", title: "Complete categoría y nombre" });
    try {
      setGuardando(true);
      if (modal === "EDITAR") await updateAccesorio(form._id, form); else await createAccesorio(form);
      setModal(null); await Promise.all([cargar(modal === "EDITAR" ? pagination.page : 1), cargarCatalogo()]);
      Swal.fire({ icon: "success", title: "Accesorio guardado", timer: 1300, showConfirmButton: false });
    } catch (error) { Swal.fire({ icon: "error", title: "No fue posible guardar", text: error.response?.data?.message || error.message || "Revise los datos del accesorio" }); }
    finally { setGuardando(false); }
  };
  const seleccionarReferencia = (id) => {
    const producto = catalogo.referencias.find((item) => item._id === id);
    if (!producto) return setForm((actual) => ({ ...actual, productoExistenteId: "", codigo: "", nombre: "", marca: "", referencia: "", stock: "", stockMinimo: "", costoUnitario: "", precioSugerido: "" }));
    setForm((actual) => ({ ...actual, ...producto, productoExistenteId: producto._id, stock: "" }));
  };
  const movimiento = async (item) => {
    const result = await Swal.fire({ title: item.nombre, html: `<p style="margin-bottom:12px">Stock actual: <b>${item.stock}</b></p>`, input: "number", inputLabel: "Cantidad", inputAttributes: { min: 1, step: 1 }, showCancelButton: true, confirmButtonText: "Continuar", cancelButtonText: "Cancelar" });
    if (!result.isConfirmed) return;
    const tipo = await Swal.fire({ title: "Tipo de movimiento", input: "select", inputOptions: { ENTRADA: "Entrada de unidades", SALIDA: "Salida manual", AJUSTE: "Fijar inventario real" }, inputValue: "ENTRADA", showCancelButton: true });
    if (!tipo.isConfirmed) return;
    const motivo = await Swal.fire({ title: "Motivo", input: "text", inputPlaceholder: "Ej: compra a proveedor", showCancelButton: true, inputValidator: (v) => !v?.trim() && "Escriba el motivo" });
    if (!motivo.isConfirmed) return;
    try { await adjustStockAccesorio(item._id, { tipo: tipo.value, cantidad: result.value, motivo: motivo.value }); await cargar(); Swal.fire({ icon: "success", title: "Stock actualizado", timer: 1200, showConfirmButton: false }); }
    catch (error) { Swal.fire({ icon: "error", title: "No fue posible ajustar", text: error.response?.data?.message }); }
  };
  const eliminar = async (item) => {
    const result = await Swal.fire({ icon: "warning", title: `¿Desactivar ${item.nombre}?`, showCancelButton: true, confirmButtonText: "Sí, desactivar", cancelButtonText: "Cancelar" });
    if (!result.isConfirmed) return;
    await deleteAccesorio(item._id); await cargar();
  };

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black text-slate-900">Inventario de accesorios</h1><p className="text-sm text-slate-500">Tapetes, marcos, plumillas, luces y demás productos vendidos.</p></div>{puedeEditar && <button onClick={() => abrir()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus size={18}/>Nuevo accesorio</button>}</header>
    <FilterToolbar title="Filtros de accesorios" activeCount={[buscar, categoria].filter(Boolean).length} onClear={() => { setBuscar(""); setCategoria(""); }}><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end"><FilterField label="Buscar"><FilterSearch value={buscar} onChange={setBuscar} placeholder="Código, producto o marca"/></FilterField><FilterField label="Categoría"><select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={filterControlClass}><option value="">Todas las categorías</option>{categorias.map((c) => <option key={c}>{c}</option>)}</select></FilterField><div className="flex h-9 items-center justify-center rounded-md bg-slate-100 px-3 text-xs font-bold text-slate-700">{pagination.total} productos</div></div></FilterToolbar>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4 text-left">Producto</th><th className="p-4 text-left">Marca / referencia</th><th className="p-4 text-right">Stock</th><th className="p-4 text-right">Costo</th><th className="p-4 text-right">Precio sugerido</th><th className="p-4 text-right">Acciones</th></tr></thead><tbody>{items.map((item) => <tr key={item._id} className="border-t"><td className="p-4"><p className="font-bold text-slate-800">{item.nombre}</p><p className="text-xs text-slate-500">{item.codigo} · {item.categoria}</p></td><td className="p-4">{item.marca}<span className="block text-xs text-slate-500">{item.referencia || "Sin referencia"}</span></td><td className={`p-4 text-right text-lg font-black ${item.stock <= item.stockMinimo ? "text-red-600" : "text-emerald-700"}`}>{item.stock}<span className="block text-xs font-normal text-slate-400">Mínimo {item.stockMinimo}</span></td><td className="p-4 text-right">${dinero(item.costoUnitario)}</td><td className="p-4 text-right font-bold">${dinero(item.precioSugerido)}</td><td className="p-4"><div className="flex justify-end gap-1"><button title="Mover stock" onClick={() => movimiento(item)} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"><PackagePlus size={18}/></button><button title="Editar" onClick={() => abrir(item)} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"><Edit3 size={18}/></button><button title="Desactivar" onClick={() => eliminar(item)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={18}/></button></div></td></tr>)}</tbody></table></div>{!items.length && <div className="p-12 text-center text-slate-500"><Boxes className="mx-auto mb-2"/>No hay accesorios registrados.</div>}<div className="flex items-center justify-between border-t bg-slate-50 px-4 py-3 text-sm"><span>Página {pagination.page} de {pagination.totalPages}</span><div className="flex gap-2"><button disabled={pagination.page <= 1} onClick={() => cargar(pagination.page - 1)} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40">Anterior</button><button disabled={pagination.page >= pagination.totalPages} onClick={() => cargar(pagination.page + 1)} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40">Siguiente</button></div></div></section>
    {modal && <AppModal title={modal === "EDITAR" ? "Editar accesorio" : "Registrar llegada de accesorio"} subtitle="Reutiliza una referencia existente o crea una nueva" icon={Boxes} onClose={() => setModal(null)} maxWidth="max-w-2xl">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Categoría
          <select value={form.nuevaCategoria ? "__NUEVA__" : form.categoria} onChange={(e) => setForm({ ...form, nuevaCategoria: e.target.value === "__NUEVA__", categoria: e.target.value === "__NUEVA__" ? "" : e.target.value, productoExistenteId: "", referencia: "" })} className="mt-1 w-full rounded-lg border bg-white p-3">
            {categorias.map((c) => <option key={c}>{c}</option>)}<option value="__NUEVA__">+ CREAR OTRA CATEGORÍA</option>
          </select>
        </label>
        {form.nuevaCategoria && <label className="text-sm font-semibold text-slate-700">Nueva categoría<input autoFocus value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value.toUpperCase() })} placeholder="Ej: AMBIENTADORES" className="mt-1 w-full rounded-lg border p-3"/></label>}

        {modal === "CREAR" && <label className="text-sm font-semibold text-slate-700 md:col-span-2">Referencia que llegó
          <select value={form.productoExistenteId || "__NUEVA__"} onChange={(e) => seleccionarReferencia(e.target.value)} disabled={!form.categoria} className="mt-1 w-full rounded-lg border bg-white p-3 disabled:bg-slate-100">
            <option value="__NUEVA__">+ CREAR UNA REFERENCIA NUEVA</option>
            {referenciasCategoria.map((item) => <option key={item._id} value={item._id}>{item.referencia || "SIN REFERENCIA"} · {item.nombre} · {item.marca} · Stock {item.stock}</option>)}
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-500">Si ya existe, las nuevas unidades se sumarán al mismo producto.</span>
        </label>}

        {form.productoExistenteId ? <>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 md:col-span-2"><p className="font-bold text-blue-900">{form.nombre} · {form.marca}</p><p className="text-sm text-blue-700">{form.codigo} · {form.referencia || "Sin referencia"} · Existencias actuales: {catalogo.referencias.find((item) => item._id === form.productoExistenteId)?.stock || 0}</p></div>
          <label className="text-sm font-semibold text-slate-700 md:col-span-2">Cantidad recibida<input autoFocus inputMode="numeric" value={dinero(form.stock)} onChange={(e) => setForm({ ...form, stock: digitos(e.target.value) })} placeholder="Ej: 10" className="mt-1 w-full rounded-lg border p-3"/></label>
        </> : <>
          {[["Código", "codigo", "Ej: TAP-001"], ["Nombre", "nombre", "Ej: Tapetes 3D"], ["Marca", "marca", "Ej: Defender"], ["Referencia", "referencia", "Ej: Tesla Model Y"]].map(([label,key,placeholder]) => <label key={key} className="text-sm font-semibold text-slate-700">{label}<input value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value.toUpperCase() })} placeholder={placeholder} className="mt-1 w-full rounded-lg border p-3"/></label>)}
          {[[modal === "EDITAR" ? "Stock" : "Stock inicial", "stock"], ["Stock mínimo", "stockMinimo"], ["Costo unitario", "costoUnitario"], ["Precio sugerido", "precioSugerido"]].map(([label,key]) => <label key={key} className="text-sm font-semibold text-slate-700">{label}<input disabled={modal === "EDITAR" && key === "stock"} inputMode="numeric" value={dinero(form[key])} onChange={(e) => setForm({ ...form, [key]: digitos(e.target.value) })} className="mt-1 w-full rounded-lg border p-3 disabled:bg-slate-100"/></label>)}
        </>}
      </div>
      <div className="mt-5 flex justify-end gap-2"><button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2">Cancelar</button><button disabled={guardando} onClick={guardar} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-60">{guardando ? "Guardando..." : form.productoExistenteId ? "Sumar existencias" : "Guardar"}</button></div>
    </AppModal>}
  </div>;
}
