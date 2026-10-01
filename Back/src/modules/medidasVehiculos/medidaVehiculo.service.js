import MedidaVehiculo from "./medidaVehiculo.model.js";

const texto = (value) => String(value || "").trim().toUpperCase();
const partes = ["delanteras", "traseras", "panoramico", "luneta", "fijos", "custodias", "sunroof"];

const preparar = (data) => {
  const marca = texto(data.marca);
  const modelo = texto(data.modelo);
  if (!marca || !modelo) throw new Error("Ingrese marca y modelo del vehículo");
  const medidas = {};
  partes.forEach((parte) => {
    const item = data.medidas?.[parte] || {};
    medidas[parte] = {
      anchoCm: Math.max(Number(item.anchoCm || 0), 0),
      largoCm: Math.max(Number(item.largoCm || 0), 0),
      cantidad: Math.max(Number(item.cantidad || 1), 1),
    };
  });
  return { marca, modelo, anio: String(data.anio || "").replace(/\D/g, "").slice(0, 4), medidas, observaciones: texto(data.observaciones) };
};

export const listarMedidas = () => MedidaVehiculo.find().sort({ marca: 1, modelo: 1, anio: -1 }).lean();
export const crearMedida = (data) => MedidaVehiculo.create(preparar(data));
export const actualizarMedida = async (id, data) => {
  const medida = await MedidaVehiculo.findByIdAndUpdate(id, preparar(data), { new: true, runValidators: true });
  if (!medida) throw new Error("Vehículo no encontrado");
  return medida;
};
export const eliminarMedida = async (id) => {
  const medida = await MedidaVehiculo.findByIdAndDelete(id);
  if (!medida) throw new Error("Vehículo no encontrado");
  return medida;
};
