export const TIPOS_NOVEDAD_BLOQUEANTE = new Set([
  "FALTA_MATERIAL",
  "MATERIAL_DEFECTUOSO",
  "ROLLO_EQUIVOCADO",
  "ERROR_REGISTRO",
  "TRABAJO_PENDIENTE",
]);

export const novedadesBloqueantes = (asesoria = {}) =>
  (asesoria.novedades || []).filter(
    (item) =>
      TIPOS_NOVEDAD_BLOQUEANTE.has(item.tipo) &&
      ["PENDIENTE", "APROBADA"].includes(item.estado)
  );

export const validarSinNovedadesBloqueantes = (asesoria = {}) => {
  const activas = novedadesBloqueantes(asesoria);
  if (!activas.length) return;
  throw new Error(
    `La orden tiene novedades sin resolver: ${activas
      .map((item) => String(item.tipo || "NOVEDAD").replaceAll("_", " "))
      .join(", ")}`
  );
};

export const recalcularComercial = (asesoria = {}) => {
  const valorVenta = [
    ...(asesoria.polarizados || []),
    ...(asesoria.ppf || []),
    ...(asesoria.serviciosAdicionales || []),
  ].reduce((total, item) => total + Number(item.valor || 0), 0);
  const descuento = Math.min(Number(asesoria.comercial?.descuento || 0), valorVenta);
  return {
    valorVenta,
    descuento,
    aplicaDescuento: descuento > 0,
    totalAcordado: Math.max(valorVenta - descuento, 0),
  };
};
