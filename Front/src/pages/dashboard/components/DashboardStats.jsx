import {
  Package,
  Ruler,
  Wrench,
  Archive,
  Truck,
  XCircle
} from "lucide-react";

function DashboardStats({ indicadores }) {

  const cards = [

    {
      titulo: "Total rollos",
      valor: indicadores.totalRollos || 0,
      icono: Package,
      color: "from-blue-600 to-blue-800",
      descripcion: "Rollos registrados"
    },

    {
      titulo: "Metros disponibles",
      valor: `${Number(indicadores.metrosDisponibles || 0).toFixed(2)} m`,
      icono: Ruler,
      color: "from-green-500 to-emerald-700",
      descripcion: "Inventario disponible"
    },

    {
      titulo: "En Uso",
      valor: indicadores.enUso || 0,
      icono: Wrench,
      color: "from-orange-500 to-red-500",
      descripcion: "Rollos activos para cortes"
    },

    {
      titulo: "Bodega",
      valor: indicadores.reserva || 0,
      icono: Archive,
      color: "from-purple-600 to-indigo-700",
      descripcion: "Rollos guardados"
    },

    {
      titulo: "Entrada",
      valor: indicadores.recepcion || 0,
      icono: Truck,
      color: "from-cyan-500 to-sky-700",
      descripcion: "Pendientes de clasificar"
    },

    {
      titulo: "Agotados",
      valor: indicadores.agotados || 0,
      icono: XCircle,
      color: "from-red-600 to-red-800",
      descripcion: "Sin metros disponibles"
    }

  ];

  return (

    <div
      className="
      grid
      gap-6
      sm:grid-cols-2
      xl:grid-cols-4"
    >

      {cards.map((card, index) => {

        const Icon = card.icono;

        return (

          <div

            key={index}

            className="
            relative
            overflow-hidden
            rounded-2xl
            shadow-lg
            hover:shadow-2xl
            transition-all
            duration-300
            hover:-translate-y-1"

          >

            <div

              className={`
                bg-gradient-to-br
                ${card.color}
                p-6
                text-white
                h-full
              `}

            >

              <div className="flex justify-between items-start">

                <div>

                  <p
                    className="
                    text-sm
                    opacity-90"
                  >

                    {card.titulo}

                  </p>

                  <h2
                    className="
                    text-4xl
                    font-bold
                    mt-3"
                  >

                    {card.valor}

                  </h2>

                  <p
                    className="
                    text-sm
                    mt-4
                    opacity-90"
                  >

                    {card.descripcion}

                  </p>

                </div>

                <div
                  className="
                  bg-white/20
                  p-3
                  rounded-xl"
                >

                  <Icon size={34} />

                </div>

              </div>

              <div
                className="
                absolute
                -right-8
                -bottom-8
                opacity-10"
              >

                <Icon size={120} />

              </div>

            </div>

          </div>

        );

      })}

    </div>

  );

}

export default DashboardStats;
