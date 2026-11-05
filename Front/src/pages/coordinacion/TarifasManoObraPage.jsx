import { useEffect, useState } from "react";
import { Calculator, Plus, Save, Trash2 } from "lucide-react";
import { getInstaladoresCoordinacion, getTarifasManoObra, saveTarifasManoObra } from "../../api/coordinacion.api";
import { getServiciosAdicionales } from "../../api/serviciosAdicionales.api";
import { materialesCatalogo, MICRAJES_SEGURIDAD } from "../../utils/materiales";

const opciones = [
  ...materialesCatalogo.filter(({ categoria }) => categoria !== "PPF")
    .flatMap(({ materiales }) => materiales.filter((material) => material !== "PELICULA").map((material) => `MATERIAL:${material}`)),
  ...MICRAJES_SEGURIDAD.map((micraje) => `PELICULA:${micraje}`),
  "BLACK", "AMERICANO", "PPF",
  "MATERIAL:CLEAR PLEX", "SERVICIO:RETIRO CLEAR PLEX", "SERVICIO:DETAILING", "SERVICIO:INSTALACIONES",
  "SERVICIO:VINILO 0 A 1,499,999", "SERVICIO:VINILO 1,500,000 EN ADELANTE",
  "SERVICIO:RETIRO DE VINILO EXTERNO", "SERVICIO:RETIRO DE VINILO INTEGRAL",
];

