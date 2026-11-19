export const ultimaRevision = (orden) => orden.coordinacion?.calidad?.revisiones?.at(-1);
export const lineasRecorteAsignacion = (orden, asignacion) => {
  const lineas = (orden.polarizados || []).map((_, i) => `POLARIZADO ${i + 1}`);
  if (lineas.includes(asignacion.servicio)) return [asignacion.servicio];
  return (orden.ppf || []).flatMap((p, i) => asignacion.servicio === `PPF ${p.referencia}` ? [`PPF ${i + 1}`] : []);
};
export const validarRevisionCalidad = (orden, data) => {
  if (!["APROBAR", "CORREGIR", "RECORTE"].includes(data.decision)) throw new Error("Seleccione una decision de calidad valida");
  const anterior = ultimaRevision(orden);
  const recorteRechazado = orden.flujo?.etapa === "REPROCESO" && anterior?.decision === "RECORTE"
    && (orden.novedades || []).some((n) => String(n._id) === String(anterior.novedadId) && n.estado === "RECHAZADA");
  const asignaciones = orden.coordinacion?.asignaciones || [];
  if (!recorteRechazado && (!["EN_INSTALACION", "PENDIENTE_CALIDAD", "MATERIAL_LISTO"].includes(orden.flujo?.etapa)
    || !asignaciones.length || asignaciones.some((a) => a.estado !== "COMPLETADA"))) throw new Error("Todas las instalaciones deben estar terminadas antes de revisar calidad");
  if (recorteRechazado && data.decision === "APROBAR") throw new Error("Debe resolver el recorte rechazado y corregir la instalacion antes de aprobar");
  if (typeof data.observacion !== "string" || data.observacion.trim().length < 5 || data.observacion.length > 2000) throw new Error("Registre la revision y su motivo (5 a 2000 caracteres)");
  if (data.decision === "APROBAR") return [];
  if (!Array.isArray(data.asignaciones) || !data.asignaciones.length || new Set(data.asignaciones.map(String)).size !== data.asignaciones.length) throw new Error("Seleccione las instalaciones que deben corregirse");
  const seleccionadas = data.asignaciones.map((id) => asignaciones.find((a) => String(a._id) === String(id)));
  if (seleccionadas.some((a) => !a)) throw new Error("La instalacion seleccionada no pertenece a la orden");
  if (recorteRechazado && data.asignaciones.some((id) => !anterior.asignaciones.some((a) => String(a.asignacionId) === String(id)))) throw new Error("Seleccione la instalacion del recorte rechazado");
  if (data.decision === "RECORTE") {
    if (seleccionadas.length !== 1) throw new Error("Solicite el recorte para una instalacion y su responsable");
    const permitidas = lineasRecorteAsignacion(orden, seleccionadas[0]);
    if (!Array.isArray(data.lineasRecorte) || !data.lineasRecorte.length || new Set(data.lineasRecorte).size !== data.lineasRecorte.length || data.lineasRecorte.some((l) => !permitidas.includes(l))) throw new Error("Seleccione las lineas de material correspondientes a esta instalacion");
  }
  return seleccionadas;
};
