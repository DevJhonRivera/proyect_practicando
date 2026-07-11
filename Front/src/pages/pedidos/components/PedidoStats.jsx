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

      <div className="bg-white rounded-2xl shadow-sm border p-5">

        <div className="flex justify-between items-center">

          <div>

            <p className="text-sm text-slate-500">
              Referencias
            </p>

            <h2 className="text-4xl font-bold text-slate-800 mt-2">
              {detalles.length}
            </h2>

          </div>

          <div className="bg-blue-100 p-3 rounded-xl">

            <Layers
              className="text-blue-600"
              size={30}
            />

          </div>

        </div>

      </div>

      {/* ROLLOS */}

      <div className="bg-white rounded-2xl shadow-sm border p-5">

        <div className="flex justify-between items-center">

          <div>

            <p className="text-sm text-slate-500">
              Rollos Solicitados
            </p>

            <h2 className="text-4xl font-bold text-green-600 mt-2">
              {totalRollos}
            </h2>

          </div>

          <div className="bg-green-100 p-3 rounded-xl">

            <Boxes
              className="text-green-600"
              size={30}
            />

          </div>

        </div>

      </div>

      {/* PROVEEDOR */}

      <div className="bg-white rounded-2xl shadow-sm border p-5">

        <div className="flex justify-between items-center">

          <div>

            <p className="text-sm text-slate-500">
              Proveedor
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-2 truncate">

              {
                pedido.proveedor ||
                "Sin asignar"
              }

            </h2>

          </div>

          <div className="bg-orange-100 p-3 rounded-xl">

            <Truck
              className="text-orange-600"
              size={30}
            />

          </div>

        </div>

      </div>

      {/* CÓDIGO */}

      <div className="bg-white rounded-2xl shadow-sm border p-5">

        <div className="flex justify-between items-center">

          <div>

            <p className="text-sm text-slate-500">
              Código Pedido
            </p>

            <h2 className="text-xl font-bold text-slate-800 mt-2">

              {
                pedido.codigoPedido ||
                "Pendiente"
              }

            </h2>

          </div>

          <div className="bg-purple-100 p-3 rounded-xl">

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