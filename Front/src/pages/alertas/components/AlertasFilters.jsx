import { Search } from "lucide-react";

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
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="grid md:grid-cols-4 gap-4">
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
            className="w-full border rounded-xl p-3 pl-10 focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>

        <select
          value={tipo}
          onChange={(e) => onTipoChange(e.target.value)}
          className="border rounded-xl p-3 focus:ring-2 focus:ring-red-500 outline-none"
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
          className="border rounded-xl p-3 focus:ring-2 focus:ring-red-500 outline-none"
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
