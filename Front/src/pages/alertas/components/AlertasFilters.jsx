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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <Filter size={20} />
        </div>
        <div>
          <h2 className="font-bold text-slate-800">
            Filtros
          </h2>
          <p className="text-sm text-slate-500">
            Revisa alertas por tipo, estado o mensaje.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search
            size={18}
            className="absolute left-3 top-3.5 text-slate-400"
          />

          <input
            type="text"
            placeholder="Buscar por tipo o mensaje..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-3 pl-10 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
          />
        </div>

        <select
          value={tipo}
          onChange={(e) => onTipoChange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
        >
          {tipos.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={estado}
          onChange={(e) => onEstadoChange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
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
  );
}

export default AlertasFilters;
