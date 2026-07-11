import { useMemo, useState } from "react";

import {
  Search,
  Package
} from "lucide-react";

import InventoryFilters from "./InventoryFilters";
import InventoryTable from "./InventoryTable";
import { etiquetaClasificacion } from "../../../utils/materiales";

function DashboardInventory({ inventario = [] }) {

  const [busqueda, setBusqueda] = useState("");

  const [material, setMaterial] = useState("TODOS");

  const [porcentaje, setPorcentaje] = useState("TODOS");

  const [estado, setEstado] = useState("TODOS");

  const [orden, setOrden] = useState("material");

  //------------------------------------------
  // Opciones de filtros
  //------------------------------------------

  const materiales = [

    "TODOS",

    ...new Set(

      inventario.map(

        item => item._id.tipo

      )

    )

  ];

  const porcentajes = [

    "TODOS",

    ...new Set(

      inventario.map(

        item => String(item._id.porcentaje)

      )

    )

  ];

  const estados = [

    "TODOS",

    ...new Set(

      inventario.map(

        item => item.estado

      )

    )

  ];

  //------------------------------------------
  // Inventario filtrado
  //------------------------------------------

  const inventarioFiltrado = useMemo(() => {

    let datos = [...inventario];

    datos = datos.filter(item => {

      const texto = busqueda.toLowerCase();

      const coincideBusqueda =

        item._id.tipo
          ?.toLowerCase()
          .includes(texto)

        ||

        `${item._id.porcentaje} ${etiquetaClasificacion(
          item._id.porcentaje,
          item._id.unidadMedida
        )}`
          .includes(texto);

      const coincideMaterial =

        material === "TODOS"

        ||

        item._id.tipo === material;

      const coincidePorcentaje =

        porcentaje === "TODOS"

        ||

        String(item._id.porcentaje) === porcentaje;

      const coincideEstado =

        estado === "TODOS"

        ||

        item.estado === estado;

      return (

        coincideBusqueda &&

        coincideMaterial &&

        coincidePorcentaje &&

        coincideEstado

      );

    });

    //--------------------------------------

    switch (orden) {

      case "metros":

        datos.sort(

          (a, b) =>

            b.metros - a.metros

        );

        break;

      case "rollos":

        datos.sort(

          (a, b) =>

            b.rollos - a.rollos

        );

        break;

      case "porcentaje":

        datos.sort(

          (a, b) =>

            a._id.porcentaje -

            b._id.porcentaje

        );

        break;

      default:

        datos.sort(

          (a, b) =>

            a._id.tipo.localeCompare(

              b._id.tipo

            )

        );

    }

    return datos;

  }, [

    inventario,

    busqueda,

    material,

    porcentaje,

    estado,

    orden

  ]);

  //------------------------------------------

  return (

    <div
      className="
      bg-white
      rounded-2xl
      shadow-lg
      overflow-hidden"
    >

      {/* HEADER */}

      <div
        className="
        border-b
        p-6
        flex
        justify-between
        items-center"
      >

        <div>

          <h2
            className="
            text-2xl
            font-bold
            text-slate-800"
          >

            Inventario general

          </h2>

          <p
            className="
            text-slate-500
            mt-1"
          >

            Consulta la disponibilidad actual de los rollos.

          </p>

        </div>

        <div
          className="
          flex
          items-center
          gap-2
          text-blue-700
          font-semibold"
        >

          <Package size={20} />

          {inventarioFiltrado.length}

          registros

        </div>

      </div>

      {/* BUSCADOR */}

      <div className="p-6 pb-0">

        <div className="relative">

          <Search
            size={18}
            className="
            absolute
            left-4
            top-3.5
            text-gray-400"
          />

          <input

            value={busqueda}

            onChange={(e) =>
              setBusqueda(
                e.target.value
              )
            }

            placeholder="Buscar material o clasificacion..."

            className="
            w-full
            border
            rounded-xl
            pl-12
            pr-4
            py-3
            focus:ring-2
            focus:ring-blue-500
            outline-none"

          />

        </div>

      </div>

      {/* FILTROS */}

      <InventoryFilters

        materiales={materiales}

        porcentajes={porcentajes}

        estados={estados}

        material={material}

        porcentaje={porcentaje}

        estado={estado}

        orden={orden}

        setMaterial={setMaterial}

        setPorcentaje={setPorcentaje}

        setEstado={setEstado}

        setOrden={setOrden}

      />

      {/* TABLA */}

      <InventoryTable

        inventario={inventarioFiltrado}

      />

    </div>

  );

}

export default DashboardInventory;
