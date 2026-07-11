export const TIPO_STOCK_RESERVA_UN_ROLLO =
  "STOCK_RESERVA_UN_ROLLO";
export const TIPO_STOCK_RESERVA_DOS_ROLLOS =
  "STOCK_RESERVA_DOS_ROLLOS";
export const TIPO_RECEPCION_NUEVA =
  "RECEPCION_NUEVA";
export const TIPO_VENTA_PENDIENTE =
  "VENTA_PENDIENTE";
export const TIPO_VENTA_REVISION_CORTES =
  "VENTA_REVISION_CORTES";

export function nivelAlerta(tipo) {
  const upper = tipo?.toUpperCase() || "";

  if (
    upper.includes("AGOTADO") ||
    upper.includes("CRITICO") ||
    tipo === TIPO_STOCK_RESERVA_UN_ROLLO
  ) {
    return "CRITICO";
  }

  if (
    upper.includes("BAJO") ||
    tipo === TIPO_STOCK_RESERVA_DOS_ROLLOS
  ) {
    return "PREVENTIVO";
  }

  if (tipo === TIPO_RECEPCION_NUEVA) {
    return "INFORMATIVO";
  }

  if (tipo === TIPO_VENTA_REVISION_CORTES) {
    return "CRITICO";
  }

  if (tipo === TIPO_VENTA_PENDIENTE) {
    return "PREVENTIVO";
  }

  return "PREVENTIVO";
}
