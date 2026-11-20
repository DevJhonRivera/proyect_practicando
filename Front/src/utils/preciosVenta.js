// Vista previa. El backend verifica las tarifas y calcula el importe definitivo al guardar.
export const normalizarMaterial = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

export function tarifaCompatibleConMaterial(fila, material, clasificacion = "") {
  const nombre = normalizarMaterial(material);
  const materiales = (fila.materiales || []).map(normalizarMaterial);
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

const textoTarifa = (fila) => normalizarMaterial(`${fila.grupo || ""} ${fila.descripcion || ""}`);

export function tarifasAplicacionPolarizado(tarifas = [], partes = []) {
  const seleccionadas = new Set((partes || []).map(normalizarMaterial));
  if (!seleccionadas.size) return tarifas;
  if (seleccionadas.has("COMPLETO")) return [];

  const compatibles = tarifas.filter((fila) => {
    if (fila.modalidad === "PORCENTAJE") return tarifaCompatibleConPartes(fila, partes);
    const texto = textoTarifa(fila);
    if (seleccionadas.has("SUNROOF")) return texto.includes("SUNROOF") || texto.includes("SUN ROOF");
    if (seleccionadas.has("PANORAMICO") && seleccionadas.has("LUNETA")) return texto.includes("PARABRISAS Y LUNETA") || texto.includes("PANORAMICO + LUNETA");
    if (seleccionadas.has("PANORAMICO") && seleccionadas.has("DELANTERAS")) return texto.includes("PARABRISAS Y 2 VENTANAS DEL") || texto.includes("PARABRISAS Y DOS VENTANAS DEL");
    if (seleccionadas.size !== 1) return false;
    const [parte] = seleccionadas;
    if (parte === "PANORAMICO") return (texto.includes("PANORAMICO") || texto.includes("PARABRISAS")) && !texto.includes(" LUNETA") && !texto.includes("VENTANAS DEL");
    if (parte === "LUNETA") return texto.includes("LUNETA") && !texto.includes("PARABRISAS") && !texto.includes("PANORAMICO +");
    return false;
  });

  const combinada = tarifaPredeterminadaPolarizado(compatibles, partes);
  const requiereCombinada = seleccionadas.has("U") || seleccionadas.size > 1;
  return requiereCombinada && combinada ? compatibles.filter((fila) => fila.codigo === combinada.codigo) : compatibles;
}

export function tarifaPredeterminadaPolarizado(tarifas = [], partes = []) {
  const seleccionadas = new Set((partes || []).map(normalizarMaterial));
  const buscarUnica = (validar) => {
    const coincidencias = tarifas.filter((fila) => validar(textoTarifa(fila)));
    return coincidencias.length === 1 ? coincidencias[0] : null;
  };

  if (seleccionadas.has("U")) return buscarUnica((texto) => /\bLA U\b/.test(texto));
  if (seleccionadas.has("PANORAMICO") && seleccionadas.has("DELANTERAS")) {
    const combinada = buscarUnica((texto) => texto.includes("PARABRISAS Y 2 VENTANAS DEL") || texto.includes("PARABRISAS Y DOS VENTANAS DEL"));
    if (combinada) return combinada;
  }
  if (seleccionadas.has("PANORAMICO") && seleccionadas.has("LUNETA")) {
    const combinada = buscarUnica((texto) => texto.includes("PARABRISAS Y LUNETA") || texto.includes("PANORAMICO + LUNETA"));
    if (combinada) return combinada;
  }
  if (seleccionadas.size !== 1) return tarifas.length === 1 ? tarifas[0] : null;

  const [parte] = seleccionadas;
  const reglas = {
    PANORAMICO: (texto) => (texto.includes("PANORAMICO") || texto.includes("PARABRISAS")) && !texto.includes(" Y ") && !texto.includes(" + "),
    DELANTERAS: (texto) => texto.includes("VENTANA DELANTERA") && !texto.includes("PARABRISAS"),
    TRASERAS: (texto) => texto.includes("VENTANA TRASERA"),
    LUNETA: (texto) => texto.includes("LUNETA") && !texto.includes(" Y ") && !texto.includes(" + "),
    FIJOS: (texto) => /\bFIJOS?\b/.test(texto),
    CUSTODIAS: (texto) => texto.includes("CUSTODIA"),
    SUNROOF: (texto) => texto.includes("SUNROOF") || texto.includes("SUN ROOF") || texto.includes("TECHO PANORAMICO"),
  };
  return reglas[parte] ? buscarUnica(reglas[parte]) : tarifas.length === 1 ? tarifas[0] : null;
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
      ? esHoja(fila, "TAPETES")
      : esHoja(fila, "ACCESORIOS"));
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
  } else {
    return lista;
  }

  const claves = palabrasClave(detalle);
  if (!claves.length) return candidatas;
  const especificas = candidatas.filter((fila) => {
    const texto = normalizarMaterial(`${fila.hoja} ${fila.grupo} ${fila.descripcion} ${fila.notas || ""}`);
    return claves.some((clave) => texto.includes(clave));
  });
  return especificas.length ? especificas : candidatas;
}

export function seleccionarTarifaVenta(codigo, lista, bases = []) {
  const fila = lista.find((item) => item.codigo === codigo);
  const referencia = { codigo, revision: fila?.revision, nivel: fila?.precios.findIndex((precio) => precio != null) ?? 0 };
  const vigentes = bases.filter((base) => base.activo && !base.requiereRevision && base.modalidad === "FIJO" && base.precios.some((precio) => precio != null));
  if (fila?.modalidad === "PORCENTAJE" && vigentes.length === 1) {
    const base = vigentes[0];
    return { ...referencia, baseCodigo: base.codigo, baseRevision: base.revision,
      baseNivel: base.precios.findIndex((precio) => precio != null) };
  }
  return { ...referencia, baseCodigo: undefined, baseNivel: undefined, baseRevision: undefined };
}

export function calcularTarifasVenta(selecciones, lista) {
  if (!selecciones?.length) throw new Error("Seleccione la tarifa de venta del servicio.");
  const obtener = (codigo, nivel, revision) => {
    const fila = lista.find((item) => item.codigo === codigo);
    if (!fila?.activo || fila.requiereRevision || !Number.isInteger(nivel) || fila.precios[nivel] == null) {
      throw new Error("Seleccione una tarifa vigente y un nivel disponible.");
    }
    if (fila.revision !== revision) throw new Error("La tarifa cambió. Vuelva a seleccionarla.");
    return fila;
  };
  const total = selecciones.reduce((suma, seleccion) => {
    const { codigo, nivel, revision, cantidad = 1, baseCodigo, baseNivel, baseRevision } = seleccion;
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 1000) throw new Error("Revise la cantidad de piezas.");
    const fila = obtener(codigo, nivel, revision);
    let valor = fila.precios[nivel];
    if (fila.modalidad === "PORCENTAJE") {
      if (!baseCodigo) throw new Error("Seleccione el tipo de vehículo y su precio completo para calcular esta pieza.");
      const base = obtener(baseCodigo, baseNivel, baseRevision);
      if (base.modalidad !== "FIJO") throw new Error("Seleccione un precio completo en pesos como base.");
      valor = Math.round(base.precios[baseNivel] * valor / 100);
    }
    return suma + valor * cantidad;
  }, 0);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("El total del servicio no es válido.");
  return { total };
}

export { calcularPiezasPpf } from "../../../Back/src/modules/preciosVenta/calculoPrecios.mjs";
