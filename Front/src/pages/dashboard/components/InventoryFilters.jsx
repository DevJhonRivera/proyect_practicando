import {
  Filter,
  RotateCcw
} from "lucide-react";
import { etiquetaDetalle } from "../../../utils/materiales";

function InventoryFilters({

  materiales,
  porcentajes,
  estados,

  material,
  porcentaje,
  estado,
  orden,

  setMaterial,
  setPorcentaje,
  setEstado,
  setOrden

}) {

  const limpiarFiltros = () => {

    setMaterial("TODOS");

    setPorcentaje("TODOS");

    setEstado("TODOS");

    setOrden("material");

  };

  return (

    <div className="px-6 py-5 border-b bg-slate-50">

      <div className="flex items-center justify-between mb-5">

        <div className="flex items-center gap-2">

          <Filter
            size={20}
            className="text-blue-600"
          />

          <h3 className="text-lg font-semibold text-slate-700">

            Filtros de inventario

          </h3>

        </div>

        <button

          onClick={limpiarFiltros}

          className="
          flex
          items-center
          gap-2
          bg-white
          border
          px-4
          py-2
          rounded-lg
          text-slate-700
          hover:bg-slate-100
          transition"

        >

          <RotateCcw size={18} />

          Limpiar

        </button>

      </div>

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">

        {/* Material */}

        <div>

          <label className="block text-sm font-medium text-slate-600 mb-2">

            Material

          </label>

          <select

            value={material}

            onChange={(e) =>
              setMaterial(
                e.target.value
              )
            }

            className="
            w-full
            border
            rounded-xl
            p-3
            bg-white
            focus:ring-2
            focus:ring-blue-500
            outline-none"

          >

            {

              materiales.map(item => (

                <option
                  key={item}
                  value={item}
                >

                  {item}

                </option>

              ))

            }

          </select>

        </div>

        {/* Clasificacion */}

        <div>

          <label className="block text-sm font-medium text-slate-600 mb-2">

            Clasificacion

          </label>

          <select

            value={porcentaje}

            onChange={(e) =>
              setPorcentaje(
                e.target.value
              )
            }

            className="
            w-full
            border
            rounded-xl
            p-3
            bg-white
            focus:ring-2
            focus:ring-blue-500
            outline-none"

          >

            {

              porcentajes.map(item => (

                <option
                  key={item}
                  value={item}
                >

                  {

                    item === "TODOS"

                      ? "TODOS"

                      : etiquetaDetalle({
                          porcentaje: item,
                          tipoPolarizado:
                            material === "TODOS"
                              ? ""
                              : material,
                        })

                  }

                </option>

              ))

            }

          </select>

        </div>

        {/* Estado */}

        <div>

          <label className="block text-sm font-medium text-slate-600 mb-2">

            Estado

          </label>

          <select

            value={estado}

            onChange={(e) =>
              setEstado(
                e.target.value
              )
            }

            className="
            w-full
            border
            rounded-xl
            p-3
            bg-white
            focus:ring-2
            focus:ring-blue-500
            outline-none"

          >

            {

              estados.map(item => (

                <option
                  key={item}
                  value={item}
                >

                  {item}

                </option>

              ))

            }

          </select>

        </div>

        {/* Orden */}

        <div>

          <label className="block text-sm font-medium text-slate-600 mb-2">

            Ordenar por

          </label>

          <select

            value={orden}

            onChange={(e) =>
              setOrden(
                e.target.value
              )
            }

            className="
            w-full
            border
            rounded-xl
            p-3
            bg-white
            focus:ring-2
            focus:ring-blue-500
            outline-none"

          >

            <option value="material">

              Material (A-Z)

            </option>

            <option value="porcentaje">

              Clasificacion

            </option>

            <option value="rollos">

              Mayor cantidad de rollos

            </option>

            <option value="metros">

              Mayor cantidad de metros

            </option>

          </select>

        </div>

      </div>

    </div>

  );

}

export default InventoryFilters;
