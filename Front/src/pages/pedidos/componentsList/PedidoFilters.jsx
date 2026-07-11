import {
  Search,
  Filter,
  RotateCcw,
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

    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

      <div className="flex items-center gap-2 mb-5">

        <Filter
          size={22}
          className="text-blue-600"
        />

        <h2 className="text-xl font-bold text-slate-800">
          Filtros
        </h2>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Buscar */}

        <div className="relative">

          <Search
            size={18}
            className="absolute left-3 top-3.5 text-slate-400"
          />

          <input

            type="text"

            placeholder="Buscar código o proveedor..."

            value={search}

            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }

            className="
              w-full
              border
              border-slate-300
              rounded-xl
              pl-10
              pr-4
              py-3
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "

          />

        </div>

        {/* Estado */}

        <select

          value={estado}

          onChange={(e) =>
            setEstado(
              e.target.value
            )
          }

          className="
            border
            border-slate-300
            rounded-xl
            px-4
            py-3
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
          "

        >

          <option value="TODOS">
            Todos los estados
          </option>

          <option value="PENDIENTE">
            Pendiente
          </option>

          <option value="PARCIAL">
            Parcial
          </option>

          <option value="COMPLETADO">
            Completado
          </option>

          <option value="CANCELADO">
            Cancelado
          </option>

        </select>

        {/* Limpiar */}

        <button

          onClick={limpiarFiltros}

          className="
            bg-slate-100
            hover:bg-slate-200
            rounded-xl
            px-4
            py-3
            flex
            justify-center
            items-center
            gap-2
            font-semibold
            transition
          "

        >

          <RotateCcw size={18} />

          Limpiar filtros

        </button>

      </div>

    </div>

  );

}

export default PedidoFilters;