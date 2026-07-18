import { Filter, Search } from "lucide-react";

function AlertasFilters({
  estado,
  onEstadoChange,
  onSearchChange,
  onTipoChange,
  search,
  tipo,
  tipos,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-100">
          <Filter size={20} />
        </div>

        <div>
          <h2 className="font-black text-slate-900">
            Filtros
          </h2>

          <p className="text-sm text-slate-500">
            Revisa alertas por tipo, estado o mensaje.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Buscar
          </label>

          <Search
            size={18}
            className="absolute left-3 top-9 text-slate-400"
          />

          <input
            type="text"
            placeholder="Buscar por tipo o mensaje..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 pl-10 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Tipo
          </label>

          <select
            value={tipo}
            onChange={(e) => onTipoChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50"
          >
            {tipos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Estado
          </label>

          <select
            value={estado}
            onChange={(e) => onEstadoChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-50"
          >
            <option value="PENDIENTES">
              Pendientes
            </option>
            <option value="ATENDIDAS">
              Atendidas
            </option>
            <option value="TODAS">
              Todas
            </option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default AlertasFilters;
