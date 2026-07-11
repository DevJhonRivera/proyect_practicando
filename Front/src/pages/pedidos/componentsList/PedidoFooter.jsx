import {
  Package,
  Boxes,
  Clock3,
} from "lucide-react";

function PedidoFooter({ pedidos }) {

  const totalPedidos =
    pedidos.length;

  const totalReferencias =
    pedidos.reduce(
      (acc, pedido) =>
        acc +
        (
          pedido.detalles?.length || 0
        ),
      0
    );

  const totalRollos =
    pedidos.reduce(
      (acc, pedido) =>

        acc +

        (
          pedido.detalles?.reduce(
            (sum, item) =>

              sum +

              Number(
                item.cantidadRollos || 0
              ),

            0
          ) || 0
        ),

      0
    );

  const pendientes =
    pedidos.filter(
      p =>
        p.estado ===
        "PENDIENTE"
    ).length;

  return (

    <div
      className="
      bg-white
      rounded-2xl
      border
      border-slate-200
      shadow-sm
      p-6"
    >

      <div
        className="
        grid
        md:grid-cols-4
        gap-6"
      >

        {/* Pedidos */}

        <div className="flex items-center gap-4">

          <div
            className="
            bg-blue-100
            p-3
            rounded-xl"
          >

            <Package
              className="text-blue-600"
            />

          </div>

          <div>

            <p className="text-sm text-slate-500">
              Pedidos
            </p>

            <h2 className="text-2xl font-bold">
              {totalPedidos}
            </h2>

          </div>

        </div>

        {/* Referencias */}

        <div className="flex items-center gap-4">

          <div
            className="
            bg-indigo-100
            p-3
            rounded-xl"
          >

            <Boxes
              className="text-indigo-600"
            />

          </div>

          <div>

            <p className="text-sm text-slate-500">
              Referencias
            </p>

            <h2 className="text-2xl font-bold">
              {totalReferencias}
            </h2>

          </div>

        </div>

        {/* Rollos */}

        <div className="flex items-center gap-4">

          <div
            className="
            bg-green-100
            p-3
            rounded-xl"
          >

            <Boxes
              className="text-green-600"
            />

          </div>

          <div>

            <p className="text-sm text-slate-500">
              Rollos Solicitados
            </p>

            <h2 className="text-2xl font-bold text-green-600">
              {totalRollos}
            </h2>

          </div>

        </div>

        {/* Pendientes */}

        <div className="flex items-center gap-4">

          <div
            className="
            bg-yellow-100
            p-3
            rounded-xl"
          >

            <Clock3
              className="text-yellow-600"
            />

          </div>

          <div>

            <p className="text-sm text-slate-500">
              Pendientes
            </p>

            <h2 className="text-2xl font-bold text-yellow-600">
              {pendientes}
            </h2>

          </div>

        </div>

      </div>

      <div
        className="
        mt-6
        pt-4
        border-t
        text-sm
        text-slate-500
        flex
        justify-between"
      >

        <span>

          Mostrando
          {" "}
          <strong>
            {pedidos.length}
          </strong>
          {" "}
          pedidos

        </span>

        <span>

          Sistema de Gestión de Inventario de Polarizados

        </span>

      </div>

    </div>

  );

}

export default PedidoFooter;