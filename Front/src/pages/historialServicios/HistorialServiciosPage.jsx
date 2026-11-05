import { useEffect, useRef, useState } from "react";
import { getHistorialServicio, getServiciosParaHistorial } from "../../api/asesores.api";
import TrazabilidadServicio from "./TrazabilidadServicio";
import { duracion, etiqueta, fechaColombia } from "./formato";

const campo = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const panel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const boton = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40";
const vacio = { buscar: "", desde: "", hasta: "" };

export default function HistorialServiciosPage() {
  const [formulario, setFormulario] = useState(vacio);
  const [filtros, setFiltros] = useState({ ...vacio, page: 1 });
  const [lista, setLista] = useState(null);
  const [errorLista, setErrorLista] = useState("");
  const [seleccion, setSeleccion] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [errorDetalle, setErrorDetalle] = useState("");
  const panelDetalle = useRef(null);

  useEffect(() => {
    let activo = true;
    getServiciosParaHistorial(filtros)
      .then(({ data }) => { if (activo) setLista(data.data); })
      .catch((error) => {
        if (activo) setErrorLista(error.response?.data?.message || "No se pudieron cargar los servicios.");
      });
    return () => { activo = false; };
  }, [filtros]);

  useEffect(() => {
    if (!seleccion) return;
    let activo = true;
    panelDetalle.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    getHistorialServicio(seleccion.id)
      .then(({ data }) => { if (activo) setDetalle(data.data); })
      .catch(() => { if (activo) setErrorDetalle("No se pudo cargar el historial."); });
    return () => { activo = false; };
  }, [seleccion]);

  const consultar = (siguientes) => {
    setLista(null);
    setErrorLista("");
    setFiltros(siguientes);
  };

  const abrir = (id) => {
    setDetalle(null);
    setErrorDetalle("");
    setSeleccion({ id });
  };

  const actualizar = (evento) => {
    setFormulario({ ...formulario, [evento.target.name]: evento.target.value });
  };
  const analisis = lista?.analisis;
  const mayor = analisis?.etapas.find((etapa) => etapa.cerradas);
  const espera = analisis?.esperaMayor;

  return (
    <main className="space-y-5">
      <header className="rounded-2xl bg-slate-900 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">Administración</p>
        <h1 className="mt-2 text-2xl font-bold">Historial de servicios</h1>
        <p className="mt-1 text-sm text-slate-300">Compara tiempos por etapa y revisa qué ocurrió en cada orden.</p>
      </header>
      <form className={`${panel} grid items-end gap-3 md:grid-cols-[2fr_1fr_1fr_auto_auto]`} onSubmit={(evento) => {
        evento.preventDefault();
        setSeleccion(null);
        consultar({ ...formulario, buscar: formulario.buscar.trim(), page: 1 });
      }}>
        <label className="text-sm font-semibold">Buscar
          <input name="buscar" placeholder="Placa, código, cliente o asesor" value={formulario.buscar} onChange={actualizar} className={campo} />
        </label>
        <label className="text-sm font-semibold">Creado desde
          <input type="date" name="desde" max={formulario.hasta || undefined} value={formulario.desde} onChange={actualizar} className={campo} />
        </label>
        <label className="text-sm font-semibold">Creado hasta
          <input type="date" name="hasta" min={formulario.desde || undefined} value={formulario.hasta} onChange={actualizar} className={campo} />
        </label>
        <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Aplicar filtros</button>
        <button type="button" className={boton} onClick={() => {
          setFormulario(vacio);
          setSeleccion(null);
          consultar({ ...vacio, page: 1 });
        }}>Limpiar</button>
      </form>

      {errorLista ? <p role="alert" className="text-red-700">{errorLista}</p> : !lista ? <p role="status">Cargando servicios.</p> : <>
        {analisis && <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className={panel}>
              <p className="text-sm font-semibold text-slate-600">Órdenes en la consulta</p>
              <p className="mt-2 text-2xl font-bold">{lista.pagination.total}</p>
              <p className="text-sm text-slate-500">{analisis.sinRegistro} sin etapas medibles</p>
            </div>
            <div className={panel}>
              <p className="text-sm font-semibold text-slate-600">Mayor promedio al cerrar una etapa</p>
              <p className="mt-2 text-2xl font-bold text-blue-800">{duracion(mayor?.promedioMs)}</p>
              {mayor && <p className="text-sm text-slate-600">{etiqueta(mayor.estado)} · {mayor.cerradas} visitas cerradas</p>}
            </div>
            <div className={panel}>
              <p className="text-sm font-semibold text-slate-600">Mayor permanencia actual</p>
              <p className="mt-2 text-2xl font-bold text-amber-800">{duracion(espera?.duracionMs)}</p>
              {espera && <button type="button" className="text-left text-sm text-blue-800 underline" onClick={() => abrir(espera.id)}>
                {espera.placa || espera.codigo} · {etiqueta(espera.estado)}
              </button>}
            </div>
          </div>
          <section className={panel}>
            <h2 className="font-bold">Tiempos por etapa</h2>
            <p className="mt-1 text-sm text-slate-600">Incluye todas las órdenes filtradas. Cada paso por una etapa cuenta como una visita. El tiempo calendario incluye espera, trabajo y horas fuera de jornada.</p>
            {analisis.etapas.length ? <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100"><tr><th className="p-3">Etapa</th><th className="p-3">Promedio cerrado</th><th className="p-3">Visitas cerradas</th><th className="p-3">Órdenes en etapa</th><th className="p-3">Caso activo más antiguo</th></tr></thead>
                <tbody>{analisis.etapas.map((etapa) => <tr key={etapa.estado} className="border-t border-slate-200">
                  <td className="p-3 font-medium">{etiqueta(etapa.estado)}</td><td className="p-3">{duracion(etapa.promedioMs)}</td><td className="p-3">{etapa.cerradas}</td><td className="p-3">{etapa.abiertas}</td><td className="p-3">{etapa.esperaMayor ? <button type="button" className="text-left text-blue-800 underline" onClick={() => abrir(etapa.esperaMayor.id)}>{etapa.esperaMayor.placa || etapa.esperaMayor.codigo} · {duracion(etapa.esperaMayor.duracionMs)}</button> : "—"}</td>
                </tr>)}</tbody>
              </table>
            </div> : <p className="mt-3 text-sm text-slate-500">Sin tiempos registrados para esta consulta.</p>}
          </section>
        </>}
        <section className={panel}>
          <h2 className="font-bold">Órdenes de servicio</h2>
          {lista.items.length ? <ul className="mt-2 divide-y divide-slate-200">
            {lista.items.map((servicio) => <li key={servicio._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">{servicio.vehiculo?.placa || "Sin placa"} · {servicio.codigo}</p>
                <p className="text-sm text-slate-600">{servicio.cliente?.nombre} · {servicio.asesorNombre}</p>
                <p className="text-xs text-slate-500">{fechaColombia(servicio.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{etiqueta(servicio.flujo?.etapa)}</span>
                <button type="button" onClick={() => abrir(servicio._id)} className={boton}>Ver historial</button>
              </div>
            </li>)}
          </ul> : <p className="mt-2 text-sm text-slate-500">No se encontraron servicios en esta página.</p>}
          {(lista.pagination.totalPages > 1 || filtros.page > 1) && <nav aria-label="Páginas de servicios" className="mt-4 flex items-center gap-3 text-sm">
            <button disabled={filtros.page === 1} onClick={() => consultar({ ...filtros, page: filtros.page - 1 })} className={boton}>Anterior</button>
            <span>{filtros.page} de {lista.pagination.totalPages}</span>
            <button disabled={filtros.page >= lista.pagination.totalPages} onClick={() => consultar({ ...filtros, page: filtros.page + 1 })} className={boton}>Siguiente</button>
          </nav>}
        </section>
      </>}
      {seleccion && <section ref={panelDetalle} className={`${panel} scroll-mt-4`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">{detalle ? `${detalle.codigo} · ${detalle.vehiculo?.placa || "Sin placa"}` : "Detalle del servicio"}</h2>
          <button type="button" onClick={() => setSeleccion(null)} className={boton}>Cerrar detalle</button>
        </div>
        {errorDetalle ? <p role="alert" className="text-red-700">{errorDetalle}</p> : !detalle ? <p role="status">Cargando historial.</p> : <TrazabilidadServicio asesoria={detalle} />}
      </section>}
    </main>
  );
}
