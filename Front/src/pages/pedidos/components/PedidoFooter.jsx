import {
  Save,
  X,
  Boxes,
  FileText,
} from "lucide-react";

function PedidoFooter({detalles,totalRollos,guardarPedido,}) {
  return (

    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">

        {/* Resumen */}

        <div className="grid grid-cols-2 gap-8">

          <div className="flex items-center gap-3">

            <div className="bg-blue-100 p-3 rounded-xl">

              <FileText
                size={22}
                className="text-blue-600"
              />

            </div>

            <div>

              <p className="text-sm text-slate-500">
                Referencias
              </p>

              <h2 className="text-3xl font-bold text-slate-800">
                {detalles.length}
              </h2>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <div className="bg-green-100 p-3 rounded-xl">

              <Boxes
                size={22}
                className="text-green-600"
              />

            </div>

            <div>

              <p className="text-sm text-slate-500">
                Total Rollos
              </p>

              <h2 className="text-3xl font-bold text-green-600">
                {totalRollos}
              </h2>

            </div>

          </div>

        </div>

        {/* Botones */}

        <div className="flex gap-3">

          <button
            type="button"
            className="
              px-5
              py-3
              rounded-xl
              border
              border-slate-300
              text-slate-700
              hover:bg-slate-100
              transition
              flex
              items-center
              gap-2
            "
          >

            <X size={18} />

            Cancelar

          </button>

          <button
            type="button"
            onClick={guardarPedido}
            className="
              px-6
              py-3
              rounded-xl
              bg-green-600
              hover:bg-green-700
              text-white
              font-semibold
              transition
              flex
              items-center
              gap-2
              shadow-lg
            "
          >

            <Save size={20} />

            Guardar Pedido

          </button>

        </div>

      </div>

    </div>

  );

}

export default PedidoFooter;
