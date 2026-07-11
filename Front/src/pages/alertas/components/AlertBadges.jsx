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
      ? "bg-red-100 text-red-700"
      : tipo === TIPO_STOCK_RESERVA_DOS_ROLLOS ||
        upper.includes("BAJO")
      ? "bg-yellow-100 text-yellow-700"
      : tipo === TIPO_RECEPCION_NUEVA ||
        upper.includes("RECEPCION")
      ? "bg-blue-100 text-blue-700"
      : tipo === TIPO_VENTA_REVISION_CORTES
      ? "bg-red-100 text-red-700"
      : tipo === TIPO_VENTA_PENDIENTE ||
        upper.includes("VENTA")
      ? "bg-emerald-100 text-emerald-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {tipo}
    </span>
  );
}

export function NivelBadge({ tipo }) {
  const nivel = nivelAlerta(tipo);

  const style =
    nivel === "CRITICO"
      ? "bg-red-500 text-white"
      : nivel === "INFORMATIVO"
      ? "bg-blue-100 text-blue-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {nivel}
    </span>
  );
}

export function EstadoBadge({ atendida }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        atendida
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {atendida ? "ATENDIDA" : "PENDIENTE"}
    </span>
  );
}
