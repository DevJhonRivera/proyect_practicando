import { Check, CheckCircle2, ListChecks } from "lucide-react";

import ExcelButton from "../../../components/ui/ExcelButton";
import {
  EstadoBadge,
  NivelBadge,
  TipoBadge,
} from "./AlertBadges";

function AlertasTable({
  alertas,
  columnasExcel,
  onAtender,
  onAtenderVisibles,
  pendientes,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/90 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <ListChecks size={21} />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900">
            Historial de alertas
            </h2>

            <p className="text-slate-500 text-sm">
              Registro completo de eventos generados por el sistema.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {pendientes.length > 0 && (
            <button
              type="button"
              onClick={onAtenderVisibles}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-green-600/20 hover:bg-green-700"
            >
              <Check size={16} />
              Atender visibles
            </button>
          )}

          <ExcelButton
            title="Historial de alertas"
            fileName="alertas"
            sheetName="Alertas"
            columns={columnasExcel}
            rows={alertas}
          />
        </div>
      </div>

      {alertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center text-slate-500">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
            <CheckCircle2 size={24} />
          </div>

          <p className="font-semibold">
            No existen alertas con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-200">
              <tr>
                <th className="p-4 text-left font-bold">
                  Tipo
                </th>
                <th className="p-4 text-left font-bold">
                  Mensaje
                </th>
                <th className="p-4 text-left font-bold">
                  Fecha
                </th>
                <th className="p-4 text-left font-bold">
                  Nivel
                </th>
                <th className="p-4 text-left font-bold">
                  Estado
                </th>
                <th className="p-4 text-right font-bold">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {alertas.map((alerta) => (
                <tr
                  key={alerta._id}
                  className="transition hover:bg-red-50/30"
                >
                  <td className="p-4 text-slate-600">
                    <TipoBadge tipo={alerta.tipo} />
                  </td>

                  <td className="max-w-[420px] p-4 leading-6 text-slate-700">
                    {alerta.mensaje}
                  </td>

                  <td className="p-4 font-medium text-slate-600">
                    {new Date(alerta.createdAt).toLocaleDateString()}
                  </td>

                  <td className="p-4">
                    <NivelBadge tipo={alerta.tipo} />
                  </td>

                  <td className="p-4">
                    <EstadoBadge atendida={alerta.atendida} />
                  </td>

                  <td className="p-4 text-right">
                    {alerta.atendida ? (
                      <span className="text-xs text-slate-400">
                        Atendida
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAtender(alerta._id)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-green-600/20 hover:bg-green-700"
                      >
                        <Check size={15} />
                        Atender
                      </button>
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

export default AlertasTable;