export default function TarifasManoObraPage() {
  const [tarifas, setTarifas] = useState(null);
  const [clave, setClave] = useState("");
  const [instaladores, setInstaladores] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [errorCatalogo, setErrorCatalogo] = useState(false);
  const [instalador, setInstalador] = useState("");
  const [modalidad, setModalidad] = useState("PORCENTAJE");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  useEffect(() => {
    getTarifasManoObra().then(({ data }) => setTarifas(data))
      .catch(() => setMensaje("No se pudieron cargar las tarifas. Vuelve a abrir el módulo."));
    getInstaladoresCoordinacion().then(({ data }) => setInstaladores(data.data || []))
      .catch(() => setMensaje("No se pudieron cargar los instaladores."));
    getServiciosAdicionales().then(({ data }) => setServicios(data.data || []))
      .catch(() => setErrorCatalogo(true));
  }, []);

  const agregar = () => {
    const regla = clave.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    if (regla.includes("|") || regla === "MATERIAL:PELICULA" || (!opciones.includes(regla) &&
      !/^(?:(?:MATERIAL|SERVICIO):[^.$]{1,140}|PELICULA:[1-9]\d{0,5})$/.test(regla))) {
      setMensaje("Selecciona una opción o escribe una regla como PELICULA:700 o SERVICIO:DETAILING.");
      return;
    }
    const destino = instalador ? `${regla}|${instalador}` : regla;
    const llave = modalidad === "FIJO" ? `FIJO|${destino}` : destino;
    const contraparte = modalidad === "FIJO" ? destino : `FIJO|${destino}`;
    if (Object.hasOwn(tarifas, contraparte)) {
      setMensaje("Quita primero la tarifa de la otra modalidad para esta regla.");
      return;
    }
    setTarifas((actual) => Object.hasOwn(actual, llave) ? actual : { ...actual, [llave]: "" });
    setClave("");
    setMensaje("");
  };
  const guardar = async (event) => {
    event.preventDefault();
    setGuardando(true);
    setMensaje("");
    try {
      const { data } = await saveTarifasManoObra(tarifas);
      setTarifas(data);
      setMensaje("Porcentajes guardados.");
    } catch (error) {
      setMensaje(error.response?.data?.message || "No se pudieron guardar los porcentajes.");
    } finally {
      setGuardando(false);
    }
  };

  return <section className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-start gap-4 bg-slate-900 p-5 text-white sm:p-7">
      <span className="rounded-xl bg-blue-600 p-3"><Calculator size={22} aria-hidden="true" /></span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Administración</p>
        <h1 className="mt-1 text-2xl font-bold">Porcentajes de mano de obra</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">Configura porcentajes sobre el neto del servicio o montos fijos en pesos. Una tarifa por instalador tiene prioridad sobre la tarifa general.</p>
      </div>
    </header>
    {tarifas && <form onSubmit={guardar} className="p-4 sm:p-6">
      <fieldset disabled={guardando}>
        <div className="my-4 flex flex-wrap items-end gap-2">
          <label className="flex-1 text-sm font-semibold">Material, micraje de película o servicio
            <input list="reglas-mano-obra" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="Selecciona del catálogo o escribe SERVICIO:DETAILING" className="mt-1 block w-full rounded border p-2 font-normal" />
          </label>
          <datalist id="reglas-mano-obra">{opciones.map((opcion) => <option key={opcion} value={opcion} />)}</datalist>
          <label className="text-sm font-semibold">Instalador<select value={instalador} onChange={(e) => setInstalador(e.target.value)} className="mt-1 block rounded border p-2"><option value="">Todos</option>{instaladores.map((item) => <option key={item._id} value={item._id}>{item.nombre}</option>)}</select></label>
          <label className="text-sm font-semibold">Modalidad<select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className="mt-1 block rounded border p-2"><option value="PORCENTAJE">Porcentaje</option><option value="FIJO">Monto fijo</option></select></label>
          <button type="button" onClick={agregar} className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-800 hover:bg-blue-100"><Plus size={16} aria-hidden="true" />Agregar regla</button>
        </div>
        {errorCatalogo && <p role="alert" className="mb-3 text-sm text-red-700">No se pudo cargar el catálogo de servicios.</p>}
        {servicios.length > 0 && <label className="mb-3 block text-sm font-semibold">Elegir del catálogo de servicios
          <select value="" onChange={(e) => setClave(e.target.value)} className="mt-1 block w-full rounded border p-2 font-normal">
            <option value="">Selecciona un servicio para agregar su tarifa</option>
            {[...new Set(servicios.map((item) => item.categoria))].map((categoria) => (
              <optgroup key={categoria} label={categoria}>
                {servicios.filter((item) => item.categoria === categoria).map((item) => (
                  <option key={item._id} value={`SERVICIO:${item.nombre}`}>{item.nombre}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>}
        <button type="button" className="mb-3 rounded border px-3 py-2 text-sm" onClick={() => {
          setTarifas((actual) => ({
            ...actual,
            ...(!Object.hasOwn(actual, "MATERIAL:CLEAR PLEX") && !Object.hasOwn(actual, "FIJO|MATERIAL:CLEAR PLEX") ? { "MATERIAL:CLEAR PLEX": 6.2 } : {}),
            ...(!Object.hasOwn(actual, "SERVICIO:RETIRO CLEAR PLEX") && !Object.hasOwn(actual, "FIJO|SERVICIO:RETIRO CLEAR PLEX") ? { "FIJO|SERVICIO:RETIRO CLEAR PLEX": 12000 } : {}),
          }));
          setMensaje("Revisa las tarifas de Clear Plex y guarda la tabla para aplicarlas.");
        }}>Agregar tarifas de Clear Plex</button>
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
            <h2 className="font-bold text-slate-900">Tarifas de instalación</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{Object.keys(tarifas).length} reglas</span>
          </div>
          <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-4 py-3">Regla</th><th className="px-4 py-3">Instalador</th><th className="px-4 py-3">Tarifa</th><th className="px-4 py-3 text-right">Acción</th></tr></thead>
          <tbody>{Object.entries(tarifas).sort(([a], [b]) => a.localeCompare(b)).map(([regla, valor]) => {
            const fijo = regla.startsWith("FIJO|");
            const [nombre, id] = (fijo ? regla.slice(5) : regla).split("|");
            return (
            <tr key={regla} className="border-t border-slate-100 even:bg-slate-50/70 hover:bg-blue-50/50">
              <th scope="row" className="px-4 py-3 font-semibold text-slate-900">{nombre.replace(":", " · ")}</th>
              <td className="px-4 py-3"><span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${id ? "bg-indigo-50 text-indigo-800" : "bg-slate-100 text-slate-700"}`}>{id ? instaladores.find((item) => item._id === id)?.nombre || "Instalador no disponible" : "Todos"}</span></td>
              <td className="whitespace-nowrap px-4 py-3"><input aria-label={`Tarifa de ${nombre}`} required type="number" min="0" max={fijo ? undefined : 100} step={fijo ? "1" : "0.01"} value={valor} onChange={(e) => setTarifas((actual) => ({ ...actual, [regla]: e.target.value }))} className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-2 text-right font-semibold tabular-nums focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /> <span className={`rounded-md px-2 py-1 text-xs font-bold ${fijo ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-800"}`}>{fijo ? "COP" : "%"}</span></td>
              <td className="px-4 py-3 text-right"><button type="button" onClick={() => setTarifas((actual) => Object.fromEntries(Object.entries(actual).filter(([nombre]) => nombre !== regla)))} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={15} aria-hidden="true" />Quitar</button></td>
            </tr>
          ); })}</tbody>
        </table>
          </div>
          {Object.keys(tarifas).length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">Agrega un material o servicio para configurar su primera tarifa.</p>}
        </div>
        <div className="mt-4 flex justify-end"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800"><Save size={16} aria-hidden="true" />{guardando ? "Guardando…" : "Guardar porcentajes"}</button></div>
      </fieldset>
    </form>}
    {mensaje && <p role="status" className="mx-4 mb-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700 sm:mx-6">{mensaje}</p>}
  </section>;
}
