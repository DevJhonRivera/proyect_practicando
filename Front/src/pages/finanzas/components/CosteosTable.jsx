import {
  formatoCop,
  formatoNumero,
} from "../finanzas.helpers";
import ExcelButton from "../../../components/ui/ExcelButton";

function CosteosTable({ costeos, onSelectPedido }) {
  const excelColumns = [
    {
      header: "Pedido",
      value: (costeo) =>
        costeo.pedidoId?.codigoPedido || "Pedido",
    },
    {
      header: "Proveedor",
      value: (costeo) => costeo.pedidoId?.proveedor || "",
      width: 24,
    },
    {
      header: "Moneda",
      value: (costeo) => costeo.moneda,
    },
    {
      header: "TRM",
      value: (costeo) => Number(costeo.trm || 0),
    },
    {
      header: "TRM flete",
      value: (costeo) =>
        Number(costeo.trmFlete || costeo.trm || 0),
    },
    {
      header: "Total COP",
      value: (costeo) => Number(costeo.totalCop || 0),
    },
    {
      header: "Promedio rollo",
      value: (costeo) =>
        Number(costeo.costoPromedioRolloCop || 0),
    },
    {
      header: "Estado",
      value: (costeo) => costeo.estado,
    },
  ];

  return (
    <section className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800">
          Pedidos costeados
        </h2>

        <ExcelButton
          title="Pedidos Costeados"
          fileName="pedidos-costeados"
          sheetName="Finanzas"
          columns={excelColumns}
          rows={costeos}
        />
      </div>

      {costeos.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          Aun no hay pedidos costeados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-4 text-left">Pedido</th>
                <th className="p-4 text-left">Proveedor</th>
                <th className="p-4 text-left">Moneda</th>
                <th className="p-4 text-left">Total COP</th>
                <th className="p-4 text-left">Promedio rollo</th>
                <th className="p-4 text-left">Estado</th>
                <th className="p-4 text-center">Accion</th>
              </tr>
            </thead>
            <tbody>
              {costeos.map((costeo) => (
                <tr
                  key={costeo._id}
                  className="border-t hover:bg-slate-50 cursor-pointer"
                  onClick={() =>
                    onSelectPedido(
                      costeo.pedidoId?._id || costeo.pedidoId
                    )
                  }
                >
                  <td className="p-4 font-semibold">
                    {costeo.pedidoId?.codigoPedido || "Pedido"}
                  </td>
                  <td className="p-4">
                    {costeo.pedidoId?.proveedor || "-"}
                  </td>
                  <td className="p-4">
                    {costeo.moneda}
                    {costeo.moneda === "USD" && (
                      <span className="block text-xs text-slate-400">
                        Prod.{" "}
                        {formatoNumero.format(costeo.trm || 0)}
                        {" / "}Flete{" "}
                        {formatoNumero.format(
                          costeo.trmFlete || costeo.trm || 0
                        )}
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-blue-700">
                    {formatoCop.format(costeo.totalCop || 0)}
                  </td>
                  <td className="p-4">
                    {formatoCop.format(
                      costeo.costoPromedioRolloCop || 0
                    )}
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      {costeo.estado}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 bg-slate-100">
                      Editar
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default CosteosTable;
