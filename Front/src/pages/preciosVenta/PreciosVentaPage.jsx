import { useEffect, useState } from "react";
import { BadgeDollarSign, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import AppModal from "../../components/ui/AppModal";
import { createPrecioVenta, getPreciosVenta, updatePrecioVenta } from "../../api/preciosVenta.api";
import { obtenerUsuarioActual } from "../../utils/permisos";

const campo = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const boton = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50";
const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const normalizar = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const precioTexto = (valor, modalidad) => valor == null ? "No disponible" : modalidad === "PORCENTAJE" ? `${valor} %` : cop.format(valor);

function EditorPrecio({ fila, onClose, onSave }) {
  const [form, setForm] = useState(fila);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const cambiar = (clave, valor) => setForm((actual) => ({ ...actual, [clave]: valor }));
  const cambiarNivel = (clave, indice, valor) => cambiar(clave, form[clave].map((item, posicion) => posicion === indice ? valor : item));

  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const { data } = form.codigo ? await updatePrecioVenta(form.codigo, form) : await createPrecioVenta(form);
      onSave(data.data);
    } catch (fallo) {
      setError(fallo.response?.data?.message || "No se pudo guardar el precio. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return <AppModal title={form.codigo ? "Editar precio de venta" : "Agregar precio de venta"} subtitle="Precios y condiciones comerciales" icon={BadgeDollarSign} onClose={guardando ? () => {} : onClose} maxWidth="max-w-3xl">
    <form onSubmit={guardar}>
      <fieldset disabled={guardando} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Categoría / hoja<input required maxLength={100} value={form.hoja} onChange={(e) => cambiar("hoja", e.target.value)} className={campo} /></label>
          <label className="text-sm font-semibold">Grupo<input required maxLength={500} value={form.grupo} onChange={(e) => cambiar("grupo", e.target.value)} className={campo} /></label>
        </div>
        <label className="block text-sm font-semibold">Servicio, vehículo o aplicación<input required maxLength={500} value={form.descripcion} onChange={(e) => cambiar("descripcion", e.target.value)} className={campo} /></label>
        <label className="block text-sm font-semibold">Tipo de valor
          <select value={form.modalidad} onChange={(e) => cambiar("modalidad", e.target.value)} className={campo}>
            <option value="FIJO">Precio en pesos colombianos</option><option value="PORCENTAJE">Porcentaje sobre el precio completo</option>
          </select>
        </label>
        <p className="text-xs text-slate-600">Deja vacío un nivel cuando no esté disponible. Un cero representa un valor de cero.</p>
        <div className="space-y-3">
          {form.precios.map((valor, indice) => <div key={indice} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[150px_1fr]">
            <label className="text-sm font-semibold">Nivel {indice + 1} · {form.modalidad === "FIJO" ? "COP" : "%"}
              <input type="number" min="0" max={form.modalidad === "PORCENTAJE" ? 100 : Number.MAX_SAFE_INTEGER} step={form.modalidad === "PORCENTAJE" ? "0.01" : "1"} value={valor ?? ""} onChange={(e) => cambiarNivel("precios", indice, e.target.value === "" ? null : e.target.value)} className={campo} />
              <span className="text-xs font-normal text-slate-500">{precioTexto(valor === "" ? null : valor, form.modalidad)}</span>
            </label>
            <label className="text-sm font-semibold">Condición de este nivel
              <input maxLength={600} value={form.condiciones[indice] || ""} onChange={(e) => cambiarNivel("condiciones", indice, e.target.value)} className={campo} />
              {form.originales?.[indice] && <span className="text-xs font-normal text-slate-500">Valor original del Excel · {form.originales[indice]}</span>}
            </label>
          </div>)}
        </div>
        <label className="block text-sm font-semibold">Notas y restricciones<textarea rows={3} maxLength={4000} value={form.notas} onChange={(e) => cambiar("notas", e.target.value)} className={campo} /></label>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.activo} onChange={(e) => cambiar("activo", e.target.checked)} />Activo</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.requiereRevision} onChange={(e) => cambiar("requiereRevision", e.target.checked)} />Pendiente de revisión</label>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={boton}>Cancelar</button>
          <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Guardar precio"}</button>
        </div>
      </fieldset>
    </form>
  </AppModal>;
}

