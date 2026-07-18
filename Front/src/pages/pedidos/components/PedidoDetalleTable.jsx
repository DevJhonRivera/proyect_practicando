import {
  Package,
  Trash2,
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-6 py-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Materiales agregados
          </h2>
          <p className="text-sm text-slate-500">
            Revise antes de guardar el pedido.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExcelButton
            title="Materiales agregados"
            fileName="materiales-pedido"
            sheetName="Materiales"
            columns={excelColumns}
            rows={detalles}
          />
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            {detalles.length} referencias
          </span>
        </div>
      </div>

      {detalles.length === 0 ? (
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
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-4 text-left">Material</th>
                <th className="p-4 text-center">Clasificacion</th>
                <th className="p-4 text-center">Ancho</th>
                <th className="p-4 text-center">Rollos</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Accion</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((item, index) => (
                <tr
                  key={`${item.tipoPolarizado}-${index}`}
                  className="border-b border-slate-200 transition hover:bg-slate-50"
                >
                  <td className="p-4 font-semibold text-slate-800">
                    {item.tipoPolarizado}
                  </td>
                  <td className="p-4 text-center text-slate-600">
                    {etiquetaDetalle(item)}
                  </td>
                  <td className="p-4 text-center text-slate-600">
                    {anchoLabel(item.ancho)}
                  </td>
                  <td className="p-4 text-center font-bold text-blue-600">
                    {item.cantidadRollos}
                  </td>
                  <td className="p-4 text-center">
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                      Pendiente
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => eliminarDetalle(index)}
                      className="rounded-lg bg-red-100 p-2 text-red-700 transition hover:bg-red-200"
                      title="Eliminar material"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PedidoDetalleTable;
