import {
  Package,
  Trash2
} from "lucide-react";
import ExcelButton from "../../../components/ui/ExcelButton";
import { anchoLabel } from "../../../utils/anchos";
import { etiquetaDetalle } from "../../../utils/materiales";

function PedidoDetalleTable({
  detalles,
  eliminarDetalle,
}) {
  const excelColumns = [
    {
      header: "Material",
      value: (item) => item.tipoPolarizado,
      width: 24,
    },
    {
      header: "Clasificacion",
      value: etiquetaDetalle,
    },
    {
      header: "Ancho",
      value: (item) => anchoLabel(item.ancho),
    },
    {
      header: "Rollos",
      value: (item) => Number(item.cantidadRollos || 0),
    },
    {
      header: "Estado",
      value: () => "Pendiente",
    },
  ];

  return (

    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

      {/* Header */}

      <div className="flex justify-between items-center px-6 py-4 border-b">

        <div>

          <h2 className="text-xl font-bold text-slate-800">
            Materiales Agregados
          </h2>

          <p className="text-sm text-slate-500">
            Revise antes de guardar el pedido.
          </p>

        </div>

        <div className="flex items-center gap-3">
          <ExcelButton
            title="Materiales Agregados"
            fileName="materiales-pedido"
            sheetName="Materiales"
            columns={excelColumns}
            rows={detalles}
          />

          <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold">

            {detalles.length} Referencias

          </span>
        </div>

      </div>

      {

        detalles.length === 0 ?

        (

          <div className="py-16 text-center">

            <Package
              size={70}
              className="mx-auto text-slate-300"
            />

            <h3 className="mt-4 text-lg font-semibold text-slate-600">
              No hay materiales agregados
            </h3>

            <p className="text-slate-500">
              Agregue el primer material para este pedido.
            </p>

          </div>

        )

        :

        (

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-slate-100">

                <tr>

                  <th className="p-4 text-left">
                    Material
                  </th>

                  <th className="p-4 text-center">
                    Clasificacion
                  </th>

                  <th className="p-4 text-center">
                    Ancho
                  </th>

                  <th className="p-4 text-center">
                    Rollos
                  </th>

                  <th className="p-4 text-center">
                    Estado
                  </th>

                  <th className="p-4 text-center">
                    Acción
                  </th>

                </tr>

              </thead>

              <tbody>

                {

                  detalles.map((item, index) => (

                    <tr
                      key={index}
                      className="border-b hover:bg-slate-50 transition"
                    >

                      <td className="p-4 font-semibold">

                        {item.tipoPolarizado}

                      </td>

                      <td className="text-center">

                        {etiquetaDetalle(item)}

                      </td>

                      <td className="text-center">

                        {anchoLabel(item.ancho)}

                      </td>

                      <td className="text-center font-bold text-blue-600">

                        {item.cantidadRollos}

                      </td>

                      <td className="text-center">

                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">

                          Pendiente

                        </span>

                      </td>

                      <td className="text-center">

                        <button

                          onClick={() =>
                            eliminarDetalle(index)
                          }

                          className="
                            bg-red-500
                            hover:bg-red-600
                            text-white
                            p-2
                            rounded-lg
                            transition
                          "

                        >

                          <Trash2 size={18} />

                        </button>

                      </td>

                    </tr>

                  ))

                }

              </tbody>

            </table>

          </div>

        )

      }

    </div>

  );

}

export default PedidoDetalleTable;
