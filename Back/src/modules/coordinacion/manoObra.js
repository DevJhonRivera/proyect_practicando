import mongoose from "mongoose";

export const tiposManoObra = ["BLACK", "AMERICANO", "PPF"];
const tarifas = mongoose.model("TarifasManoObra", new mongoose.Schema({
  _id: String,
  porcentajes: { type: Map, of: Number },
}));

export async function obtenerTarifasManoObra() {
  const guardados = (await tarifas.findById("vigentes").lean())?.porcentajes || {};
  return Object.fromEntries(Object.entries(guardados).filter(([clave]) =>
    !clave.startsWith("PPF:") && clave !== "MATERIAL:PELICULA"));
}

export async function guardarTarifasManoObra(entrada) {
  const porcentajes = {};
  for (const [tipo, valor] of Object.entries(entrada || {})) {
    const fijo = tipo.startsWith("FIJO|");
    const [clave, instalador, ...resto] = (fijo ? tipo.slice(5) : tipo).split("|");
    if (resto.length || (instalador !== undefined && !/^[a-f0-9]{24}$/.test(instalador)) ||
      clave === "MATERIAL:PELICULA" || (!tiposManoObra.includes(clave) &&
      !/^(?:(?:MATERIAL|SERVICIO):[^.$]{1,140}|PELICULA:[1-9]\d{0,5})$/.test(clave))) {
      throw new Error("Regla de mano de obra no válida");
    }
    if (valor === "" || valor == null) continue;
    if (fijo && (!/^\d+$/.test(String(valor)) || !Number.isSafeInteger(Number(valor)))) {
      throw new Error("Ingrese un monto fijo en pesos enteros");
    }
    const contraparte = fijo ? tipo.slice(5) : `FIJO|${tipo}`;
    if (Object.hasOwn(porcentajes, contraparte)) throw new Error("Elija porcentaje o monto fijo para cada regla e instalador");
    porcentajes[tipo] = fijo ? Number(valor) : porcentajeValido(valor, 0);
  }
  await tarifas.updateOne({ _id: "vigentes" }, { $set: { porcentajes } }, { upsert: true });
  return porcentajes;
}

function porcentajeValido(valor, minimo = Number.EPSILON) {
  const porcentaje = Number(valor);
  if ((typeof valor !== "number" && typeof valor !== "string") || String(valor).trim() === "" ||
      !Number.isFinite(porcentaje) || porcentaje < minimo || porcentaje > 100) {
    throw new Error(minimo === 0 ? "Ingrese un porcentaje entre 0 y 100" : "Ingrese un porcentaje mayor que 0 y hasta 100");
  }
  return porcentaje;
}

export function calcularManoObra(orden, servicio, filas, porcentajes) {
  const nombre = servicio.servicio;
  const polarizado = nombre.match(/^POLARIZADO (\d+)$/);
  const linea = polarizado && orden.polarizados[Number(polarizado[1]) - 1];
  const normalizar = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  const material = normalizar(linea?.material);
  const referencia = nombre.startsWith("PPF ") ? nombre.slice(4) : "";
  const adicional = nombre.match(/^ADICIONAL (\d+)$/);
  const servicioAdicional = adicional && orden.serviciosAdicionales?.[Number(adicional[1]) - 1];
  const micraje = normalizar(linea?.porcentaje).match(/^([1-9]\d{0,5})(?:\s*MICRAS)?$/)?.[1];
  const claves = referencia ? ["PPF"] : material === "PELICULA" ? (micraje ? [`PELICULA:${micraje}`] : []) : material
    ? [`MATERIAL:${material}`, ...(material.startsWith("CLEAR PLEX ") ? ["MATERIAL:CLEAR PLEX"] : []), ...tiposManoObra.filter((tipo) => material.split(/\s+/).includes(tipo))]
    : servicioAdicional ? [...new Set([`${servicioAdicional.tipo || ""} ${servicioAdicional.detalle || ""}`, servicioAdicional.detalle, servicioAdicional.tipo]
      .map(normalizar).filter(Boolean).map((valor) => `SERVICIO:${valor}`))] : [];
  const tipo = claves.find((clave) => Object.hasOwn(porcentajes, clave)) || claves[0];
  const excepciones = filas.filter((fila) => String(fila.porcentajeManoObra ?? "").trim());
  if (!filas.some((fila) => fila.calcularManoObra === true)) return null;
  if (!tipo || orden.garantia?.esGarantia) throw new Error("El servicio no admite este cálculo");
  if (filas.some((fila) => fila.calcularManoObra !== true)) throw new Error("Use un solo modo de pago para todo el servicio");
  const tasaExcepcional = excepciones.length ? porcentajeValido(excepciones[0].porcentajeManoObra) : null;
  const motivo = String(excepciones[0]?.motivoManoObra || "").trim();
  if (excepciones.length && (!motivo || excepciones.some((fila) => Number(fila.porcentajeManoObra) !== tasaExcepcional))) {
    throw new Error("Indique un solo porcentaje excepcional y su motivo para el servicio");
  }
  const valorServicio = referencia
    ? (orden.ppf || []).filter((item) => String(item.referencia || "PPF").trim().toUpperCase() === referencia)
      .reduce((total, item) => total + Number(item.valor || 0), 0)
    : Number(linea?.valor || servicioAdicional?.valor || 0);
  const bruto = Number(orden.comercial?.valorVenta || 0);
  const neto = Number(orden.comercial?.totalAcordado || 0);
  const participaciones = filas.length === 1 ? [100] : filas.map((fila) => porcentajeValido(fila.participacionManoObra));
  if (Math.abs(participaciones.reduce((total, porcentaje) => total + porcentaje, 0) - 100) > 1e-8) {
    throw new Error(`Las participaciones de ${nombre} deben sumar 100 %`);
  }
  const base = bruto > 0 ? neto * valorServicio / bruto : 0;
  let acumulado = 0;
  let pagado = 0;
  return participaciones.map((participacion, index) => {
    const candidatas = [...claves.map((clave) => `${clave}|${filas[index].instaladorId}`), ...claves];
    const regla = candidatas.flatMap((clave) => [clave, `FIJO|${clave}`]).find((clave) => Object.hasOwn(porcentajes, clave));
    if (tasaExcepcional == null && !regla) throw new Error(`Falta configurar la tarifa de ${nombre} para uno de los instaladores`);
    const fijo = tasaExcepcional == null && regla.startsWith("FIJO|");
    const tasa = fijo ? null : tasaExcepcional ?? porcentajes[regla];
    if (tasa > 0 && (valorServicio > bruto || bruto <= 0 || valorServicio <= 0 || neto <= 0)) {
      throw new Error(`Revise los valores comerciales de ${nombre} para calcular la mano de obra`);
    }
    const importe = fijo ? porcentajes[regla] : Math.round(base * tasa / 100);
    acumulado += importe * participacion / 100;
    const acumuladoPago = Math.round(acumulado);
    const valorInstalacion = acumuladoPago - pagado;
    pagado = acumuladoPago;
    return { valorInstalacion, manoObra: { tipo: tasaExcepcional == null ? regla : tipo, base, porcentaje: tasa, montoFijo: fijo ? importe : undefined, participacion, motivo } };
  });
}
