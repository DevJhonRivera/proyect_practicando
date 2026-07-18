import {
  Filter,
  RotateCcw,
  Search,
} from "lucide-react";

function PedidoFilters({
  search,
  setSearch,
  estado,
  setEstado,
}) {
  const limpiarFiltros = () => {
    setSearch("");
    setEstado("TODOS");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Filter size={20} />
        </div>
        <div>
          <h2 className="font-bold text-slate-800">
            Filtros
          </h2>
          <p className="text-sm text-slate-500">
            Busca por codigo, proveedor o estado del pedido.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-3.5 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar codigo o proveedor..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <select
          value={estado}
          onChange={(event) =>
            setEstado(event.target.value)
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="PARCIAL">Parcial</option>
          <option value="COMPLETADO">Completado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>

        <button
          type="button"
          onClick={limpiarFiltros}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          <RotateCcw size={18} />
          Limpiar
        </button>
      </div>
    </div>
  );
}

export default PedidoFilters;
