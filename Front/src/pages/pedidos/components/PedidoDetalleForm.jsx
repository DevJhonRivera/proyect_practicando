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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3">
            <Boxes
              size={22}
              className="text-blue-600"
            />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Agregar material
            </h2>

            <p className="text-sm text-slate-500">
              Agregue las referencias solicitadas en este pedido.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6 lg:grid-cols-5">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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
            className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {etiquetaUnidad(unidadMedida)}
          </label>

          {unidadMedida === UNIDAD_NINGUNA ? (
            <div className="w-full rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-500">
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
              className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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
            className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cantidad rollos
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
            className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={agregarDetalle}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
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
