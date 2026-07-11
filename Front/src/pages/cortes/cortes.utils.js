import {
  servicioLabels,
  tipoCorteLabels,
} from "./cortes.constants";

export const getMaterialCodigo = (corte) =>
  corte.origenMaterial === "RETAZO"
    ? corte.retazoId?.codigoRetazo || "Retazo"
    : corte.rolloId?.codigoRollo || "Sin rollo";

export const formatFechaHora = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export const formatNumero = (value) =>
  Number(value || 0).toLocaleString("es-CO");

export const getCortesExcelColumns = () => [
  {
    header: "Fecha",
    value: (corte) =>
      corte.createdAt
        ? new Date(corte.createdAt)
        : "",
    numFmt: "dd/mm/yyyy hh:mm",
  },
  {
    header: "Placa",
    value: (corte) => corte.placa || "",
  },
  {
    header: "Marca",
    value: (corte) => corte.marca || "",
    width: 18,
  },
  {
    header: "Modelo",
    value: (corte) => corte.modelo || "",
    width: 24,
  },
  {
    header: "Codigo material",
    value: getMaterialCodigo,
  },
  {
    header: "Origen",
    value: (corte) =>
      corte.origenMaterial === "RETAZO"
        ? "Retazo"
        : "Rollo",
  },
  {
    header: "Servicio",
    value: (corte) =>
      servicioLabels[corte.tipoServicio] ||
      corte.tipoServicio,
  },
  {
    header: "Instalador",
    value: (corte) => corte.instalador || "",
    width: 22,
  },
  {
    header: "Tipo corte",
    value: (corte) =>
      tipoCorteLabels[corte.tipoCorte] ||
      corte.tipoCorte,
  },
  {
    header: "Metros utilizados",
    value: (corte) =>
      Number(corte.metrosUtilizados || 0),
  },
  {
    header: "Costo material",
    value: (corte) =>
      Number(corte.costoMaterialCop || 0),
  },
  {
    header: "Valor venta",
    value: (corte) =>
      Number(corte.valorVenta || 0),
  },
  {
    header: "Utilidad",
    value: (corte) =>
      Number(corte.utilidadBrutaCop || 0),
  },
  {
    header: "Venta",
    value: (corte) => corte.codigoVenta || "",
  },
  {
    header: "Estado venta",
    value: (corte) => corte.ventaEstado || "",
  },
];
