import { Check } from "lucide-react";

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
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            Historial de alertas
          </h2>

          <p className="text-slate-500 text-sm">
            Registro completo de eventos generados por el sistema
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {pendientes.length > 0 && (
            <button
              type="button"
              onClick={onAtenderVisibles}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
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
        <div className="p-10 text-center text-slate-500">
          No existen alertas con los filtros seleccionados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-4 text-left">
                  Tipo
                </th>
                <th className="p-4 text-left">
                  Mensaje
                </th>
                <th className="p-4 text-left">
                  Fecha
                </th>
                <th className="p-4 text-left">
                  Nivel
                </th>
                <th className="p-4 text-left">
                  Estado
                </th>
                <th className="p-4 text-right">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {alertas.map((alerta) => (
                <tr
                  key={alerta._id}
                  className="border-b hover:bg-slate-50"
                >
                  <td className="p-4">
                    <TipoBadge tipo={alerta.tipo} />
                  </td>

                  <td className="p-4 text-slate-700">
                    {alerta.mensaje}
                  </td>

                  <td className="p-4">
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
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
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
