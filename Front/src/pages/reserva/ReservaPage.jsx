import {
  useEffect,
  useState
} from "react";

import Swal from "sweetalert2";

import {
  Search,
  Package,
  Layers,
  Filter,
  Clock3,
  ShoppingCart
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  getReserva,
  getReabastecimiento,
  moverUso
} from "../../api/rollos.api";
import ExcelButton from "../../components/ui/ExcelButton";
import TablePagination from "../../components/ui/TablePagination";
import { usePagination } from "../../hooks/usePagination";
import { anchoLabel } from "../../utils/anchos";
import { etiquetaDetalle } from "../../utils/materiales";

function ReservaPage() {
  const navigate = useNavigate();

  const [rollos, setRollos] =
    useState([]);

  const [loading, setLoading] =
    useState(true);
  const [reabastecimiento, setReabastecimiento] = useState([]);

  const [search, setSearch] =
    useState("");

  const [material, setMaterial] =
    useState("TODOS");

  const [porcentaje, setPorcentaje] =
    useState("TODOS");

  const cargar = async () => {

    try {

      const [res, reabastecimientoRes] = await Promise.all([
        getReserva(),
        getReabastecimiento(),
      ]);

      setRollos(
        res.data.data || []
      );
      setReabastecimiento(reabastecimientoRes.data.data || []);

    } catch (error) {

      console.error(error);

      Swal.fire({
        icon: "error",
        title:
          "Error cargando reservas"
      });

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    let active = true;

    const cargarInicial = async () => {
      try {
        const [res, reabastecimientoRes] = await Promise.all([
          getReserva(),
          getReabastecimiento(),
        ]);

        if (active) {
          setRollos(
            res.data.data || []
          );
          setReabastecimiento(reabastecimientoRes.data.data || []);
        }
      } catch (error) {
        console.error(error);

        Swal.fire({
          icon: "error",
          title:
            "Error cargando reservas"
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    cargarInicial();

    return () => {
      active = false;
    };
  }, []);

  const pasar = async (rollo) => {

    const tieneCostoAsignado =
      Boolean(rollo.costeoPedidoId) &&
      Number(rollo.costoUnitarioCop || 0) > 0 &&
      Number(rollo.costoPorMetroCop || 0) > 0;

    if (!tieneCostoAsignado) {
      await Swal.fire({
        icon: "warning",
        title: "Rollo sin costo",
        text: `El rollo ${rollo.codigoRollo} todavía no tiene un costo asignado. Primero debes costear el pedido para poder pasarlo a uso.`,
        confirmButtonText: "Entendido"
      });

      return;
    }

    const result =
      await Swal.fire({

        icon: "question",

        title:
          "¿Pasar a uso?",

        text:
          "El rollo quedará disponible para realizar cortes",

        showCancelButton:
          true,

        confirmButtonText:
          "Sí, pasar",

        cancelButtonText:
          "Cancelar"

      });

    if (!result.isConfirmed)
      return;

    try {

      await moverUso(rollo._id);

      Swal.fire({

        icon: "success",

        title:
          "Rollo enviado a uso"

      });

      cargar();

    } catch (error) {

      Swal.fire({

        icon: "error",

        title:
          "No se pudo pasar a uso",

        text:
          error.response?.data?.message ||
          "Ocurrió un error al actualizar el rollo"

      });

    }

  };

  const materiales = [

    "TODOS",

    ...new Set(
      rollos.map(
        r => r.tipoPolarizado
      )
    )

  ];

  const porcentajes = [

    "TODOS",

    ...new Set(
      rollos.map(
        r =>
          String(
            r.porcentaje
          )
      )
    )

  ];

  const filtrados =
    rollos.filter(r => {

      const coincideBusqueda =

        r.codigoRollo
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )

        ||

        r.tipoPolarizado
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const coincideMaterial =

        material === "TODOS"

        ||

        r.tipoPolarizado ===
        material;

      const coincidePorcentaje =

        porcentaje ===
        "TODOS"

        ||

        String(
          r.porcentaje
        ) === porcentaje;

      return (

        coincideBusqueda &&

        coincideMaterial &&

        coincidePorcentaje

      );

    });

  const pagination = usePagination(filtrados);

  const totalMetros =
    filtrados.reduce(

      (acc, item) =>

        acc +
        (
          item.largoDisponible ||
          0
        ),

      0

    );

  const excelColumns = [
    {
      header: "Codigo",
      value: (rollo) => rollo.codigoRollo,
    },
    {
      header: "Material",
      value: (rollo) => rollo.tipoPolarizado,
      width: 24,
    },
    {
      header: "Clasificacion",
      value: etiquetaDetalle,
    },
    {
      header: "Ancho",
      value: (rollo) => anchoLabel(rollo.ancho),
    },
    {
      header: "Metros disponibles",
      value: (rollo) => rollo.largoDisponible || 0,
    },
    {
      header: "Estado",
      value: () => "RESERVA",
    },
  ];

  return (

    <div className="space-y-6">

      {/* Header */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Package size={24} />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Rollos en bodega
            </h1>

            <p className="text-sm text-slate-500">
              Material guardado y listo para pasar a uso.
            </p>
          </div>
        </div>

      </div>

      {/* KPIs */}

      <div
        className="
        grid
        md:grid-cols-3
        gap-5"
      >

        <div
          className="
          metric-card
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
          p-5"
        >

          <div
            className="
            flex
            items-center
            gap-3"
          >

            <Package
              className="
              text-blue-600"
            />

            <div className="min-w-0 flex-1">

              <p className="text-slate-500">
                Rollos
              </p>

              <h2 className="metric-value font-bold">
                {filtrados.length}
              </h2>

            </div>

          </div>

        </div>

        <div
          className="
          metric-card
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
          p-5"
        >

          <div
            className="
            flex
            items-center
            gap-3"
          >

            <Layers
              className="
              text-green-600"
            />

            <div className="min-w-0 flex-1">

              <p className="text-slate-500">
                Metros Disponibles
              </p>

              <h2 className="metric-value font-bold">
                {Number(totalMetros || 0).toFixed(2)} m
              </h2>

            </div>

          </div>

        </div>

        <div
          className="
          metric-card
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
          p-5"
        >

          <div
            className="
            flex
            items-center
            gap-3"
          >

            <Filter
              className="
              text-purple-600"
            />

            <div className="min-w-0 flex-1">

              <p className="text-slate-500">
                Materiales
              </p>

              <h2 className="metric-value font-bold">
                {
                  materiales.length - 1
                }
              </h2>

            </div>

          </div>

        </div>

      </div>

      <ReabastecimientoPanel
        items={reabastecimiento}
        onCreateOrder={() => navigate("/pedidos/nuevo")}
      />

      {/* Filtros */}

      <div
        className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
        p-5"
      >

        <div
          className="
          grid
          md:grid-cols-3
          gap-4"
        >

          <div
            className="
            relative"
          >

            <Search
              size={18}
              className="
              absolute
              left-3
              top-3.5
              text-slate-400"
            />

            <input
              type="text"
              placeholder="Buscar código o material..."
              value={search}
              onChange={(e)=>
                setSearch(
                  e.target.value
                )
              }
              className="
              w-full
              border
              rounded-xl
              border-slate-200
              p-3
              pl-10"
            />

          </div>

          <select
            value={material}
            onChange={(e)=>
              setMaterial(
                e.target.value
              )
            }
            className="
            border
            rounded-xl
            border-slate-200
            p-3"
          >

            {materiales.map(
              item => (

              <option
                key={item}
                value={item}
              >
                {item}
              </option>

            ))}

          </select>

          <select
            value={porcentaje}
            onChange={(e)=>
              setPorcentaje(
                e.target.value
              )
            }
            className="
            border
            rounded-xl
            border-slate-200
            p-3"
          >

            {porcentajes.map(
              item => (

              <option
                key={item}
                value={item}
              >
                {item === "TODOS"
                  ? item
                  : etiquetaDetalle({
                      porcentaje: item,
                      tipoPolarizado: material === "TODOS"
                        ? ""
                        : material,
                    })}
              </option>

            ))}

          </select>

        </div>

      </div>

      {/* Tabla */}

      <div
        className="
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
        overflow-hidden"
      >

        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-4">

          <h2
            className="
            font-semibold
            text-lg"
          >
            Rollos en bodega
          </h2>

          <ExcelButton
            title="Rollos en Bodega"
            fileName="rollos-reserva"
            sheetName="Bodega"
            columns={excelColumns}
            rows={filtrados}
          />

        </div>

        {loading ? (

          <div className="p-10 text-center">
            Cargando...
          </div>

        ) : filtrados.length === 0 ? (

          <div className="p-10 text-center">

            <Package
              size={60}
              className="
              mx-auto
              text-slate-300"
            />

            <p className="mt-4 text-slate-500">
              No existen rollos en reserva
            </p>

          </div>

        ) : (

          <>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">

            <thead
              className="
              bg-slate-50
              text-xs
              uppercase
              text-slate-500"
            >

              <tr>

                <th className="p-4 text-left">
                  Código
                </th>

                <th className="p-4 text-left">
                  Material
                </th>

                <th className="p-4 text-left">
                  Clasificacion
                </th>

                <th className="p-4 text-left">
                  Ancho
                </th>

                <th className="p-4 text-left">
                  Metros
                </th>

                <th className="p-4 text-left">
                  Estado
                </th>

                <th className="p-4 text-center">
                  Acción
                </th>

              </tr>

            </thead>

            <tbody>

              {pagination.pageItems.map(
                rollo => (

                <tr
                  key={rollo._id}
                  className="
                  border-b
                   border-slate-200
                   hover:bg-slate-50"
                >

                  <td className="p-4 font-medium">
                    {
                      rollo.codigoRollo
                    }
                  </td>

                  <td className="p-4">
                    {
                      rollo.tipoPolarizado
                    }
                  </td>

                  <td className="p-4">
                    {etiquetaDetalle(rollo)}
                  </td>

                  <td className="p-4">
                    {
                      anchoLabel(rollo.ancho)
                    }
                  </td>

                  <td className="p-4">
                    {Number(rollo.largoDisponible || 0).toFixed(2)} m
                  </td>

                  <td className="p-4">

                    <span
                      className="
                      bg-yellow-100
                      text-yellow-700
                      px-3
                      py-1
                      rounded-full
                      text-sm"
                    >
                      BODEGA
                    </span>

                  </td>

                  <td className="p-4 text-center">

                    <button
                      onClick={() =>
                        pasar(
                          rollo
                        )
                      }
                      className="
                      bg-blue-600
                      hover:bg-blue-700
                      text-white
                      px-4
                      py-2
                      rounded-lg"
                    >
                      Pasar a uso
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>
          </div>
          <TablePagination pagination={pagination} />
          </>

        )}

      </div>

    </div>

  );

}

export default ReservaPage;

function ReabastecimientoPanel({ items, onCreateOrder }) {
  const visibles = items.filter((item) => item.estado !== "SUFICIENTE");
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Clock3 size={20} /></div><div><h2 className="font-bold text-slate-900">Plan de reabastecimiento</h2><p className="text-sm text-slate-500">Calculado con consumo de 90 días, tiempo de entrega y 7 días de seguridad.</p></div></div>
        <button type="button" onClick={onCreateOrder} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"><ShoppingCart size={17} />Crear pedido</button>
      </div>
      {visibles.length === 0 ? <p className="p-6 text-center text-sm font-semibold text-emerald-700">El inventario tiene cobertura suficiente según el consumo registrado.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-sm"><thead className="bg-white text-xs uppercase text-slate-500"><tr><th className="p-4 text-left">Material</th><th className="p-4 text-left">Stock</th><th className="p-4 text-left">Consumo diario</th><th className="p-4 text-left">Lead time</th><th className="p-4 text-left">Cobertura</th><th className="p-4 text-left">Sugerencia</th><th className="p-4 text-left">Estado</th></tr></thead><tbody>{visibles.map((item) => <tr key={item.clave} className="border-t border-slate-100"><td className="p-4"><p className="font-bold text-slate-800">{item.tipoPolarizado} {etiquetaDetalle(item)}</p><p className="text-xs text-slate-500">{anchoLabel(item.ancho)} · {item.rollosReserva} en reserva / {item.rollosUso} en uso</p></td><td className="p-4 font-bold">{Number(item.stockMetros).toFixed(2)} m</td><td className="p-4">{Number(item.consumoDiario).toFixed(2)} m/día</td><td className="p-4">{item.leadTimeDias} días{item.leadTimeEstimado ? <span className="block text-xs text-amber-600">Estimado hasta tener historial</span> : null}</td><td className="p-4">{item.coberturaDias === null ? "Sin consumo aún" : `${item.coberturaDias} días`}</td><td className="p-4 font-bold text-blue-700">{item.cantidadSugerida ? `${item.cantidadSugerida} rollo(s)` : "Observar"}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.estado === "PEDIR_AHORA" ? "bg-red-100 text-red-700" : item.estado === "PEDIR_PRONTO" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{item.estado.replaceAll("_", " ")}</span></td></tr>)}</tbody></table></div>}
    </section>
  );
}
