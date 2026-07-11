import {
  CircleDollarSign,
  ClipboardList,
  Save,
} from "lucide-react";
import ExcelButton from "../../../components/ui/ExcelButton";
import { anchoLabel } from "../../../utils/anchos";
import { etiquetaDetalle } from "../../../utils/materiales";
import {
  formatearNumeroEntrada,
  formatoCop,
  numeroEntrada,
} from "../finanzas.helpers";

function CosteoPedidoForm({
  pedidos,
  selectedPedidoId,
  modoEdicion,
  totalPedidos,
  totalPedidosPendientes,
  form,
  totalRollosPedido,
  loadingCosteo,
  saving,
  onSelectPedido,
  onChangeField,
  onChangeDetalle,
  onSave,
}) {
  return (
    <section className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <CircleDollarSign className="text-blue-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {modoEdicion ? "Editar costeo" : "Costear pedido"}
          </h2>
          <p className="text-sm text-slate-500">
            {modoEdicion
              ? "Ajuste los costos del pedido seleccionado desde la tabla."
              : "Solo aparecen pedidos que aun no tienen costeo."}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {modoEdicion
            ? "Este pedido ya estaba costeado. Esta vista esta en modo edicion."
            : `${totalPedidosPendientes} de ${totalPedidos} pedidos estan pendientes por costear. Los ya costeados se editan desde la tabla inferior.`}
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <label className="block md:col-span-2">
            <span className="text-sm text-slate-500">
              Pedido
            </span>
            <select
              value={selectedPedidoId}
              onChange={(event) =>
                onSelectPedido(event.target.value)
              }
              className="w-full border rounded-lg p-3 mt-1"
            >
              {pedidos.length === 0 ? (
                <option value="">
                  No hay pedidos pendientes por costear
                </option>
              ) : (
                pedidos.map((pedido) => (
                  <option
                    key={pedido._id}
                    value={pedido._id}
                  >
                    {pedido.codigoPedido} - {pedido.proveedor}
                  </option>
                ))
              )}
            </select>
          </label>

          <Select
            label="Moneda"
            value={form.moneda}
            onChange={(value) =>
              onChangeField("moneda", value)
            }
            options={[
              {
                value: "COP",
                label: "COP",
              },
              {
                value: "USD",
                label: "USD",
              },
            ]}
          />

          <Input
            label="TRM productos"
            value={form.trm}
            disabled={form.moneda === "COP"}
            onChange={(value) =>
              onChangeField(
                "trm",
                formatearNumeroEntrada(value)
              )
            }
          />

          {form.moneda === "USD" && (
            <Input
              label="TRM flete"
              value={form.trmFlete}
              onChange={(value) =>
                onChangeField(
                  "trmFlete",
                  formatearNumeroEntrada(value)
                )
              }
            />
          )}

          <Input
            label="Flete"
            value={form.flete}
            hint={
              form.moneda === "USD"
                ? `En pesos: ${formatoCop.format(
                    numeroEntrada(form.flete) *
                      numeroEntrada(form.trmFlete)
                  )}`
                : ""
            }
            onChange={(value) =>
              onChangeField(
                "flete",
                formatearNumeroEntrada(value)
              )
            }
          />

          <Input
            label="Otros costos"
            value={form.otrosCostos}
            hint={
              form.moneda === "USD"
                ? `En pesos: ${formatoCop.format(
                    numeroEntrada(form.otrosCostos) *
                      numeroEntrada(form.trm)
                  )}`
                : ""
            }
            onChange={(value) =>
              onChangeField(
                "otrosCostos",
                formatearNumeroEntrada(value)
              )
            }
          />

          <Input
            label="IVA %"
            type="number"
            value={form.porcentajeIva}
            disabled={!form.aplicaIva}
            onChange={(value) =>
              onChangeField("porcentajeIva", value)
            }
          />

          <Select
            label="Repartir costos por"
            value={form.metodoProrrateoFlete}
            onChange={(value) =>
              onChangeField("metodoProrrateoFlete", value)
            }
            options={[
              {
                value: "VALOR",
                label: "Valor",
              },
              {
                value: "CANTIDAD",
                label: "Cantidad",
              },
            ]}
          />

          <Select
            label="Estado"
            value={form.estado}
            onChange={(value) =>
              onChangeField("estado", value)
            }
            options={[
              {
                value: "COSTEADO",
                label: "Costeado",
              },
              {
                value: "PENDIENTE",
                label: "Pendiente",
              },
              {
                value: "PAGADO",
                label: "Pagado",
              },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <Checkbox
            label="Aplica IVA"
            checked={form.aplicaIva}
            onChange={(checked) =>
              onChangeField("aplicaIva", checked)
            }
          />
          <Checkbox
            label="IVA incluido en precios"
            checked={form.ivaIncluido}
            disabled={!form.aplicaIva}
            onChange={(checked) =>
              onChangeField("ivaIncluido", checked)
            }
          />
        </div>

        <DetalleValores
          detalles={form.detalles}
          moneda={form.moneda}
          trm={form.trm}
          totalRollosPedido={totalRollosPedido}
          loadingCosteo={loadingCosteo}
          onChangeDetalle={onChangeDetalle}
        />

        <label className="block">
          <span className="text-sm text-slate-500">
            Observaciones
          </span>
          <textarea
            rows="3"
            value={form.observaciones}
            onChange={(event) =>
              onChangeField(
                "observaciones",
                event.target.value
              )
            }
            className="w-full border rounded-lg p-3 mt-1"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || loadingCosteo}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? "Guardando..." : "Guardar costeo"}
          </button>
        </div>
      </div>
    </section>
  );
}

