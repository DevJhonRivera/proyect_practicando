export const etiqueta = (valor) => String(valor || "").replaceAll("_", " ");
export const fechaColombia = (valor) => valor
  ? new Date(valor).toLocaleString("es-CO", { timeZone: "America/Bogota" })
  : "Sin fecha";

export function duracion(ms) {
  if (ms == null) return "—";
  const minutos = Math.floor(ms / 60000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  if (dias) return `${dias} d ${horas % 24} h`;
  if (horas) return `${horas} h ${minutos % 60} min`;
  return minutos ? `${minutos} min` : "< 1 min";
}
