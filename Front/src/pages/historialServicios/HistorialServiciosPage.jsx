import { useEffect, useState } from "react";
import { getHistorialServicio, getServiciosParaHistorial } from "../../api/asesores.api";
import TrazabilidadServicio from "./TrazabilidadServicio";

export default function HistorialServiciosPage() {
  const [texto, setTexto] = useState("");
  const [filtros, setFiltros] = useState({ buscar: "", page: 1 });
  const [lista, setLista] = useState(null);
  const [errorLista, setErrorLista] = useState("");
  const [seleccion, setSeleccion] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [errorDetalle, setErrorDetalle] = useState("");

  useEffect(() => {
    let activo = true;
    getServiciosParaHistorial(filtros)
      .then(({ data }) => { if (activo) setLista(data.data); })
      .catch(() => { if (activo) setErrorLista("No se pudieron cargar los servicios."); });
    return () => { activo = false; };
  }, [filtros]);

  useEffect(() => {
    if (!seleccion) return;
    let activo = true;
    getHistorialServicio(seleccion.id)
      .then(({ data }) => { if (activo) setDetalle(data.data); })
      .catch(() => { if (activo) setErrorDetalle("No se pudo cargar el historial."); });
    return () => { activo = false; };
  }, [seleccion]);

  const consultar = (buscar, page) => {
    setLista(null);
    setErrorLista("");
    setFiltros({ buscar, page });
  };

  const abrir = (id) => {
    setDetalle(null);
    setErrorDetalle("");
    setSeleccion({ id });
  };

  return (
    <main className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Historial de servicios</h1>
        <p className="text-sm text-slate-600">Consulta los tiempos por etapa y los responsables de cada servicio.</p>
      </header>
      <form className="flex flex-wrap gap-2" onSubmit={(evento) => {
        evento.preventDefault();
        consultar(texto.trim(), 1);
      }}>
        <input aria-label="Buscar servicio" placeholder="Placa, código o cliente" value={texto} onChange={(evento) => setTexto(evento.target.value)} className="rounded-lg border px-3 py-2" />
        <button className="rounded-lg bg-blue-700 px-4 py-2 text-white">Buscar</button>
      </form>
      {errorLista ? <p role="alert">{errorLista}</p> : !lista ? <p role="status">Cargando servicios…</p> : (
        <section className="rounded-xl border bg-white p-4">
          {lista.items.length ? <ul className="divide-y">
            {lista.items.map((servicio) => <li key={servicio._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-semibold">{servicio.codigo} · {servicio.vehiculo?.placa}</p>
                <p className="text-sm text-slate-600">{servicio.asesorNombre} · {servicio.flujo?.etapa?.replaceAll("_", " ")}</p>
              </div>
              <button type="button" onClick={() => abrir(servicio._id)} className="rounded border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800">Ver historial</button>
            </li>)}
          </ul> : <p>No se encontraron servicios.</p>}
          {lista.pagination.totalPages > 1 && <nav aria-label="Páginas de servicios" className="mt-4 flex items-center gap-3 text-sm">
            <button disabled={filtros.page === 1} onClick={() => consultar(filtros.buscar, filtros.page - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Anterior</button>
            <span>{filtros.page} de {lista.pagination.totalPages}</span>
            <button disabled={filtros.page >= lista.pagination.totalPages} onClick={() => consultar(filtros.buscar, filtros.page + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Siguiente</button>
          </nav>}
        </section>
      )}
      {seleccion && <section className="rounded-xl border bg-white p-4">
        {errorDetalle ? <p role="alert">{errorDetalle}</p> : !detalle ? <p role="status">Cargando historial…</p> : <>
          <h2 className="font-bold">{detalle.codigo} · {detalle.vehiculo?.placa}</h2>
          <TrazabilidadServicio asesoria={detalle} />
        </>}
      </section>}
    </main>
  );
}
