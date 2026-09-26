export const UNIDAD_PORCENTAJE = "PORCENTAJE";
export const UNIDAD_MICRAS = "MICRAS";
export const UNIDAD_PPF = "PPF";
export const UNIDAD_NINGUNA = "NINGUNA";
export const MATERIAL_PPF = "PPF";

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
  30,
  35,
  50,
  70,
];
export const REFERENCIA_PPF = [
  "ROAD GUARD",
  "HALF",
  "MATE",
  "SATINADO",
  "SMOKE 20%",
  "SMOKE 40%",
];

export const materialesCatalogo = [
  {
    categoria: "Polarizados",
    unidadMedida: UNIDAD_PORCENTAJE,
    opciones: PORCENTAJES_POLARIZADO,
    materiales: [
      "CERAMIC I3 +",
"CERAMIC I3",
"CARBON CRYSTALLINE",
"BLACK CERAMIC",
"HUPER OPTIK",
"NANOCERAMICA",
"NANOCARBON",
"AMERICANO",    ],
  },
  {
    categoria: "PPF",
    unidadMedida: UNIDAD_NINGUNA,
    opciones:REFERENCIA_PPF,
    materiales: [
      MATERIAL_PPF
    ],
  },
  {
    categoria: "Peliculas de seguridad",
    unidadMedida: UNIDAD_MICRAS,
    opciones: MICRAJES_SEGURIDAD,
    materiales: [
      "PELICULA",

    ],
  },
    {
    categoria: "Clear Plex",
    unidadMedida: UNIDAD_NINGUNA,
    opciones: [0],
    materiales: [
      "CLEAR PLEX PANORAMICO",
      "CLEAR PLEX LUNETA"
,

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
  const materialCatalogo = esMaterialPpf(material)
    ? MATERIAL_PPF
    : material;

  return materialesOpciones.find(
    (item) => item.material === materialCatalogo
  );
}

export function esMaterialPpf(material) {
  const valor = String(material || "")
    .trim()
    .toUpperCase();

  return (
    valor === MATERIAL_PPF ||
    valor.startsWith(`${MATERIAL_PPF} - `)
  );
}

export function obtenerReferenciaPpf(material) {
  if (!esMaterialPpf(material)) {
    return "";
  }

  const valor = String(material || "")
    .trim()
    .toUpperCase();

  return valor.startsWith(`${MATERIAL_PPF} - `)
    ? valor.slice(`${MATERIAL_PPF} - `.length)
    : "";
}

export function materialPpfConReferencia(referencia) {
  const valor = String(referencia || "")
    .trim()
    .toUpperCase();

  return valor
    ? `${MATERIAL_PPF} - ${valor}`
    : MATERIAL_PPF;
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
    ? "MICRAS"
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
