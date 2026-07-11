import { Package } from "lucide-react";

function PedidoHeader() {

  return (

    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

      <div className="flex justify-between items-center">

        <div className="flex items-center gap-4">

          <div className="bg-blue-100 p-4 rounded-2xl">

            <Package
              size={32}
              className="text-blue-600"
            />

          </div>

          <div>

            <h1 className="text-3xl font-bold text-slate-800">
              Nuevo Pedido
            </h1>

            <p className="text-slate-500">
              Registro de pedidos al proveedor
            </p>

          </div>

        </div>

        <div className="flex gap-3">

          <div className="bg-slate-100 rounded-xl px-5 py-3">

            <p className="text-xs text-slate-500">
              Estado
            </p>

            <span className="font-semibold text-blue-600">
              BORRADOR
            </span>

          </div>

          <div className="bg-slate-100 rounded-xl px-5 py-3">

            <p className="text-xs text-slate-500">
              Fecha
            </p>

            <span className="font-semibold">
              {new Date().toLocaleDateString()}
            </span>

          </div>

        </div>

      </div>

    </div>

  );

}

export default PedidoHeader;