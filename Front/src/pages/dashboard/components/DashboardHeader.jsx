import {
  RefreshCw,
  CalendarDays,
  Clock,
  LayoutDashboard
} from "lucide-react";

function DashboardHeader({ actualizar }) {

  const usuario = JSON.parse(
    localStorage.getItem("usuario")
  );

  const fecha = new Date();

  const fechaActual =
    fecha.toLocaleDateString(
      "es-CO",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }
    );

  const hora =
    fecha.toLocaleTimeString(
      "es-CO",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  return (

    <div
      className="
      bg-gradient-to-r
      from-blue-700
      via-blue-600
      to-indigo-700
      rounded-3xl
      shadow-xl
      overflow-hidden"
    >

      <div
        className="
        p-8
        flex
        flex-col
        lg:flex-row
        justify-between
        gap-8"
      >

        {/* Informacion */}

        <div className="text-white">

          <div className="flex items-center gap-3 mb-4">

            <LayoutDashboard
              size={38}
            />

            <div>

              <h1
                className="
                text-4xl
                font-bold"
              >
                Inicio
              </h1>

              <p
                className="
                text-blue-100"
              >
                Flujo diario de compras, inventario y cortes
              </p>

            </div>

          </div>

          <div
            className="
            mt-8
            space-y-3"
          >

            <div
              className="
              flex
              items-center
              gap-2"
            >

              <CalendarDays
                size={18}
              />

              <span>

                {fechaActual}

              </span>

            </div>

            <div
              className="
              flex
              items-center
              gap-2"
            >

              <Clock
                size={18}
              />

              <span>

                Ultima actualizacion

                {" "}

                {hora}

              </span>

            </div>

            <div
              className="
              mt-4
              text-lg"
            >

              Bienvenido,

              {" "}

              <strong>

                {usuario?.nombre ||
                  "Administrador"}

              </strong>

            </div>

          </div>

        </div>

        {/* Boton */}

        <div
          className="
          flex
          items-start
          lg:items-center"
        >

          <button

            onClick={actualizar}

            className="
            bg-white
            text-blue-700
            hover:bg-blue-50
            transition
            font-semibold
            rounded-xl
            px-6
            py-4
            flex
            items-center
            gap-3
            shadow-lg"

          >

            <RefreshCw
              size={20}
            />

            Actualizar inicio

          </button>

        </div>

      </div>

      {/* Footer */}

      <div
        className="
        bg-black/10
        border-t
        border-white/10
        px-8
        py-4
        text-blue-100
        flex
        flex-wrap
        justify-between
        text-sm"
      >

        <span>

          Polarizados YA 2026

        </span>

        <span>

          Pedido / Entrada / Bodega / Uso / Corte / Rentabilidad

        </span>

      </div>

    </div>

  );

}

export default DashboardHeader;
