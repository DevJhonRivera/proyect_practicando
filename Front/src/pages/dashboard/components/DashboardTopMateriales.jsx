import {
  Trophy,
  TrendingUp
} from "lucide-react";
import ExcelButton from "../../../components/ui/ExcelButton";
import { etiquetaClasificacion } from "../../../utils/materiales";

const etiquetaTopMaterial = (item) =>
  etiquetaClasificacion(
    item?._id?.porcentaje,
    item?._id?.unidadMedida
  );

function DashboardTopMaterials({ topMateriales = [] }) {

  const colores = [
    "bg-yellow-100 text-yellow-700",
    "bg-gray-100 text-gray-700",
    "bg-orange-100 text-orange-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700"
  ];

  const excelColumns = [
    {
      header: "Ranking",
      value: (item) => item.ranking,
    },
    {
      header: "Material",
      value: (item) => item._id?.tipo,
      width: 24,
    },
    {
      header: "Clasificacion",
      value: etiquetaTopMaterial,
    },
    {
      header: "Consumo",
      value: (item) => Number(item.totalConsumido || 0),
    },
  ];

  return (

    <div className="bg-white rounded-2xl shadow-lg">

      <div className="border-b p-6 flex items-center justify-between gap-4">

        <div className="flex items-center gap-3">
          <Trophy
            className="text-yellow-500"
            size={28}
          />

          <div>

            <h2 className="text-xl font-bold text-slate-800">
              Top Materiales Consumidos
            </h2>

            <p className="text-slate-500 text-sm">
              Ranking de materiales con mayor consumo.
            </p>

          </div>
        </div>

        <ExcelButton
          title="Top Materiales Consumidos"
          fileName="top-materiales"
          sheetName="Top Materiales"
          columns={excelColumns}
          rows={topMateriales.map((item, index) => ({
            ...item,
            ranking: index + 1,
          }))}
        />

      </div>

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead className="bg-slate-50">

            <tr>

              <th className="text-left p-4">
                #
              </th>

              <th className="text-left p-4">
                Material
              </th>

              <th className="text-left p-4">
                Clasificacion
              </th>

              <th className="text-center p-4">
                Consumo
              </th>

              <th className="text-center p-4">
                Ranking
              </th>

            </tr>

          </thead>

          <tbody>

            {

              topMateriales.length === 0 ?

                (

                  <tr>

                    <td
                      colSpan={5}
                      className="text-center p-8 text-gray-500"
                    >

                      No hay datos disponibles.

                    </td>

                  </tr>

                )

                :

                topMateriales.map((item, index) => (

                  <tr
                    key={index}
                    className="border-t hover:bg-slate-50 transition"
                  >

                    <td className="p-4 font-bold">

                      {index + 1}

                    </td>

                    <td className="p-4 font-semibold">

                      {item._id.tipo}

                    </td>

                    <td className="p-4">

                      {etiquetaTopMaterial(item)}

                    </td>

                    <td className="p-4 text-center font-bold text-blue-600">

                      {Number(item.totalConsumido).toFixed(0)} m

                    </td>

                    <td className="p-4">

                      <div className="flex items-center gap-3">

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${colores[index] || "bg-slate-100 text-slate-700"}`}
                        >

                          Top {index + 1}

                        </span>

                        <div className="flex-1 bg-slate-200 rounded-full h-2">

                          <div

                            className="bg-blue-600 h-2 rounded-full"

                            style={{

                              width: `${Math.min(
                                (item.totalConsumido /
                                  topMateriales[0].totalConsumido) *
                                  100,
                                100
                              )}%`

                            }}

                          />

                        </div>

                      </div>

                    </td>

                  </tr>

                ))

            }

          </tbody>

        </table>

      </div>

      <div className="border-t p-4 bg-slate-50 flex justify-between text-sm text-slate-600">

        <span>

          Total materiales:
          <strong> {topMateriales.length}</strong>

        </span>

        <span className="flex items-center gap-2">

          <TrendingUp size={16} />

          Actualizado en tiempo real

        </span>

      </div>

    </div>

  );

}

export default DashboardTopMaterials;
