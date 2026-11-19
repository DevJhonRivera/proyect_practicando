import mongoose from "mongoose";
import ComboPpf from "./comboPpf.model.js";

const mayusculas = (valor) => String(valor || "").trim().toUpperCase();
const dinero = (valor) => Math.round(Number(valor || 0));

export const listarCombosPpf = () => ComboPpf.find({ activo: { $ne: false } })
  .sort({ tipoVehiculo: 1, nombre: 1 }).lean();

export const crearComboPpf = async (data, user) => {
  const nombre = mayusculas(data.nombre);
  const tipoVehiculo = ["CARRO", "MOTO", "AMBOS"].includes(data.tipoVehiculo) ? data.tipoVehiculo : "AMBOS";
  const piezas = [...new Set((data.piezas || []).map(mayusculas).filter(Boolean))];
  const referenciasPpf = [...new Set((data.referenciasPpf || []).map(mayusculas).filter(Boolean))];
  const precioIndividual = dinero(data.precioIndividual);
  const precioCombo = dinero(data.precioCombo);
  const precioMinimo = dinero(data.precioMinimo || precioCombo);
  const permiteDescuento = Boolean(data.permiteDescuento);
  const descuentoMaximoPorcentaje = permiteDescuento ? Number(data.descuentoMaximoPorcentaje || 0) : 0;
  if (nombre.length < 3) throw new Error("Ingrese un nombre para el combo");
  if (!piezas.length) throw new Error("Seleccione al menos una pieza PPF");
  if (precioIndividual <= 0 || precioCombo <= 0 || precioMinimo <= 0) throw new Error("Complete los precios del combo");
  if (precioCombo > precioIndividual) throw new Error("El precio del combo no puede superar la suma individual");
  if (precioMinimo > precioCombo) throw new Error("El precio mínimo no puede superar el precio del combo");
  if (!Number.isFinite(descuentoMaximoPorcentaje) || descuentoMaximoPorcentaje < 0 || descuentoMaximoPorcentaje > 100) throw new Error("Porcentaje de descuento inválido");
  return ComboPpf.create({
    nombre, tipoVehiculo, marca: mayusculas(data.marca), modelo: mayusculas(data.modelo), referenciasPpf,
    piezas, precioIndividual, precioCombo, precioMinimo, permiteDescuento, descuentoMaximoPorcentaje,
    creadoPorId: user._id, creadoPorNombre: user.nombre || user.rol,
  });
};

export const eliminarComboPpf = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Combo no válido");
  const combo = await ComboPpf.findById(id);
  if (!combo) throw new Error("Combo no encontrado");
  const administra = ["ADMIN", "SUPERUSUARIO"].includes(user.rol);
  if (!administra && String(combo.creadoPorId) !== String(user._id)) throw new Error("Solo puede retirar los combos creados por usted");
  combo.activo = false;
  return combo.save();
};
