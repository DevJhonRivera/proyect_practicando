// Server timestamps only. Existing orders start their history when next changed.
export const capturarEstado = (orden) => {
  const estado = {};
  if (orden.flujo?.etapa) estado.SERVICIO = orden.flujo.etapa;
  if (orden.autorizaciones?.requeridas) estado.RESPUESTA_CLIENTE = orden.autorizaciones.bloqueoCliente ? "PENDIENTE_GESTION" : "SIN_BLOQUEO";
  if (orden.coordinacion?.estadoPropuesta) estado.PROPUESTA_CORTE = orden.coordinacion.estadoPropuesta;
  if (orden.coordinacion?.calidad?.requerida) { estado.CALIDAD = orden.coordinacion.calidad.estado; estado.AVISO_VEHICULO_LISTO = orden.coordinacion.calidad.aviso?.estado || "PENDIENTE"; }
  if (orden.pago?.estado) estado.PAGO = orden.pago.estado;
  for (const item of orden.coordinacion?.asignaciones || []) {
    estado[`INSTALACION:${item._id}`] = item.estado;
  }
  for (const documento of orden.autorizaciones?.documentos || []) {
    estado[`FIRMA:${documento.tipo}:${documento._id}`] = documento.estado;
    estado[`CORREO:${documento.tipo}:${documento._id}`] = documento.envio;
  }
  return estado;
};

export const registrarCambios = (orden, anterior, fecha) => {
  const actual = capturarEstado(orden);
  const auditoria = orden.auditoria?.at(-1);
  const auditoriaNueva = orden.isNew || orden.isModified?.("auditoria");
  const usuarioId = auditoriaNueva ? auditoria?.usuarioId : null;
  const usuarioNombre = auditoriaNueva ? auditoria?.usuarioNombre : "Sistema";
  orden.trazabilidad ||= [];
  for (const [proceso, estado] of Object.entries(actual)) {
    if (anterior[proceso] === estado) continue;
    // Do not invent past start times for legacy orders.
    orden.trazabilidad.push({ proceso, anterior: anterior[proceso] || "", estado, fecha,
      usuarioId: usuarioId || null, usuarioNombre: usuarioNombre || "Sistema" });
  }
};
export function medirEtapas(eventos = [], ahora = Date.now()) {
  const historial = eventos.filter((evento) => evento.proceso === "SERVICIO" && evento.fecha)
    .map((evento) => ({ ...evento, inicio: new Date(evento.fecha).getTime() }))
    .filter((evento) => Number.isFinite(evento.inicio) && evento.inicio <= ahora)
    .sort((a, b) => a.inicio - b.inicio);
  return historial.flatMap((evento, indice) => {
    if (["FINALIZADA", "CANCELADA"].includes(evento.estado)) return [];
    const siguiente = historial[indice + 1];
    return [{ ...evento, activo: !siguiente, duracionMs: (siguiente?.inicio ?? ahora) - evento.inicio }];
  });
}
