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
