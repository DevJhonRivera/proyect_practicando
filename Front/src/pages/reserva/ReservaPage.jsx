import {
  useEffect,
  useState
} from "react";

import Swal from "sweetalert2";

import {
  Search,
  Package,
  Layers,
  Filter
} from "lucide-react";

import {
  getReserva,
  moverUso
} from "../../api/rollos.api";
import ExcelButton from "../../components/ui/ExcelButton";
import { anchoLabel } from "../../utils/anchos";
import { etiquetaDetalle } from "../../utils/materiales";

function ReservaPage() {

  const [rollos, setRollos] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [material, setMaterial] =
    useState("TODOS");

  const [porcentaje, setPorcentaje] =
    useState("TODOS");

  const cargar = async () => {

    try {

      const res =
        await getReserva();

      setRollos(
        res.data.data || []
      );

    } catch (error) {

      console.error(error);

      Swal.fire({
        icon: "error",
        title:
          "Error cargando reservas"
      });

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const res =
          await getReserva();

        if (active) {
          setRollos(
            res.data.data || []
          );
        }
      } catch (error) {
        console.error(error);

        Swal.fire({
          icon: "error",
          title:
            "Error cargando reservas"
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    cargarInicial();

    return () => {
      active = false;
    };
  }, []);

  const pasar = async (id) => {

    const result =
      await Swal.fire({

        icon: "question",

        title:
          "¿Pasar a uso?",

        text:
          "El rollo quedará disponible para realizar cortes",

        showCancelButton:
          true,

        confirmButtonText:
          "Sí, pasar",

        cancelButtonText:
          "Cancelar"

      });

    if (!result.isConfirmed)
      return;

    try {

      await moverUso(id);

      Swal.fire({

        icon: "success",

        title:
          "Rollo enviado a uso"

      });

      cargar();

    } catch {

      Swal.fire({

        icon: "error",

        title:
          "Error al actualizar"

      });

    }

  };

  const materiales = [

    "TODOS",

    ...new Set(
      rollos.map(
        r => r.tipoPolarizado
      )
    )

  ];

  const porcentajes = [

    "TODOS",

    ...new Set(
      rollos.map(
        r =>
          String(
            r.porcentaje
          )
      )
    )

  ];

  const filtrados =
    rollos.filter(r => {

      const coincideBusqueda =

        r.codigoRollo
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )

        ||

        r.tipoPolarizado
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const coincideMaterial =

        material === "TODOS"

        ||

        r.tipoPolarizado ===
        material;

      const coincidePorcentaje =

        porcentaje ===
        "TODOS"

        ||

        String(
          r.porcentaje
        ) === porcentaje;

      return (

        coincideBusqueda &&

        coincideMaterial &&

        coincidePorcentaje

      );

    });

  const totalMetros =
    filtrados.reduce(

      (acc, item) =>

        acc +
        (
          item.largoDisponible ||
          0
        ),

      0

    );

  const excelColumns = [
    {
      header: "Codigo",
      value: (rollo) => rollo.codigoRollo,
    },
    {
      header: "Material",
      value: (rollo) => rollo.tipoPolarizado,
      width: 24,
    },
    {
      header: "Clasificacion",
      value: etiquetaDetalle,
    },
    {
      header: "Ancho",
      value: (rollo) => anchoLabel(rollo.ancho),
    },
    {
      header: "Metros disponibles",
      value: (rollo) => rollo.largoDisponible || 0,
    },
    {
      header: "Estado",
      value: () => "RESERVA",
    },
  ];

  return (

    <div className="space-y-6">

      {/* Header */}

      <div>

        <h1
          className="
          text-3xl
          font-bold
          text-slate-800"
        >
          Rollos en bodega
        </h1>

        <p
          className="
          text-slate-500"
        >
          Material guardado y listo para pasar a uso.
        </p>

      </div>

      {/* KPIs */}

      <div
        className="
        grid
        md:grid-cols-3
        gap-5"
      >

        <div
          className="
          bg-white
          rounded-xl
          shadow
          p-5"
        >

          <div
            className="
            flex
            items-center
            gap-3"
          >

            <Package
              className="
              text-blue-600"
            />

            <div>

              <p className="text-slate-500">
                Rollos
              </p>

              <h2 className="text-3xl font-bold">
                {filtrados.length}
              </h2>

            </div>

          </div>

        </div>

        <div
          className="
          bg-white
          rounded-xl
          shadow
          p-5"
        >

          <div
            className="
            flex
            items-center
            gap-3"
          >

            <Layers
              className="
              text-green-600"
            />

            <div>

              <p className="text-slate-500">
                Metros Disponibles
              </p>

              <h2 className="text-3xl font-bold">
                {totalMetros} m
              </h2>

            </div>

          </div>

        </div>

        <div
          className="
          bg-white
          rounded-xl
          shadow
          p-5"
        >

          <div
            className="
            flex
            items-center
            gap-3"
          >

            <Filter
              className="
              text-purple-600"
            />

            <div>

              <p className="text-slate-500">
                Materiales
              </p>

              <h2 className="text-3xl font-bold">
                {
                  materiales.length - 1
                }
              </h2>

            </div>

          </div>

        </div>

      </div>

      {/* Filtros */}

      <div
        className="
        bg-white
        rounded-xl
        shadow
        p-5"
      >

        <div
          className="
          grid
          md:grid-cols-3
          gap-4"
        >

          <div
            className="
            relative"
          >

            <Search
              size={18}
              className="
              absolute
              left-3
              top-3.5
              text-slate-400"
            />

            <input
              type="text"
              placeholder="Buscar código o material..."
              value={search}
              onChange={(e)=>
                setSearch(
                  e.target.value
                )
              }
              className="
              w-full
              border
              rounded-lg
              p-3
              pl-10"
            />

          </div>

          <select
            value={material}
            onChange={(e)=>
              setMaterial(
                e.target.value
              )
            }
            className="
            border
            rounded-lg
            p-3"
          >

            {materiales.map(
              item => (

              <option
                key={item}
                value={item}
              >
                {item}
              </option>

            ))}

          </select>

          <select
            value={porcentaje}
            onChange={(e)=>
              setPorcentaje(
                e.target.value
              )
            }
            className="
            border
            rounded-lg
            p-3"
          >

            {porcentajes.map(
              item => (

              <option
                key={item}
                value={item}
              >
                {item === "TODOS"
                  ? item
                  : etiquetaDetalle({
                      porcentaje: item,
                      tipoPolarizado: material === "TODOS"
                        ? ""
                        : material,
                    })}
              </option>

            ))}

          </select>

        </div>

      </div>

      {/* Tabla */}

      <div
        className="
        bg-white
        rounded-xl
        shadow
        overflow-hidden"
      >

        <div className="p-5 border-b flex items-center justify-between gap-4">

          <h2
            className="
            font-semibold
            text-lg"
          >
            Rollos en bodega
          </h2>

          <ExcelButton
            title="Rollos en Bodega"
            fileName="rollos-reserva"
            sheetName="Bodega"
            columns={excelColumns}
            rows={filtrados}
          />

        </div>

        {loading ? (

          <div className="p-10 text-center">
            Cargando...
          </div>

        ) : filtrados.length === 0 ? (

          <div className="p-10 text-center">

            <Package
              size={60}
              className="
              mx-auto
              text-slate-300"
            />

            <p className="mt-4 text-slate-500">
              No existen rollos en reserva
            </p>

          </div>

        ) : (

          <table className="w-full">

            <thead
              className="
              bg-slate-100"
            >

              <tr>

                <th className="p-4 text-left">
                  Código
                </th>

                <th className="p-4 text-left">
                  Material
                </th>

                <th className="p-4 text-left">
                  Clasificacion
                </th>

                <th className="p-4 text-left">
                  Ancho
                </th>

                <th className="p-4 text-left">
                  Metros
                </th>

                <th className="p-4 text-left">
                  Estado
                </th>

                <th className="p-4 text-center">
                  Acción
                </th>

              </tr>

            </thead>

            <tbody>

              {filtrados.map(
                rollo => (

                <tr
                  key={rollo._id}
                  className="
                  border-b
                  hover:bg-slate-50"
                >

                  <td className="p-4 font-medium">
                    {
                      rollo.codigoRollo
                    }
                  </td>

                  <td className="p-4">
                    {
                      rollo.tipoPolarizado
                    }
                  </td>

                  <td className="p-4">
                    {etiquetaDetalle(rollo)}
                  </td>

                  <td className="p-4">
                    {
                      anchoLabel(rollo.ancho)
                    }
                  </td>

                  <td className="p-4">
                    {Number(rollo.largoDisponible || 0).toFixed(2)} m
                  </td>

                  <td className="p-4">

                    <span
                      className="
                      bg-yellow-100
                      text-yellow-700
                      px-3
                      py-1
                      rounded-full
                      text-sm"
                    >
                      BODEGA
                    </span>

                  </td>

                  <td className="p-4 text-center">

                    <button
                      onClick={() =>
                        pasar(
                          rollo._id
                        )
                      }
                      className="
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      px-4
                      py-2
                      rounded-lg"
                    >
                      Pasar a uso
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>

    </div>

  );

}

export default ReservaPage;
