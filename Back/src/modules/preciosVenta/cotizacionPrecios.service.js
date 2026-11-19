import { calcularPiezasPpf, calcularTarifasVenta, referenciasTarifas } from "./calculoPrecios.mjs";
import { listarPreciosVenta } from "./precioVenta.service.js";
import Accesorio from "../accesorios/accesorio.model.js";
import ComboPpf from "../combosPpf/comboPpf.model.js";
import Rollo from "../rollos/rollo.model.js";
import Retazo from "../retazos/retazo.model.js";
import { tarifaCompatibleConMaterial, tarifasCompatiblesConContexto } from "./materialTarifa.utils.js";

const campos = {
  polarizados: ["material", "porcentaje", "partes"],
  ppf: ["referencia", "aplicacion", "piezas", "comboPpfId", "cotizacionModo", "medidasPiezas", "dificultad"],
  serviciosAdicionales: ["tipo", "detalle"],
  accesorios: ["accesorioId"],
};
const identidad = (item, claves) => JSON.stringify(claves.map((clave) => Array.isArray(item[clave])
  ? [...item[clave]].map(String).sort() : String(item[clave] || "").trim().toUpperCase()));
const normalizar = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const tarifaEsMoto = (tarifa) => /\bMOTO(CICLETA)?S?\b/.test(normalizar(tarifa?.descripcion));
const tarifaEsVehiculo = (tarifa) => tarifa?.modalidad === "FIJO"
  && (/AUTO|AUT.?MOV|CAMIONETA|SUV|PLATON/.test(normalizar(tarifa.descripcion)) || tarifaEsMoto(tarifa));
const DIVISOR_DIFICULTAD = { FACIL: 0.35, MEDIA: 0.30, ALTA: 0.25, ESPECIAL: 0.20 };
const costoPpfPorM2 = async (referencia) => {
  const [rollos, retazos] = await Promise.all([
    Rollo.find({ estado: { $in: ["RESERVA", "USO"] }, largoDisponible: { $gt: 0 }, costoPorMetroCop: { $gt: 0 } })
      .select("tipoPolarizado ancho largoDisponible costoPorMetroCop").lean(),
    Retazo.find({ estado: "DISPONIBLE", largoDisponible: { $gt: 0 }, costoPorMetroCop: { $gt: 0 } })
      .select("tipoPolarizado ancho largoDisponible costoPorMetroCop").lean(),
  ]);
  const buscada = normalizar(referencia);
  const materiales = [...rollos, ...retazos].filter((item) => normalizar(item.tipoPolarizado).includes("PPF")
    && (!buscada || normalizar(item.tipoPolarizado).includes(buscada)));
  const totales = materiales.reduce((acc, item) => {
    const ancho = Number(item.ancho || 0);
    const largo = Number(item.largoDisponible || 0);
    if (ancho > 0 && largo > 0) {
      acc.area += ancho * largo;
      acc.costo += Number(item.costoPorMetroCop || 0) * largo;
    }
    return acc;
  }, { area: 0, costo: 0 });
  if (!(totales.area > 0 && totales.costo > 0)) throw new Error("El PPF seleccionado no tiene costo de inventario para cotizar por medidas.");
  return Math.round(totales.costo / totales.area);
};

