import { Pencil } from "lucide-react";

import ExcelButton from "../../../components/ui/ExcelButton";
import { etiquetaDetalle } from "../../../utils/materiales";
import {
  servicioLabels,
  tipoCorteLabels,
} from "../cortes.constants";
import {
  formatFechaHora,
  getMaterialCodigo,
} from "../cortes.utils";

const formatoCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function CortesTable({
  cortes,
  excelColumns,
  onEdit,
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Historial de cortes
          </h2>

          <p className="text-slate-500 text-sm">
            Registro de servicios realizados y material utilizado
          </p>
        </div>

        <ExcelButton
          title="Historial de cortes"
          fileName="historial-cortes"
          sheetName="Cortes"
          columns={excelColumns}
          rows={cortes}
        />
      </div>

      {cortes.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          No existen cortes registrados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-4 text-left">
                  Fecha y hora
                </th>
                <th className="p-4 text-left">
                  Placa
                </th>
                <th className="p-4 text-left">
                  Marca
                </th>
                <th className="p-4 text-left">
                  Modelo
                </th>
                <th className="p-4 text-left">
                  Material usado
                </th>
                <th className="p-4 text-left">
                  Servicio
                </th>
                <th className="p-4 text-left">
                  Tipo corte
                </th>
                <th className="p-4 text-left">
                  Metros
                </th>
                <th className="p-4 text-right">
                  Costo material
                </th>
                <th className="p-4 text-right">
                  Valor venta
                </th>
                <th className="p-4 text-left">
                  Venta
                </th>
                <th className="p-4 text-center">
                  Accion
                </th>
              </tr>
            </thead>

            <tbody>
              {cortes.map((corte) => (
                <tr
                  key={corte._id}
                  className="border-b border-slate-200 hover:bg-slate-50"
                >
                  <td className="p-4 text-slate-600">
                    {formatFechaHora(corte.createdAt)}
                  </td>

                  <td className="p-4 font-semibold text-slate-800">
                    {corte.placa || "-"}
                  </td>

                  <td className="p-4 text-slate-600">
                    {corte.marca || "-"}
                  </td>

                  <td className="p-4 text-slate-600">
                    {corte.modelo || "-"}
                  </td>

                  <td className="p-4 text-slate-600">
                    <MaterialUsado corte={corte} />
                  </td>

                  <td className="p-4">
                    <ServicioBadge servicio={corte.tipoServicio} />
                    {corte.instalador && (
                      <p className="mt-1 text-xs text-slate-500">
                        {corte.instalador}
                      </p>
                    )}
                  </td>

                  <td className="p-4">
                    {tipoCorteLabels[corte.tipoCorte] ||
                      corte.tipoCorte}
                  </td>

                  <td className="p-4 font-bold text-blue-700">
                    {Number(corte.metrosUtilizados || 0).toFixed(2)} m
                  </td>

                  <td className="p-4 text-right font-semibold text-slate-700">
                    {formatoCop.format(corte.costoMaterialCop || 0)}
                  </td>

                  <td className="p-4 text-right font-semibold">
                    {Number(corte.valorVenta || 0) > 0
                      ? formatoCop.format(corte.valorVenta)
                      : "-"}
                  </td>

                  <td className="p-4">
                    <p className="font-semibold">
                      {corte.codigoVenta || "-"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {corte.ventaEstado || ""}
                    </p>
                  </td>

                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => onEdit(corte)}
                      title="Editar corte"
                      aria-label="Editar corte"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Pencil size={14} />
                    </button>
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

function MaterialUsado({ corte }) {
  const material =
    corte.rolloId || corte.retazoId || {};
  const label =
    corte.origenMaterial === "RETAZO"
      ? "Retazo"
      : "Rollo";
  const color =
    corte.origenMaterial === "RETAZO"
      ? "text-green-700"
      : "text-slate-800";

  return (
    <div>
      <span className={`font-semibold ${color}`}>
        {getMaterialCodigo(corte)}
      </span>
      <p className="text-xs text-slate-500">
        {label}
      </p>
      <p className="text-[11px] text-slate-400 leading-tight">
        {descripcionMaterial(material)}
      </p>
    </div>
  );
}

function descripcionMaterial(material) {
  const tipo =
    material.tipoPolarizado || "Material";
  const detalle =
    etiquetaDetalle(material);

  return `${tipo} ${detalle || ""}`.trim();
}

function ServicioBadge({ servicio }) {
  const style =
    servicio === "VENTA"
      ? "bg-green-100 text-green-700"
      : servicio === "GARANTIA" ||
        servicio === "GARANTIA_INSTALADOR"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {servicioLabels[servicio] || servicio}
    </span>
  );
}

export default CortesTable;
