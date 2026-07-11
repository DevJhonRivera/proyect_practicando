import Swal from "sweetalert2";
import { Download } from "lucide-react";

import { descargarExcel } from "../../utils/excelExport";

function ExcelButton({
  fileName,
  title,
  subtitle,
  columns,
  rows,
  sheetName,
  disabled = false,
}) {
  const descargar = async () => {
    if (!rows?.length) {
      Swal.fire({
        icon: "info",
        title: "Sin datos",
        text: "No hay registros para descargar.",
      });

      return;
    }

    try {
      await descargarExcel({
        fileName,
        title,
        subtitle,
        columns,
        rows,
        sheetName,
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No fue posible generar el archivo Excel.",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={descargar}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
    >
      <Download size={17} />
      Excel
    </button>
  );
}

export default ExcelButton;
