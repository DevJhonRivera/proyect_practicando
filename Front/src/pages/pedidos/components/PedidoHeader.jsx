import { Package } from "lucide-react";

function PedidoHeader() {

  return (

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex flex-wrap justify-between items-center gap-4">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">

            <Package
              size={24}
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

        <div className="flex flex-wrap gap-3">

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3">

            <p className="text-xs text-slate-500">
              Estado
            </p>

            <span className="font-semibold text-blue-600">
              BORRADOR
            </span>

          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3">

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
