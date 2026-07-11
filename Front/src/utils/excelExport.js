const sanitizarArchivo = (value) =>
  String(value || "reporte")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase();

const normalizarValor = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  return value;
};

const obtenerValor = (row, column) => {
  if (typeof column.value === "function") {
    return column.value(row);
  }

  return row[column.key];
};

export const descargarExcel = async ({
  fileName,
  title,
  subtitle,
  columns,
  rows,
  sheetName = "Reporte",
}) => {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Polarizados YA";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [
      {
        state: "frozen",
        ySplit: 4,
      },
    ],
  });

  const totalColumnas = Math.max(columns.length, 1);

  worksheet.mergeCells(1, 1, 1, totalColumnas);
  worksheet.getCell(1, 1).value = title;
  worksheet.getCell(1, 1).font = {
    bold: true,
    size: 18,
    color: {
      argb: "FFFFFFFF",
    },
  };
  worksheet.getCell(1, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF0F172A",
    },
  };
  worksheet.getCell(1, 1).alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getRow(1).height = 28;

  worksheet.mergeCells(2, 1, 2, totalColumnas);
  worksheet.getCell(2, 1).value =
    subtitle ||
    `Generado el ${new Date().toLocaleString("es-CO")}`;
  worksheet.getCell(2, 1).font = {
    italic: true,
    color: {
      argb: "FF475569",
    },
  };
  worksheet.getCell(2, 1).alignment = {
    horizontal: "center",
  };

  worksheet.addRow([]);

  const headerRow = worksheet.addRow(
    columns.map((column) => column.header)
  );

  headerRow.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF2563EB",
      },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: {
        style: "thin",
        color: {
          argb: "FFCBD5E1",
        },
      },
      left: {
        style: "thin",
        color: {
          argb: "FFCBD5E1",
        },
      },
      bottom: {
        style: "thin",
        color: {
          argb: "FFCBD5E1",
        },
      },
      right: {
        style: "thin",
        color: {
          argb: "FFCBD5E1",
        },
      },
    };
  });

  rows.forEach((row, index) => {
    const excelRow = worksheet.addRow(
      columns.map((column) =>
        normalizarValor(obtenerValor(row, column))
      )
    );

    excelRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC",
        },
      };
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: {
          style: "thin",
          color: {
            argb: "FFE2E8F0",
          },
        },
        left: {
          style: "thin",
          color: {
            argb: "FFE2E8F0",
          },
        },
        bottom: {
          style: "thin",
          color: {
            argb: "FFE2E8F0",
          },
        },
        right: {
          style: "thin",
          color: {
            argb: "FFE2E8F0",
          },
        },
      };
    });
  });

  worksheet.autoFilter = {
    from: {
      row: 4,
      column: 1,
    },
    to: {
      row: 4,
      column: totalColumnas,
    },
  };

  columns.forEach((column, index) => {
    const excelColumn = worksheet.getColumn(index + 1);
    const maxLength = Math.max(
      String(column.header || "").length,
      ...rows.map((row) =>
        String(normalizarValor(obtenerValor(row, column))).length
      )
    );

    excelColumn.width = Math.min(
      Math.max(column.width || maxLength + 4, 12),
      42
    );

    if (column.numFmt) {
      excelColumn.numFmt = column.numFmt;
    }
  });

  worksheet.eachRow((row) => {
    row.height = Math.max(row.height || 18, 20);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizarArchivo(fileName || title)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
