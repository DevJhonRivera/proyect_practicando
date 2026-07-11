export const UNIDAD_PORCENTAJE = "PORCENTAJE";
export const UNIDAD_MICRAS = "MICRAS";
export const UNIDAD_NINGUNA = "NINGUNA";

export const MICRAJES_SEGURIDAD = [
  120,
  300,
  500,
  700,
  1500,
  3000,
];

export const PORCENTAJES_POLARIZADO = [
  5,
  15,
  20,
  22,
  35,
  50,
  70,
];

export const materialesCatalogo = [
  {
    categoria: "Polarizados",
    unidadMedida: UNIDAD_PORCENTAJE,
    opciones: PORCENTAJES_POLARIZADO,
    materiales: [
      "Nanoceramico",
      "Blackceramic",
      "Ceramic I3",
      "Ceramic I3+",
    ],
  },
  {
    categoria: "PPF",
    unidadMedida: UNIDAD_NINGUNA,
    opciones: [
      0,
    ],
    materiales: [
      "PPF",
    ],
  },
  {
    categoria: "Peliculas de seguridad",
    unidadMedida: UNIDAD_MICRAS,
    opciones: MICRAJES_SEGURIDAD,
    materiales: [
      "Pelicula de seguridad",
    ],
  },
];

export const materialesOpciones =
  materialesCatalogo.flatMap((grupo) =>
    grupo.materiales.map((material) => ({
      material,
      categoria: grupo.categoria,
      unidadMedida: grupo.unidadMedida,
      opciones: grupo.opciones,
    }))
  );

export function obtenerMaterial(material) {
  return materialesOpciones.find(
    (item) => item.material === material
  );
}

export function unidadPorMaterial(material) {
  return (
    obtenerMaterial(material)?.unidadMedida ||
    UNIDAD_PORCENTAJE
  );
}

export function opcionesPorMaterial(material) {
  return (
    obtenerMaterial(material)?.opciones ||
    PORCENTAJES_POLARIZADO
  );
}

export function etiquetaUnidad(unidadMedida) {
  if (unidadMedida === UNIDAD_NINGUNA) {
    return "Clasificacion";
  }

  return unidadMedida === UNIDAD_MICRAS
    ? "Micras"
    : "Porcentaje";
}

export function sufijoUnidad(unidadMedida) {
  if (unidadMedida === UNIDAD_NINGUNA) {
    return "";
  }

  return unidadMedida === UNIDAD_MICRAS
    ? "micras"
    : "%";
}

export function etiquetaClasificacion(
  valor,
  unidadMedida = UNIDAD_PORCENTAJE
) {
  if (valor === undefined || valor === null || valor === "") {
    return "";
  }

  if (unidadMedida === UNIDAD_NINGUNA) {
    return "";
  }

  if (Number(valor) === 0) {
    return "Sin clasificacion";
  }

  const sufijo = sufijoUnidad(unidadMedida);

  return unidadMedida === UNIDAD_MICRAS
    ? `${valor} ${sufijo}`
    : `${valor}${sufijo}`;
}

export function unidadDetalle(detalle) {
  return (
    detalle?.unidadMedida ||
    unidadPorMaterial(detalle?.tipoPolarizado)
  );
}

export function etiquetaDetalle(detalle) {
  return etiquetaClasificacion(
    detalle?.porcentaje,
    unidadDetalle(detalle)
  );
}
