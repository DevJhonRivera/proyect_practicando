import { Boxes, Plus } from "lucide-react";
import {
  anchoValue,
  anchosPulgadas,
} from "../../../utils/anchos";
import {
  etiquetaClasificacion,
  etiquetaUnidad,
  esMaterialPpf,
  MATERIAL_PPF,
  materialPpfConReferencia,
  materialesCatalogo,
  MICRAJES_SEGURIDAD,
  obtenerReferenciaPpf,
  opcionesPorMaterial,
  PORCENTAJES_POLARIZADO,
  REFERENCIA_PPF,
  sufijoUnidad,
  UNIDAD_MICRAS,
  UNIDAD_NINGUNA,
  UNIDAD_PORCENTAJE,
  unidadPorMaterial,
} from "../../../utils/materiales";

const OPCION_NUEVA = "__NUEVA__";
const OPCION_OTRA = "__OTRA__";

function PedidoDetalleForm({
  detalle,
  setDetalle,
  agregarDetalle,
}) {
  const unidadMedida =
    detalle.unidadMedida ||
    unidadPorMaterial(detalle.tipoPolarizado);
  const materialEsPpf = esMaterialPpf(
    detalle.tipoPolarizado
  );
  const referenciaPpf = obtenerReferenciaPpf(
    detalle.tipoPolarizado
  );

  const opcionesClasificacion = detalle.esMaterialNuevo
    ? unidadMedida === UNIDAD_MICRAS
      ? MICRAJES_SEGURIDAD
      : PORCENTAJES_POLARIZADO
    : opcionesPorMaterial(detalle.tipoPolarizado);

  const valorMaterial = detalle.esMaterialNuevo
    ? OPCION_NUEVA
    : materialEsPpf
      ? MATERIAL_PPF
      : detalle.tipoPolarizado;

  const valorClasificacion =
    detalle.clasificacionPersonalizada
      ? OPCION_OTRA
      : detalle.porcentaje;

  const valorAncho = detalle.usaAnchoPersonalizado
    ? OPCION_OTRA
    : detalle.ancho;

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
            value={valorMaterial}
            onChange={(event) => {
              const seleccion = event.target.value;

              if (seleccion === OPCION_NUEVA) {
                setDetalle({
                  ...detalle,
                  esMaterialNuevo: true,
                  tipoPolarizado: "",
                  unidadMedida: UNIDAD_PORCENTAJE,
                  porcentaje: "",
                  clasificacionPersonalizada: false,
                });
                return;
              }

              const tipoPolarizado = seleccion;

              setDetalle({
                ...detalle,
                esMaterialNuevo: false,
                tipoPolarizado,
                unidadMedida:
                  unidadPorMaterial(tipoPolarizado),
                porcentaje:
                  unidadPorMaterial(tipoPolarizado) ===
                  UNIDAD_NINGUNA
                    ? 0
                    : "",
                clasificacionPersonalizada: false,
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

            <option value={OPCION_NUEVA}>
              + Nueva referencia...
            </option>
          </select>

          {detalle.esMaterialNuevo && (
            <div className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
              <input
                type="text"
                value={detalle.tipoPolarizado}
                onChange={(event) =>
                  setDetalle({
                    ...detalle,
                    tipoPolarizado:
                      event.target.value.toUpperCase(),
                  })
                }
                placeholder="Nombre de la nueva referencia"
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 uppercase outline-none focus:border-blue-400"
              />

              <select
                value={unidadMedida}
                onChange={(event) => {
                  const nuevaUnidad = event.target.value;

                  setDetalle({
                    ...detalle,
                    unidadMedida: nuevaUnidad,
                    porcentaje:
                      nuevaUnidad === UNIDAD_NINGUNA
                        ? 0
                        : "",
                    clasificacionPersonalizada: false,
                  });
                }}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 outline-none focus:border-blue-400"
              >
                <option value={UNIDAD_PORCENTAJE}>
                  Polarizado - porcentaje
                </option>
                <option value={UNIDAD_MICRAS}>
                  Pelicula de seguridad - micras
                </option>
                <option value={UNIDAD_NINGUNA}>
                  PPF - sin clasificacion
                </option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {materialEsPpf
              ? "Referencia PPF"
              : etiquetaUnidad(unidadMedida)}
          </label>

          {materialEsPpf ? (
            <select
              value={referenciaPpf}
              onChange={(event) =>
                setDetalle({
                  ...detalle,
                  tipoPolarizado:
                    materialPpfConReferencia(
                      event.target.value
                    ),
                  unidadMedida: UNIDAD_NINGUNA,
                  porcentaje: 0,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">
                Seleccione referencia...
              </option>
              {REFERENCIA_PPF.map((referencia) => (
                <option
                  key={referencia}
                  value={referencia}
                >
                  {referencia}
                </option>
              ))}
            </select>
          ) : unidadMedida === UNIDAD_NINGUNA ? (
            <div className="w-full rounded-xl border border-slate-200 bg-slate-100 p-3 text-slate-500">
              Sin clasificacion
            </div>
          ) : (
            <select
              value={valorClasificacion}
              onChange={(event) => {
                const seleccion = event.target.value;

                setDetalle({
                  ...detalle,
                  porcentaje:
                    seleccion === OPCION_OTRA
                      ? ""
                      : seleccion,
                  unidadMedida,
                  clasificacionPersonalizada:
                    seleccion === OPCION_OTRA,
                });
              }}
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

              <option value={OPCION_OTRA}>
                + Otra opcion...
              </option>
            </select>
          )}

          {unidadMedida !== UNIDAD_NINGUNA &&
            detalle.clasificacionPersonalizada && (
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={detalle.porcentaje}
                onChange={(event) =>
                  setDetalle({
                    ...detalle,
                    porcentaje: event.target.value,
                    unidadMedida,
                  })
                }
                placeholder={
                  unidadMedida === UNIDAD_MICRAS
                    ? "Ej. 200 micras"
                    : "Ej. 10%"
                }
                className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50/40 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />
            )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ancho
          </label>

          <select
            value={valorAncho}
            onChange={(event) => {
              const seleccion = event.target.value;

              setDetalle({
                ...detalle,
                ancho:
                  seleccion === OPCION_OTRA
                    ? ""
                    : seleccion,
                usaAnchoPersonalizado:
                  seleccion === OPCION_OTRA,
                anchoPersonalizadoPulgadas:
                  seleccion === OPCION_OTRA
                    ? ""
                    : detalle.anchoPersonalizadoPulgadas,
              });
            }}
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

            <option value={OPCION_OTRA}>
              + Otro ancho...
            </option>
          </select>

          {detalle.usaAnchoPersonalizado && (
            <input
              type="number"
              min="1"
              step="0.01"
              value={detalle.anchoPersonalizadoPulgadas}
              onChange={(event) =>
                setDetalle({
                  ...detalle,
                  anchoPersonalizadoPulgadas:
                    event.target.value,
                })
              }
              placeholder='Ancho en pulgadas, ej. 48"'
              className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50/40 p-3 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          )}
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
