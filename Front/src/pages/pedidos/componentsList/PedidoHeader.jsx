import { Plus, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

function PedidoHeader() {

  const navigate = useNavigate();

  return (

    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">

        {/* Información */}

        <div className="flex items-center gap-4">

          <div className="bg-blue-100 p-4 rounded-2xl">

            <ShoppingCart
              size={34}
              className="text-blue-600"
            />

          </div>

          <div>

            <h1 className="text-3xl font-bold text-slate-800">
              Pedidos de Compra
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

          className="
            bg-blue-600
            hover:bg-blue-700
            text-white
            px-6
            py-3
            rounded-xl
            flex
            items-center
            gap-2
            font-semibold
            transition-all
            shadow-md
          "

        >

          <Plus size={20} />

          Nuevo Pedido

        </button>

      </div>

    </div>

  );

}

export default PedidoHeader;