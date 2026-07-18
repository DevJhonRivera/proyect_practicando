import {
  nivelAlerta,
  TIPO_RECEPCION_NUEVA,
  TIPO_STOCK_RESERVA_DOS_ROLLOS,
  TIPO_STOCK_RESERVA_UN_ROLLO,
  TIPO_VENTA_PENDIENTE,
  TIPO_VENTA_REVISION_CORTES,
} from "../alertas.constants";

export function TipoBadge({ tipo }) {
  const upper = tipo?.toUpperCase() || "";

  const style =
    tipo === TIPO_STOCK_RESERVA_UN_ROLLO ||
    upper.includes("CRITICO") ||
    upper.includes("AGOTADO")
      ? "border-red-200 bg-red-50 text-red-700"
      : tipo === TIPO_STOCK_RESERVA_DOS_ROLLOS ||
        upper.includes("BAJO")
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tipo === TIPO_RECEPCION_NUEVA ||
        upper.includes("RECEPCION")
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : tipo === TIPO_VENTA_REVISION_CORTES
      ? "border-red-200 bg-red-50 text-red-700"
      : tipo === TIPO_VENTA_PENDIENTE ||
        upper.includes("VENTA")
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${style}`}>
      {tipo}
    </span>
  );
}

export function NivelBadge({ tipo }) {
  const nivel = nivelAlerta(tipo);

  const style =
    nivel === "CRITICO"
      ? "border-red-600 bg-red-600 text-white"
      : nivel === "INFORMATIVO"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${style}`}>
      {nivel}
    </span>
  );
}

export function EstadoBadge({ atendida }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
        atendida
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {atendida ? "ATENDIDA" : "PENDIENTE"}
    </span>
  );
}
