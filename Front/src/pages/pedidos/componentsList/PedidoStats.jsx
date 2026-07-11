import {
  ShoppingCart,
  Clock3,
  Truck,
  CheckCircle2,
} from "lucide-react";

function PedidoStatsCard({
  icon: Icon,
  titulo,
  valor,
  color,
  fondo,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

      <div className="flex justify-between items-center">

        <div>

          <p className="text-sm text-slate-500">
            {titulo}
          </p>

          <h2 className="text-4xl font-bold text-slate-800 mt-2">
            {valor}
          </h2>

        </div>

        <div className={`${fondo} p-4 rounded-2xl`}>

          <Icon
            size={32}
            className={color}
          />

        </div>

      </div>

    </div>
  );
}

function PedidoStats({ pedidos }) {

  const total = pedidos.length;

  const pendientes = pedidos.filter(
    (p) => p.estado === "PENDIENTE"
  ).length;

  const parciales = pedidos.filter(
    (p) => p.estado === "PARCIAL"
  ).length;

  const completados = pedidos.filter(
    (p) => p.estado === "COMPLETADO"
  ).length;

  return (

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

      <PedidoStatsCard
        icon={ShoppingCart}
        titulo="Total Pedidos"
        valor={total}
        color="text-blue-600"
        fondo="bg-blue-100"
      />

      <PedidoStatsCard
        icon={Clock3}
        titulo="Pendientes"
        valor={pendientes}
        color="text-yellow-600"
        fondo="bg-yellow-100"
      />

      <PedidoStatsCard
        icon={Truck}
        titulo="Parciales"
        valor={parciales}
        color="text-orange-600"
        fondo="bg-orange-100"
      />

      <PedidoStatsCard
        icon={CheckCircle2}
        titulo="Completados"
        valor={completados}
        color="text-green-600"
        fondo="bg-green-100"
      />

    </div>

  );

}

export default PedidoStats;