export async function aplicarPreciosAsesoria(data, anterior) {
  if (data.garantia?.esGarantia) return data;
  const resultado = { ...data };
  let lista;
  for (const [grupo, claves] of Object.entries(campos)) {
    resultado[grupo] = [];
    const anteriores = anterior?.[grupo] || [];
    const usados = new Set();
    for (const item of data[grupo] || []) {
      let itemCotizado = item;
      const referencias = referenciasTarifas(item.tarifasVenta || []);
      const indicePrevio = anteriores.findIndex((fila, indice) => !usados.has(indice) && identidad(fila, claves) === identidad(item, claves)
        && JSON.stringify(referencias) === JSON.stringify(referenciasTarifas(fila.tarifasVenta || [])));
      const previo = anteriores[indicePrevio];
      if (previo) usados.add(indicePrevio);
      let valor;
      let tarifasVenta;
      if (previo) {
        valor = grupo === "accesorios" ? previo.precioUnitario : previo.valor;
        tarifasVenta = previo.tarifasVenta || [];
        if (grupo === "ppf" && previo.comboPpfId) {
          itemCotizado = {
            ...item,
            comboPpfId: previo.comboPpfId,
            comboNombre: previo.comboNombre,
            comboPrecioIndividual: previo.comboPrecioIndividual,
            comboPrecioMinimo: previo.comboPrecioMinimo,
            comboPermiteDescuento: previo.comboPermiteDescuento,
            comboDescuentoMaximoPorcentaje: previo.comboDescuentoMaximoPorcentaje,
          };
        }
        if (grupo === "ppf" && previo.cotizacionModo === "MEDIDAS") {
          itemCotizado = {
            ...item,
            cotizacionModo: "MEDIDAS",
            medidasPiezas: previo.medidasPiezas,
            margenTecnicoPorcentaje: previo.margenTecnicoPorcentaje,
            margenTecnicoCm: previo.margenTecnicoCm,
            dificultad: previo.dificultad,
            costoPromedioM2: previo.costoPromedioM2,
            areaRealM2: previo.areaRealM2,
            areaFacturableM2: previo.areaFacturableM2,
            costoMaterialEstimado: previo.costoMaterialEstimado,
          };
        }
      } else if (grupo === "ppf" && item.cotizacionModo === "PIEZAS") {
        lista ||= await listarPreciosVenta(false);
        const calculo = calcularPiezasPpf(item.piezas, lista);
        valor = calculo.total;
        tarifasVenta = calculo.tarifas;
        itemCotizado = { ...item, comboPpfId: null, comboNombre: "" };
      } else if (grupo === "ppf" && item.cotizacionModo === "MEDIDAS") {
        const medidas = (item.medidasPiezas || []).map((medida) => ({
          pieza: String(medida.pieza || "").trim().toUpperCase(), ubicacion: medida.ubicacion === "INTERIOR" || item.aplicacion === "INTERIOR" ? "INTERIOR" : "EXTERIOR", anchoCm: Number(medida.anchoCm || 0),
          largoCm: Number(medida.largoCm || 0), cantidad: Math.max(1, Math.floor(Number(medida.cantidad || 1))),
        }));
        if (!medidas.length || medidas.some((medida) => !medida.pieza || medida.anchoCm <= 0 || medida.largoCm <= 0 || medida.anchoCm > 1000 || medida.largoCm > 2000)) {
          throw new Error("Complete ancho y largo válidos para cada pieza PPF grande.");
        }
        const dificultad = String(item.dificultad || "").toUpperCase();
        const divisor = DIVISOR_DIFICULTAD[dificultad];
        if (!divisor) throw new Error("Seleccione la dificultad de instalación.");
        const areaRealM2 = medidas.reduce((total, medida) => total + (medida.anchoCm / 100) * (medida.largoCm / 100) * medida.cantidad, 0);
        const areaFacturableM2 = areaRealM2;
        const costoPromedioM2 = await costoPpfPorM2(item.referencia);
        const costoMaterialEstimado = Math.round(areaFacturableM2 * costoPromedioM2);
        valor = Math.round(costoMaterialEstimado / divisor / 1000) * 1000;
        tarifasVenta = [];
        itemCotizado = { ...item, cotizacionModo: "MEDIDAS", comboPpfId: null, comboNombre: "", medidasPiezas: medidas,
          margenTecnicoPorcentaje: 0, margenTecnicoCm: 0, dificultad, costoPromedioM2,
          areaRealM2: Number(areaRealM2.toFixed(4)), areaFacturableM2: Number(areaFacturableM2.toFixed(4)), costoMaterialEstimado };
      } else if (grupo === "ppf" && item.comboPpfId) {
        const combo = await ComboPpf.findOne({ _id: item.comboPpfId, activo: { $ne: false } }).lean();
        if (!combo) throw new Error("El combo PPF seleccionado ya no está disponible.");
        const tipo = data.vehiculo?.tipo === "MOTO" ? "MOTO" : "CARRO";
        if (!["AMBOS", tipo].includes(combo.tipoVehiculo)) throw new Error("El combo PPF no corresponde al tipo de vehículo.");
        const marca = String(data.vehiculo?.marca || "").trim().toUpperCase();
        const modelo = String(data.vehiculo?.modelo || "").trim().toUpperCase();
        if (combo.marca && combo.marca !== marca) throw new Error("El combo PPF no corresponde a la marca del vehículo.");
        if (combo.modelo && combo.modelo !== modelo) throw new Error("El combo PPF no corresponde al modelo del vehículo.");
        const referencia = String(item.referencia || "").trim().toUpperCase();
        if (combo.referenciasPpf?.length && !combo.referenciasPpf.includes(referencia)) throw new Error("El combo no aplica para la referencia PPF seleccionada.");
        valor = combo.precioCombo;
        tarifasVenta = [];
        itemCotizado = {
          ...item,
          piezas: combo.piezas,
          comboPpfId: combo._id,
          comboNombre: combo.nombre,
          comboPrecioIndividual: combo.precioIndividual,
          comboPrecioMinimo: combo.precioMinimo,
          comboPermiteDescuento: combo.permiteDescuento,
          comboDescuentoMaximoPorcentaje: combo.descuentoMaximoPorcentaje,
          cotizacionModo: "COMBO",
        };
      } else if (grupo === "accesorios" && !referencias.length) {
        const producto = await Accesorio.findOne({ _id: item.accesorioId, activo: { $ne: false } }).select("precioSugerido").lean();
        if (!(producto?.precioSugerido > 0)) throw new Error("Defina el precio del accesorio en Administración o seleccione una tarifa de venta.");
        valor = producto.precioSugerido;
        tarifasVenta = [];
      } else {
        lista ||= await listarPreciosVenta(false);
        if (["polarizados", "ppf"].includes(grupo)) {
          const material = grupo === "ppf" ? "PPF" : item.material;
          const codigos = referencias.flatMap((ref) => [ref.codigo, ref.baseCodigo].filter(Boolean));
          if (codigos.some((codigo) => {
            const tarifa = lista.find((fila) => fila.codigo === codigo);
            return tarifa && !tarifaCompatibleConMaterial(tarifa, material, item.porcentaje);
          })) throw new Error("La tarifa no corresponde al material o micraje seleccionado.");
          const tipoMoto = data.vehiculo?.tipo === "MOTO";
          const tarifasVehiculo = codigos.map((codigo) => lista.find((fila) => fila.codigo === codigo)).filter(tarifaEsVehiculo);
          if (tarifasVehiculo.some((tarifa) => tarifaEsMoto(tarifa) !== tipoMoto)) {
            throw new Error(tipoMoto
              ? "Seleccione una tarifa PPF configurada para moto."
              : "La tarifa para moto no corresponde al vehículo seleccionado.");
          }
        }
        if (["serviciosAdicionales", "accesorios"].includes(grupo)) {
          let categoria = item.tipo || "";
          let detalle = item.detalle || "";
          if (grupo === "accesorios") {
            const producto = await Accesorio.findOne({ _id: item.accesorioId, activo: { $ne: false } })
              .select("categoria nombre marca referencia").lean();
            if (!producto) throw new Error("El accesorio seleccionado ya no está disponible.");
            categoria = producto.categoria;
            detalle = `${producto.nombre || ""} ${producto.marca || ""} ${producto.referencia || ""}`;
          }
          const permitidos = new Set(tarifasCompatiblesConContexto(
            lista,
            grupo === "accesorios" ? "ACCESORIO" : "SERVICIO",
            categoria,
            detalle
          ).map((fila) => fila.codigo));
          const codigos = referencias.flatMap((ref) => [ref.codigo, ref.baseCodigo].filter(Boolean));
          if (!codigos.length || codigos.some((codigo) => !permitidos.has(codigo))) {
            throw new Error("La tarifa no corresponde al servicio o accesorio seleccionado.");
          }
        }
        const calculo = calcularTarifasVenta(referencias, lista);
        valor = calculo.total;
        tarifasVenta = calculo.tarifas;
      }
      resultado[grupo].push({ ...itemCotizado, [grupo === "accesorios" ? "precioUnitario" : "valor"]: valor, tarifasVenta });
    }
  }
  return resultado;
}
