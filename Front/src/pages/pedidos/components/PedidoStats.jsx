import {
  Boxes,
  Package,
  Truck,
  Layers
} from "lucide-react";

function PedidoStats({
  pedido,
  detalles,
  totalRollos
}) {

  return (

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

      {/* REFERENCIAS */}

      <div className="metric-card bg-white rounded-2xl shadow-sm border p-5">

        <div className="flex justify-between items-center gap-3">

          <div className="min-w-0 flex-1">

            <p className="text-sm text-slate-500">
              Referencias
            </p>

            <h2 className="metric-value font-bold text-slate-800 mt-2">
              {detalles.length}
            </h2>

          </div>

          <div className="shrink-0 bg-blue-100 p-3 rounded-xl">

            <Layers
              className="text-blue-600"
              size={30}
            />

          </div>

        </div>

      </div>

      {/* ROLLOS */}

      <div className="metric-card bg-white rounded-2xl shadow-sm border p-5">

        <div className="flex justify-between items-center gap-3">

          <div className="min-w-0 flex-1">

            <p className="text-sm text-slate-500">
              Rollos Solicitados
            </p>

            <h2 className="metric-value font-bold text-green-600 mt-2">
              {totalRollos}
            </h2>

          </div>

          <div className="shrink-0 bg-green-100 p-3 rounded-xl">

            <Boxes
              className="text-green-600"
              size={30}
            />

          </div>

        </div>

      </div>

      {/* PROVEEDOR */}

      <div className="metric-card bg-white rounded-2xl shadow-sm border p-5">

        <div className="flex justify-between items-center gap-3">

          <div className="min-w-0 flex-1">

            <p className="text-sm text-slate-500">
              Proveedor
            </p>

            <h2 className="max-w-full truncate text-xl font-bold text-slate-800 mt-2">

              {
                pedido.proveedor ||
                "Sin asignar"
              }

            </h2>

          </div>

          <div className="shrink-0 bg-orange-100 p-3 rounded-xl">

            <Truck
              className="text-orange-600"
              size={30}
            />

          </div>

        </div>

      </div>

      {/* CÓDIGO */}

      <div className="metric-card bg-white rounded-2xl shadow-sm border p-5">

        <div className="flex justify-between items-center gap-3">

          <div className="min-w-0 flex-1">

            <p className="text-sm text-slate-500">
              Código Pedido
            </p>

            <h2 className="max-w-full break-words text-xl font-bold text-slate-800 mt-2">

              {
                pedido.codigoPedido ||
                "Pendiente"
              }

            </h2>

          </div>

          <div className="shrink-0 bg-purple-100 p-3 rounded-xl">

            <Package
              className="text-purple-600"
              size={30}
            />

          </div>

        </div>

      </div>

    </div>

  );

}

export default PedidoStats;