function DetalleValores({
  detalles,
  moneda,
  trm,
  totalRollosPedido,
  loadingCosteo,
  onChangeDetalle,
}) {
  const excelColumns = [
    {
      header: "Material",
      value: (detalle) => detalle.tipoPolarizado,
      width: 24,
    },
    {
      header: "Clasificacion",
      value: etiquetaDetalle,
    },
    {
      header: "Ancho",
      value: (detalle) => anchoLabel(detalle.ancho),
    },
    {
      header: "Rollos",
      value: (detalle) => Number(detalle.cantidadRollos || 0),
    },
    {
      header: "Valor unitario",
      value: (detalle) => numeroEntrada(detalle.valorUnitario),
    },
  ];

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="p-4 bg-slate-50 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList
            size={20}
            className="text-blue-600"
          />
          <h3 className="font-bold text-slate-800">
            Valores por rollo
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <ExcelButton
            title="Valores por Rollo"
            fileName="valores-por-rollo"
            sheetName="Valores"
            columns={excelColumns}
            rows={detalles}
          />

          <span className="text-sm text-slate-500">
            {totalRollosPedido} rollos
          </span>
        </div>
      </div>

      {loadingCosteo ? (
        <div className="p-6 text-slate-500">
          Cargando costeo del pedido...
        </div>
      ) : detalles.length === 0 ? (
        <div className="p-6 text-slate-500">
          Este pedido no tiene detalles para costear.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white text-slate-500">
              <tr>
                <th className="p-4 text-left">Material</th>
                <th className="p-4 text-left">Clasificacion</th>
                <th className="p-4 text-left">Ancho</th>
                <th className="p-4 text-left">Rollos</th>
                <th className="p-4 text-left">Valor unitario</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((detalle) => (
                <tr
                  key={detalle.detallePedidoId}
                  className="border-t"
                >
                  <td className="p-4 font-semibold text-slate-700">
                    {detalle.tipoPolarizado}
                  </td>
                  <td className="p-4">
                    {etiquetaDetalle(detalle)}
                  </td>
                  <td className="p-4">
                    {anchoLabel(detalle.ancho)}
                  </td>
                  <td className="p-4">
                    {detalle.cantidadRollos}
                  </td>
                  <td className="p-4 min-w-44">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={detalle.valorUnitario}
                      onChange={(event) =>
                        onChangeDetalle(
                          detalle.detallePedidoId,
                          formatearNumeroEntrada(
                            event.target.value
                          )
                        )
                      }
                      className="w-full border rounded-lg p-2"
                    />
                    {moneda === "USD" && (
                      <p className="mt-1 text-xs text-slate-400">
                        En pesos:{" "}
                        {formatoCop.format(
                          numeroEntrada(
                            detalle.valorUnitario
                          ) * numeroEntrada(trm)
                        )}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  disabled = false,
  hint = "",
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-500">
        {label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full border rounded-lg p-3 mt-1 disabled:bg-slate-100 disabled:text-slate-500"
      />
      {hint ? (
        <span className="mt-1 block text-xs text-slate-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full border rounded-lg p-3 mt-1 bg-white"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="h-4 w-4"
      />
      {label}
    </label>
  );
}

export default CosteoPedidoForm;
