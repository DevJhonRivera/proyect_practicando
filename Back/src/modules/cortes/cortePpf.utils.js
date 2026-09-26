const roundMeasure = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;

const normalizarTexto = (value) =>
  String(value || "").trim().toUpperCase();

export const esMaterialPpf = (material = {}) =>
  material.unidadMedida === "NINGUNA" ||
  normalizarTexto(material.tipoPolarizado).includes("PPF");

export const prepararPiezasPpf = (piezas = []) => {
  if (!Array.isArray(piezas)) {
    return [];
  }

  return piezas.map((pieza) => {
    const nombre = normalizarTexto(
      pieza.pieza || pieza.nombre
    );
    const ubicacion = normalizarTexto(pieza.ubicacion);
    const cantidad = Number(pieza.cantidad || 1);
    const anchoCm = Number(pieza.anchoCm || 0);
    const largoCm = Number(pieza.largoCm || 0);

    if (!nombre) {
      throw new Error(
        "Todas las piezas PPF deben tener un nombre"
      );
    }

    if (!["EXTERIOR", "INTERIOR"].includes(ubicacion)) {
      throw new Error(
        `Seleccione la ubicacion de ${nombre}`
      );
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error(
        `La cantidad de ${nombre} no es valida`
      );
    }

    if (
      !Number.isFinite(anchoCm) ||
      !Number.isFinite(largoCm) ||
      anchoCm < 0 ||
      largoCm < 0
    ) {
      throw new Error(
        `Las medidas de ${nombre} no son validas`
      );
    }

    return {
      piezaPpfId:
        pieza.piezaPpfId || pieza._id || undefined,
      pieza: nombre,
      ubicacion,
      cantidad,
      anchoCm:
        roundMeasure(anchoCm),
      largoCm:
        roundMeasure(largoCm),
      rotada:
        Boolean(pieza.rotada),
    };
  });
};
