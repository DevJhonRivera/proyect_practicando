import { Calculator } from "lucide-react";

import {
  formatoCop,
  formatoNumero,
} from "../finanzas.helpers";
import { anchoLabel } from "../../../utils/anchos";
import { etiquetaDetalle } from "../../../utils/materiales";

function CosteoResultado({ costeo }) {
  return (
    <aside className="space-y-6">
      <section className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <Calculator className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">
            Resultado
          </h2>
        </div>

        {costeo ? (
          <div className="p-6 space-y-4">
            {costeo.moneda === "USD" && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                <ResultLine
                  label="TRM productos"
                  value={formatoNumero.format(costeo.trm || 0)}
                />
                <ResultLine
                  label="TRM flete"
                  value={formatoNumero.format(
                    costeo.trmFlete || costeo.trm || 0
                  )}
                />
              </div>
            )}
            <ResultLine
              label="Subtotal productos"
              value={formatoCop.format(
                costeo.subtotalProductosCop || 0
              )}
            />
            <ResultLine
              label="Flete"
              value={formatoCop.format(costeo.fleteCop || 0)}
            />
            <ResultLine
              label="Otros costos"
              value={formatoCop.format(
                costeo.otrosCostosCop || 0
              )}
            />
            <ResultLine
              label={
                costeo.ivaIncluido
                  ? "IVA incluido"
                  : "IVA"
              }
              value={formatoCop.format(costeo.ivaCop || 0)}
            />
            <div className="pt-4 border-t">
              <p className="text-sm text-slate-500">
                Total final
              </p>
              <p className="text-3xl font-bold text-blue-700">
                {formatoCop.format(costeo.totalCop || 0)}
              </p>
            </div>
            <ResultLine
              label="Costo promedio por rollo"
              value={formatoCop.format(
                costeo.costoPromedioRolloCop || 0
              )}
            />
          </div>
        ) : (
          <div className="p-6 text-slate-500">
            Guarde el costeo para ver los totales calculados.
          </div>
        )}
      </section>

      {costeo?.detalles?.length > 0 && (
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">
              Costo por referencia
            </h2>
          </div>
          <div className="divide-y">
            {costeo.detalles.map((detalle) => (
              <div
                key={detalle.detallePedidoId}
                className="p-4"
              >
                    <p className="font-semibold text-slate-700">
                      {detalle.tipoPolarizado} {etiquetaDetalle(detalle)} {anchoLabel(detalle.ancho)}
                    </p>
                <p className="text-sm text-slate-500">
                  Final unitario:{" "}
                  {formatoCop.format(
                    detalle.costoFinalUnitarioCop || 0
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  Total:{" "}
                  {formatoCop.format(
                    detalle.costoFinalTotalCop || 0
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}

function ResultLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">
        {label}
      </span>
      <span className="font-semibold text-slate-800 text-right">
        {value}
      </span>
    </div>
  );
}

export default CosteoResultado;
