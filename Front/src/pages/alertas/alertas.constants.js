export const TIPO_STOCK_RESERVA_UN_ROLLO =
  "STOCK_RESERVA_UN_ROLLO";
export const TIPO_STOCK_RESERVA_DOS_ROLLOS =
  "STOCK_RESERVA_DOS_ROLLOS";
export const TIPO_RECEPCION_NUEVA =
  "RECEPCION_NUEVA";
export const TIPO_SERVICIO_ASESOR_NUEVO =
  "SERVICIO_ASESOR_NUEVO";
export const TIPO_SERVICIO_LISTO_PAGO =
  "SERVICIO_LISTO_PAGO";
export const TIPO_VENTA_PENDIENTE =
  "VENTA_PENDIENTE";
export const TIPO_VENTA_REVISION_CORTES =
  "VENTA_REVISION_CORTES";
export const TIPO_COORDINACION_NUEVA = "COORDINACION_NUEVA";
export const TIPO_PROPUESTA_CORTE = "PROPUESTA_CORTE";
export const TIPO_MATERIAL_LISTO = "MATERIAL_LISTO";
export const TIPO_ASIGNACION_TRABAJO = "ASIGNACION_TRABAJO";
export const TIPO_INSTALACION_COMPLETA = "INSTALACION_COMPLETA";

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

  if (tipo === TIPO_RECEPCION_NUEVA || tipo === TIPO_SERVICIO_ASESOR_NUEVO || tipo === TIPO_SERVICIO_LISTO_PAGO || tipo === TIPO_COORDINACION_NUEVA || tipo === TIPO_PROPUESTA_CORTE || tipo === TIPO_MATERIAL_LISTO || tipo === TIPO_ASIGNACION_TRABAJO || tipo === TIPO_INSTALACION_COMPLETA) {
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
