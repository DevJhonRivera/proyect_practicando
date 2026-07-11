import { useState } from "react";
import ExcelButton from "../../../components/ui/ExcelButton";
import { etiquetaClasificacion } from "../../../utils/materiales";

const etiquetaInventario = (item) =>
  etiquetaClasificacion(
    item?._id?.porcentaje,
    item?._id?.unidadMedida
  );

function InventoryTable({ inventario = [] }) {

  const [pagina, setPagina] = useState(1);

  const registrosPorPagina = 10;

  const totalPaginas = Math.ceil(
    inventario.length / registrosPorPagina
  );

  const datos = inventario.slice(
    (pagina - 1) * registrosPorPagina,
    pagina * registrosPorPagina
  );

  const excelColumns = [
    {
      header: "Material",
      value: (item) => item._id?.tipo,
      width: 24,
    },
    {
      header: "Clasificacion",
      value: etiquetaInventario,
    },
    {
      header: "Rollos",
      value: (item) => item.rollos,
    },
    {
      header: "Metros",
      value: (item) => Number(item.metros || 0),
    },
    {
      header: "Estado",
      value: (item) => item.estado || "DISPONIBLE",
    },
    {
      header: "Stock",
      value: (item) =>
        Number(item.metros || 0) <= 50
          ? "Bajo"
          : "Normal",
    },
  ];

  const badgeEstado = (estado) => {

    switch (estado) {

      case "RECEPCION":
        return "bg-cyan-100 text-cyan-700";

      case "RESERVA":
        return "bg-blue-100 text-blue-700";

      case "USO":
        return "bg-orange-100 text-orange-700";

      case "AGOTADO":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";

    }

  };

  return (

    <div className="p-6">

      <div className="flex justify-end mb-4">
        <ExcelButton
          title="Inventario general"
          fileName="inventario-rollos"
          sheetName="Inventario"
          columns={excelColumns}
          rows={inventario}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr className="text-left">

              <th className="p-4">Material</th>

              <th className="p-4">Clasificacion</th>

              <th className="p-4">Rollos</th>

              <th className="p-4">Metros</th>

              <th className="p-4">Estado</th>

              <th className="p-4">Stock</th>

            </tr>

          </thead>

          <tbody>

            {datos.length === 0 ? (

              <tr>

                <td
                  colSpan={6}
                  className="text-center p-8 text-gray-500"
                >

                  No hay registros para mostrar

                </td>

              </tr>

            ) : (

              datos.map((item, index) => {

                const bajoStock =
                  item.metros <= 50;

                return (

                  <tr
                    key={index}
                    className="
                    border-t
                    hover:bg-slate-50
                    transition"
                  >

                    <td className="p-4 font-medium">

                      {item._id.tipo}

                    </td>

                    <td className="p-4">

                      {etiquetaInventario(item)}

                    </td>

                    <td className="p-4 font-semibold">

                      {item.rollos}

                    </td>

                    <td className="p-4">

                      {Number(item.metros).toFixed(0)} m

                    </td>

                    <td className="p-4">

                      <span
                        className={`
                          px-3
                          py-1
                          rounded-full
                          text-xs
                          font-semibold
                          ${badgeEstado(item.estado)}
                        `}
                      >

                        {item.estado || "DISPONIBLE"}

                      </span>

                    </td>

                    <td className="p-4">

                      {bajoStock ? (

                        <span className="text-red-600 font-semibold">

                          Bajo

                        </span>

                      ) : (

                        <span className="text-green-600 font-semibold">

                          Normal

                        </span>

                      )}

                    </td>

                  </tr>

                );

              })

            )}

          </tbody>

        </table>

      </div>

      {/* Paginación */}

      {totalPaginas > 1 && (

        <div className="flex justify-between items-center mt-6">

          <p className="text-gray-500">

            Página {pagina} de {totalPaginas}

          </p>

          <div className="flex gap-2">

            <button

              disabled={pagina === 1}

              onClick={() =>
                setPagina(pagina - 1)
              }

              className="
              px-4
              py-2
              rounded-lg
              border
              disabled:opacity-40
              hover:bg-slate-100"

            >

              Anterior

            </button>

            <button

              disabled={pagina === totalPaginas}

              onClick={() =>
                setPagina(pagina + 1)
              }

              className="
              px-4
              py-2
              rounded-lg
              border
              disabled:opacity-40
              hover:bg-slate-100"

            >

              Siguiente

            </button>

          </div>

        </div>

      )}

    </div>

  );

}

export default InventoryTable;
