export const normalizarMaterial = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

export function materialesDeTarifa(fila) {
  if (fila.materiales?.length) return fila.materiales.map(normalizarMaterial);
  const grupo = normalizarMaterial(fila.grupo);
  const hoja = normalizarMaterial(fila.hoja);
  if (hoja.startsWith("PPF")) return grupo === "VINILO" ? [] : ["PPF"];
  if (grupo === "CLEARPLEX") return ["CLEAR PLEX"];
  if (hoja.startsWith("ANTIATRACO") || grupo.includes("ADICIONAL DE PELICULA")) {
    const micraje = `${grupo} ${normalizarMaterial(fila.descripcion)}`.match(/([\d.]+)\s*MICRAS/);
    if (micraje) return [`PELICULA:${micraje[1].replaceAll(".", "")}`];
    return grupo.startsWith("ANTIATRACO POR PIEZA") ? ["PELICULA"] : [];
  }
  if (!hoja.startsWith("POLARIZADOS")) return [];
  if (grupo.startsWith("POLARIZADOS POR PIEZA")) return ["POLARIZADO"];
  if (grupo === "NANO CARBON") return ["NANOCARBON"];
  if (grupo === "NANOCERAMICA") return ["NANOCERAMICA"];
  if (grupo.startsWith("BLACK CERAMIC")) return ["BLACK CERAMIC", "PROHD", "PRO HD BLINDADOS"];
  if (grupo.startsWith("CERAMIC I3 +")) return ["CERAMIC I3 +"];
  if (grupo.startsWith("CERAMIC I3")) return ["CERAMIC I3", "ULTRA OPTIK BLINDADOS"];
  if (grupo === "PROHD") return ["PROHD", "PRO HD BLINDADOS"];
  if (grupo === "AMERICANO" || grupo.endsWith(" · AMERICANO")) return ["AMERICANO"];
  if (grupo.endsWith(" · NANO")) return ["NANOCARBON", "NANOCERAMICA"];
  if (grupo.endsWith(" · ESPEJO PREMIUM 10%")) return ["ESPEJO PREMIUM"];
  return [];
}

export function tarifaCompatibleConMaterial(fila, material, clasificacion = "") {
  const nombre = normalizarMaterial(material);
  const materiales = materialesDeTarifa(fila);
  if (nombre === "PELICULA") {
    const numero = normalizarMaterial(clasificacion).match(/([\d.]+)/)?.[1]?.replaceAll(".", "");
    return materiales.includes("PELICULA") || Boolean(numero && materiales.includes(`PELICULA:${numero}`));
  }
  return materiales.includes(nombre) || (nombre.startsWith("CLEAR PLEX ") && materiales.includes("CLEAR PLEX"))
    || (Boolean(nombre) && !nombre.startsWith("CLEAR PLEX") && nombre !== "PPF" && materiales.includes("POLARIZADO"));
}

export function tarifaCompatibleConPartes(fila, partes = []) {
  if (fila.modalidad !== "PORCENTAJE") return true;
  const seleccionadas = new Set((partes || []).map(normalizarMaterial));
  if (!seleccionadas.size) return true;
  if (seleccionadas.has("COMPLETO")) return false;

  const descripcion = normalizarMaterial(fila.descripcion);
  const tiene = (...valores) => valores.some((valor) => descripcion.includes(valor));
  const incluye = (parte) => seleccionadas.has(parte) || seleccionadas.has("U") && ["DELANTERAS", "TRASERAS", "LUNETA", "FIJOS", "CUSTODIAS"].includes(parte);

  if (tiene("LA U")) return seleccionadas.has("U");
  if (tiene("PARABRISAS Y 2 VENTANAS DEL", "PARABRISAS Y DOS VENTANAS DEL")) return incluye("PANORAMICO") && incluye("DELANTERAS");
  if (tiene("PARABRISAS Y LUNETA")) return incluye("PANORAMICO") && incluye("LUNETA");
  if (tiene("LATERALES")) return seleccionadas.has("U") || incluye("DELANTERAS") && incluye("TRASERAS");
  if (tiene("VENTANA DELANTERA")) return incluye("DELANTERAS");
  if (tiene("VENTANA TRASERA")) return incluye("TRASERAS");
  if (tiene("CUSTODIA")) return incluye("CUSTODIAS");
  if (tiene("PANORAMICO", "PARABRISAS")) return incluye("PANORAMICO");
  if (tiene("LUNETA")) return incluye("LUNETA");
  if (tiene("SUNROOF", "SUN ROOF", "TECHO PANORAMICO")) return incluye("SUNROOF");
  if (tiene("FIJO")) return incluye("FIJOS");
  return false;
}

const palabrasGenericas = new Set([
  "SERVICIO", "SERVICIOS", "GENERAL", "GENERALES", "INSTALACION", "INSTALACIONES",
  "APLICACION", "COMPLETO", "COMPLETA", "VEHICULO", "AUTOMOVIL", "CAMIONETA",
  "ACCESORIO", "ACCESORIOS", "PRODUCTO", "PRODUCTOS", "ANOS", "PARA", "CON", "DEL",
]);
const palabrasClave = (valor) => [...new Set(normalizarMaterial(valor).split(/[^A-Z0-9]+/)
  .filter((palabra) => palabra.length >= 4 && !palabrasGenericas.has(palabra)))];

export function tarifasCompatiblesConContexto(lista = [], familia, categoria = "", detalle = "") {
  const tipo = normalizarMaterial(familia);
  const categoriaNormalizada = normalizarMaterial(categoria);
  const esHoja = (fila, prefijo) => normalizarMaterial(fila.hoja).startsWith(prefijo);
  let candidatas;
  if (tipo === "ACCESORIO") {
    candidatas = lista.filter((fila) => categoriaNormalizada === "TAPETES"
      ? esHoja(fila, "TAPETES") : esHoja(fila, "ACCESORIOS"));
  } else if (tipo === "SERVICIO") {
    if (categoriaNormalizada === "ASEGURADA") {
      candidatas = lista.filter((fila) => normalizarMaterial(`${fila.hoja} ${fila.grupo} ${fila.descripcion}`).includes("ASEGURADA"));
    } else if (["DETAILING", "LAVADO", "POLICHADA", "PDR", "PINTURA"].includes(categoriaNormalizada)) {
      candidatas = lista.filter((fila) => esHoja(fila, "DETAILING"));
    } else if (categoriaNormalizada === "INSTALACIONES") {
      candidatas = lista.filter((fila) => esHoja(fila, "ACCESORIOS") || esHoja(fila, "TAPETES"));
    } else {
      candidatas = lista.filter((fila) => esHoja(fila, "DETAILING") || esHoja(fila, "ACCESORIOS") || esHoja(fila, "TAPETES"));
    }
  } else return lista;
  const claves = palabrasClave(detalle);
  const especificas = claves.length ? candidatas.filter((fila) => {
    const texto = normalizarMaterial(`${fila.hoja} ${fila.grupo} ${fila.descripcion} ${fila.notas || ""}`);
    return claves.some((clave) => texto.includes(clave));
  }) : [];
  return especificas.length ? especificas : candidatas;
}
