import { Plus, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

function PedidoHeader() {

  const navigate = useNavigate();

  return (

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">

        {/* Información */}

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">

            <ShoppingCart
              size={24}
            />

          </div>

          <div>

            <h1 className="text-3xl font-bold text-slate-800">
              Pedidos de compra
            </h1>

            <p className="text-slate-500 mt-1">
              Administre los pedidos realizados a los proveedores.
            </p>

          </div>

        </div>

        {/* Botón */}

        <button

          onClick={() =>
            navigate("/pedidos/nuevo")
          }

          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"

        >

          <Plus size={20} />

          Nuevo Pedido

        </button>

      </div>

    </div>

  );

}

export default PedidoHeader;
