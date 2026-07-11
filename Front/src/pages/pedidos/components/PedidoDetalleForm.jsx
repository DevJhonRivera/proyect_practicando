import { Boxes, Plus } from "lucide-react";
import {
  anchoValue,
  anchosPulgadas,
} from "../../../utils/anchos";
import {
  etiquetaClasificacion,
  etiquetaUnidad,
  materialesCatalogo,
  opcionesPorMaterial,
  sufijoUnidad,
  UNIDAD_NINGUNA,
  unidadPorMaterial,
} from "../../../utils/materiales";

function PedidoDetalleForm({
  detalle,
  setDetalle,
  agregarDetalle,
}) {
  const unidadMedida =
    detalle.unidadMedida ||
    unidadPorMaterial(detalle.tipoPolarizado);

  const opcionesClasificacion =
    opcionesPorMaterial(detalle.tipoPolarizado);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Boxes
              size={22}
              className="text-blue-600"
            />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Agregar Material
            </h2>

            <p className="text-sm text-slate-500">
              Agregue las referencias solicitadas en este pedido.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 grid lg:grid-cols-5 gap-5">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">
            Material
          </label>

          <select
            value={detalle.tipoPolarizado}
            onChange={(event) => {
              const tipoPolarizado =
                event.target.value;

              setDetalle({
                ...detalle,
                tipoPolarizado,
                unidadMedida:
                  unidadPorMaterial(tipoPolarizado),
                porcentaje:
                  unidadPorMaterial(tipoPolarizado) ===
                  UNIDAD_NINGUNA
                    ? 0
                    : "",
              });
            }}
            className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">
              Seleccione...
            </option>

            {materialesCatalogo.map((grupo) => (
              <optgroup
                key={grupo.categoria}
                label={grupo.categoria}
              >
                {grupo.materiales.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">
            {etiquetaUnidad(unidadMedida)}
          </label>

          {unidadMedida === UNIDAD_NINGUNA ? (
            <div className="w-full border rounded-xl p-3 bg-slate-100 text-slate-500">
              Sin clasificacion
            </div>
          ) : (
            <select
              value={detalle.porcentaje}
              onChange={(event) =>
                setDetalle({
                  ...detalle,
                  porcentaje: event.target.value,
                  unidadMedida,
                })
              }
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">
                {sufijoUnidad(unidadMedida)}
              </option>

              {opcionesClasificacion.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {etiquetaClasificacion(
                    item,
                    unidadMedida
                  )}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">
            Ancho
          </label>

          <select
            value={detalle.ancho}
            onChange={(event) =>
              setDetalle({
                ...detalle,
                ancho: event.target.value,
              })
            }
            className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {anchosPulgadas.map((item) => (
              <option
                key={item.value}
                value={anchoValue(item.value)}
              >
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">
            Cantidad Rollos
          </label>

          <input
            type="number"
            min="1"
            value={detalle.cantidadRollos}
            onChange={(event) =>
              setDetalle({
                ...detalle,
                cantidadRollos: event.target.value,
              })
            }
            placeholder="0"
            className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={agregarDetalle}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 flex justify-center items-center gap-2 font-semibold transition"
          >
            <Plus size={20} />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default PedidoDetalleForm;