export default function PreciosVentaPage() {
  const administrador = ["ADMIN", "SUPERUSUARIO"].includes(obtenerUsuarioActual()?.rol);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [editor, setEditor] = useState(null);
  const [filtros, setFiltros] = useState({ hoja: "", grupo: "", buscar: "", estado: "" });
  const [pagina, setPagina] = useState(1);

  const cargar = async () => {
    setCargando(true);
    setError("");
    try {
      const { data } = await getPreciosVenta();
      setFilas(data.data);
      setPagina(1);
    } catch {
      setError("No se pudo cargar la lista de precios. Intenta actualizarla.");
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const filtrar = (clave, valor) => {
    setFiltros((actual) => ({ ...actual, [clave]: valor, ...(clave === "hoja" ? { grupo: "" } : {}) }));
    setPagina(1);
  };
  const hojas = [...new Set(filas.map((fila) => fila.hoja))];
  const grupos = [...new Set(filas.filter((fila) => !filtros.hoja || fila.hoja === filtros.hoja).map((fila) => fila.grupo))];
  const visibles = filas.filter((fila) => (!filtros.hoja || fila.hoja === filtros.hoja) &&
    (!filtros.grupo || fila.grupo === filtros.grupo) &&
    (!filtros.buscar || normalizar([fila.hoja, fila.grupo, fila.descripcion, fila.notas].join(" ")).includes(normalizar(filtros.buscar))) &&
    (!filtros.estado || (filtros.estado === "REVISION" ? fila.requiereRevision : filtros.estado === "ACTIVO" ? fila.activo && !fila.requiereRevision : !fila.activo)));
  const paginas = Math.max(1, Math.ceil(visibles.length / 20));
  const actual = Math.min(pagina, paginas);
  const guardar = (fila) => {
    setFilas((anteriores) => anteriores.some((item) => item.codigo === fila.codigo)
      ? anteriores.map((item) => item.codigo === fila.codigo ? fila : item) : [...anteriores, fila]);
    setEditor(null);
    setAviso("Precio guardado. Ya está disponible en la lista actualizada.");
  };

  return <main className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white">
      <div className="flex items-center gap-4">
        <span className="rounded-xl bg-blue-600 p-3"><BadgeDollarSign size={26} /></span>
        <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-200">{administrador ? "Administración" : "Asesores"}</p>
          <h1 className="text-2xl font-bold">Lista de precios de venta</h1>
          <p className="mt-1 text-sm text-slate-300">{administrador ? "Edita los precios y las condiciones de cada servicio." : "Consulta los precios vigentes y las condiciones para cotizar."}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={cargando} onClick={cargar} className="flex items-center gap-2 rounded-lg border border-slate-500 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={16} />Actualizar</button>
        {administrador && <button type="button" onClick={() => setEditor({ hoja: filtros.hoja || "OTROS", grupo: filtros.grupo || "", descripcion: "", modalidad: "FIJO", precios: [null,null,null,null], condiciones: ["","","",""], notas: "", activo: true, requiereRevision: false })} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold"><Plus size={16} />Agregar precio</button>}
      </div>
    </header>
    {aviso && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-sm font-semibold">Categoría<select value={filtros.hoja} onChange={(e) => filtrar("hoja", e.target.value)} className={campo}><option value="">Todas</option>{hojas.map((hoja) => <option key={hoja}>{hoja}</option>)}</select></label>
        <label className="text-sm font-semibold">Grupo<select value={filtros.grupo} onChange={(e) => filtrar("grupo", e.target.value)} className={campo}><option value="">Todos</option>{grupos.map((grupo) => <option key={grupo}>{grupo}</option>)}</select></label>
        <label className="text-sm font-semibold">Buscar<span className="relative block"><Search size={16} className="pointer-events-none absolute right-3 top-3 text-slate-400" /><input placeholder="Servicio, vehículo, micraje…" value={filtros.buscar} onChange={(e) => filtrar("buscar", e.target.value)} className={`${campo} pr-9`} /></span></label>
        {administrador && <label className="text-sm font-semibold">Estado<select value={filtros.estado} onChange={(e) => filtrar("estado", e.target.value)} className={campo}><option value="">Todos</option><option value="ACTIVO">Vigentes</option><option value="REVISION">Pendientes de revisión</option><option value="INACTIVO">Inactivos</option></select></label>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">{visibles.length} filas en la consulta</span>
        {administrador && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{filas.filter((fila) => fila.requiereRevision).length} pendientes de revisión</span>}
      </div>
      <p className="mt-3 text-xs text-slate-600">Cada nivel conserva sus condiciones comerciales. Los porcentajes por pieza se aplican sobre el precio completo indicado en su grupo.</p>
    </section>
    {cargando ? <p role="status" className="p-4 text-sm text-slate-600">Cargando precios…</p> : !error && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-4">Servicio / aplicación</th>{[1,2,3,4].map((nivel) => <th key={nivel} className="p-4">Nivel {nivel}</th>)}{administrador && <th className="p-4">Acción</th>}</tr></thead>
          <tbody>{visibles.slice((actual-1)*20,actual*20).map((fila) => <tr key={fila.codigo} className={`border-t border-slate-200 align-top ${!fila.activo ? "bg-slate-50" : "hover:bg-blue-50/40"}`}>
            <td className="max-w-sm p-4">
              <p className="text-xs font-semibold text-blue-700">{fila.hoja} · {fila.grupo}</p><p className="mt-1 font-bold text-slate-900">{fila.descripcion}</p>
              {fila.notas && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{fila.notas}</p>}
              <div className="mt-2 flex gap-2 text-xs font-semibold">{!fila.activo && <span className="text-slate-600">Inactivo</span>}{fila.requiereRevision && <span className="text-amber-800">Revisar precio</span>}</div>
              {fila.fechaActualizacion && <p className="mt-2 text-xs text-slate-500">Editado por {fila.actualizadoPor} · {new Date(fila.fechaActualizacion).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>}
            </td>
            {[0,1,2,3].map((indice) => <td key={indice} className="max-w-[180px] p-4">
              <p className={`whitespace-nowrap font-bold ${fila.modalidad === "PORCENTAJE" ? "text-indigo-700" : "text-slate-900"}`}>{precioTexto(fila.precios[indice], fila.modalidad)}</p>
              {fila.condiciones[indice] && <p className="mt-1 text-xs text-slate-500">{fila.condiciones[indice]}</p>}
              {fila.precios[indice] == null && fila.originales?.[indice] && fila.originales[indice] !== "NA" && <p className="mt-1 text-xs text-amber-800">Excel · {fila.originales[indice]}</p>}
            </td>)}
            {administrador && <td className="p-4"><button type="button" onClick={() => {
              setAviso("");
              setEditor({ ...fila, precios: Array.from({ length: 4 }, (_, indice) => fila.precios[indice] ?? null),
                condiciones: Array.from({ length: 4 }, (_, indice) => fila.condiciones[indice] || "") });
            }} className={`${boton} flex items-center gap-1.5`}><Pencil size={14} />Editar</button></td>}
          </tr>)}</tbody>
        </table>
      </div>
      {!visibles.length && <p className="p-8 text-center text-sm text-slate-600">No hay precios para estos filtros.</p>}
      <nav aria-label="Páginas de precios" className="flex items-center justify-end gap-3 border-t border-slate-200 p-4 text-sm">
        <button type="button" disabled={actual===1} onClick={() => setPagina(actual-1)} className={boton}>Anterior</button><span>{actual} de {paginas}</span><button type="button" disabled={actual===paginas} onClick={() => setPagina(actual+1)} className={boton}>Siguiente</button>
      </nav>
    </section>}
    {editor && <EditorPrecio fila={editor} onClose={() => setEditor(null)} onSave={guardar} />}
  </main>;
}
