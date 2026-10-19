import mongoose from "mongoose";
import Asesoria from "../asesores/asesoria.model.js";
import User from "../users/user.model.js";

const texto = (value) => String(value || "").trim();
const escapar = (value) => texto(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// La bandeja es compartida para dar visibilidad al equipo. Las operaciones
// continúan protegidas por rol en cada módulo y endpoint de destino.
const alcancePorRol = () => ({});

export const listarOrdenesTrabajo = async (filtros = {}, user) => {
  const condiciones = [alcancePorRol(user)];
  if (filtros.etapa) condiciones.push({ "flujo.etapa": filtros.etapa });
  if (filtros.estado === "EN_CURSO") condiciones.push({ "flujo.etapa": { $nin: ["FINALIZADA", "CANCELADA"] } });
  if (filtros.estado === "FINALIZADAS") condiciones.push({ "flujo.etapa": "FINALIZADA" });
  if (filtros.estado === "CANCELADAS") condiciones.push({ "flujo.etapa": "CANCELADA" });
  if (filtros.instaladorId && mongoose.Types.ObjectId.isValid(filtros.instaladorId)) {
    condiciones.push({ "coordinacion.asignaciones.instaladorId": new mongoose.Types.ObjectId(filtros.instaladorId) });
  }
  if (filtros.desde || filtros.hasta) {
    const createdAt = {};
    if (filtros.desde) createdAt.$gte = new Date(`${filtros.desde}T00:00:00.000`);
    if (filtros.hasta) createdAt.$lte = new Date(`${filtros.hasta}T23:59:59.999`);
    condiciones.push({ createdAt });
  }
  if (filtros.buscar) {
    const regex = new RegExp(escapar(filtros.buscar).slice(0, 80), "i");
    condiciones.push({ $or: [{ codigo: regex }, { "vehiculo.placa": regex }, { "vehiculo.marca": regex }, { "vehiculo.modelo": regex }, { "cliente.nombre": regex }, { "cliente.cedula": regex }, { asesorNombre: regex }] });
  }
  const activas = condiciones.filter((item) => Object.keys(item).length);
  const query = activas.length ? { $and: activas } : {};
  const page = Math.max(Number(filtros.page || 1), 1);
  const limit = Math.min(Math.max(Number(filtros.limit || 12), 6), 50);
  const [items, total, instaladores] = await Promise.all([
    Asesoria.find(query)
      .select("codigo cliente vehiculo polarizados ppf serviciosAdicionales accesorios garantia comercial pago coordinacion flujo estado situacionActual novedades asesorNombre creadoPor createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Asesoria.countDocuments(query),
    ["ADMIN", "SUPERUSUARIO", "COORDINADOR"].includes(user.rol)
      ? User.find({ rol: "INSTALADOR", suspendido: { $ne: true } }).select("nombre").sort({ nombre: 1 }).lean()
      : Promise.resolve([]),
  ]);
  return {
    items,
    instaladores,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  };
};
