import mongoose from "mongoose";
import Accesorio from "./accesorio.model.js";
import Asesoria from "../asesores/asesoria.model.js";
import { sincronizarAlertasAccesorios } from "../alertas/alerta.service.js";

const texto = (value) => String(value || "").trim();
const mayusculas = (value) => texto(value).toUpperCase();
const escapeRegex = (value) => texto(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const preparar = (data = {}) => {
  const categoria = mayusculas(data.categoria);
  const nombre = mayusculas(data.nombre);
  const marca = mayusculas(data.marca) || "GENERICO";
  if (!categoria || !nombre) throw new Error("Ingrese la categoria y el nombre del accesorio");
  return {
    categoria,
    nombre,
    marca,
    referencia: mayusculas(data.referencia),
    stock: Math.max(0, Math.floor(Number(data.stock || 0))),
    stockMinimo: Math.max(0, Math.floor(Number(data.stockMinimo || 0))),
    costoUnitario: Math.max(0, Math.round(Number(data.costoUnitario || 0))),
    precioSugerido: Math.max(0, Math.round(Number(data.precioSugerido || 0))),
  };
};

const asignarStockPendiente = async (accesorioId, user) => {
  const ordenes = await Asesoria.find({
    estado: { $ne: "CANCELADA" },
    accesorios: { $elemMatch: { accesorioId, cantidadPendiente: { $gt: 0 } } },
  }).sort({ createdAt: 1 });
  for (const orden of ordenes) {
    const producto = await Accesorio.findById(accesorioId).select("stock nombre");
    if (!producto || producto.stock <= 0) break;
    const linea = orden.accesorios.find((item) => String(item.accesorioId) === String(accesorioId) && item.cantidadPendiente > 0);
    if (!linea) continue;
    const cantidad = Math.min(producto.stock, linea.cantidadPendiente);
    const actualizado = await Accesorio.findOneAndUpdate({ _id: accesorioId, stock: { $gte: cantidad } }, {
      $inc: { stock: -cantidad },
      $push: { movimientos: { tipo: "SALIDA", cantidad, motivo: "ASIGNADO A SERVICIO PENDIENTE", asesoriaId: orden._id, codigoOrden: orden.codigo, usuarioId: user?._id || null, usuarioNombre: user?.nombre || "SISTEMA" } },
    });
    if (!actualizado) continue;
    linea.cantidadDescontada = Number(linea.cantidadDescontada || 0) + cantidad;
    linea.cantidadPendiente = Math.max(Number(linea.cantidadPendiente || 0) - cantidad, 0);
    linea.estadoInventario = linea.cantidadPendiente > 0 ? "PENDIENTE_STOCK" : "RESERVADO";
    await orden.save();
    await sincronizarAlertasAccesorios(orden);
  }
};

export const listarAccesorios = async (query = {}) => {
  const filtro = { activo: { $ne: false } };
  if (query.disponibles === "true") filtro.stock = { $gt: 0 };
  if (query.categoria) filtro.categoria = mayusculas(query.categoria);
  if (query.buscar) {
    const regex = new RegExp(escapeRegex(query.buscar).slice(0, 80), "i");
    filtro.$or = [{ codigo: regex }, { categoria: regex }, { nombre: regex }, { marca: regex }, { referencia: regex }];
  }
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 12), 5), 100);
  const [items, total] = await Promise.all([
    Accesorio.find(filtro).sort({ categoria: 1, nombre: 1, marca: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Accesorio.countDocuments(filtro),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } };
};

export const obtenerCatalogoAccesorios = async () => {
  const productos = await Accesorio.find({ activo: { $ne: false } })
    .select("codigo categoria nombre marca referencia stock stockMinimo costoUnitario precioSugerido")
    .sort({ categoria: 1, referencia: 1, nombre: 1 })
    .lean();
  return {
    categorias: [...new Set(productos.map((item) => item.categoria).filter(Boolean))],
    referencias: productos,
  };
};

export const crearAccesorio = async (data, user) => {
  const preparado = preparar(data);
  const codigo = mayusculas(data.codigo) || `ACC-${Date.now()}`;
  if (await Accesorio.exists({ codigo })) throw new Error("Ya existe un accesorio con este codigo");
  const duplicado = await Accesorio.findOne({
    activo: { $ne: false },
    categoria: preparado.categoria,
    nombre: preparado.nombre,
    marca: preparado.marca,
    referencia: preparado.referencia,
  }).select("codigo stock");
  if (duplicado) {
    throw new Error(`Esta referencia ya existe como ${duplicado.codigo}. Registre una entrada de stock sobre ese producto`);
  }
  const stockInicial = preparado.stock;
  const accesorio = await Accesorio.create({
    ...preparado,
    codigo,
    movimientos: stockInicial ? [{ tipo: "ENTRADA", cantidad: stockInicial, motivo: "STOCK INICIAL", usuarioId: user._id, usuarioNombre: user.nombre }] : [],
  });
  if (accesorio.stock > 0) await asignarStockPendiente(accesorio._id, user);
  return Accesorio.findById(accesorio._id);
};

export const actualizarAccesorio = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Accesorio no valido");
  const actual = await Accesorio.findById(id);
  if (!actual) throw new Error("Accesorio no encontrado");
  const preparado = preparar({ ...data, stock: actual.stock });
  if (data.codigo && mayusculas(data.codigo) !== actual.codigo && await Accesorio.exists({ codigo: mayusculas(data.codigo), _id: { $ne: id } })) throw new Error("Ya existe un accesorio con este codigo");
  if (await Accesorio.exists({
    _id: { $ne: id },
    activo: { $ne: false },
    categoria: preparado.categoria,
    nombre: preparado.nombre,
    marca: preparado.marca,
    referencia: preparado.referencia,
  })) throw new Error("Ya existe otro accesorio con esta categoría, nombre, marca y referencia");
  Object.assign(actual, preparado, { codigo: mayusculas(data.codigo) || actual.codigo });
  return actual.save();
};

export const ajustarStockAccesorio = async (id, data, user) => {
  const cantidad = Math.floor(Number(data.cantidad || 0));
  const tipo = mayusculas(data.tipo);
  const motivo = mayusculas(data.motivo);
  if (!cantidad || cantidad < 1 || !["ENTRADA", "SALIDA", "AJUSTE"].includes(tipo)) throw new Error("Ingrese un movimiento y una cantidad validos");
  if (!motivo) throw new Error("Indique el motivo del movimiento");
  const accesorio = await Accesorio.findById(id);
  if (!accesorio) throw new Error("Accesorio no encontrado");
  const nuevoStock = tipo === "ENTRADA" ? accesorio.stock + cantidad : tipo === "SALIDA" ? accesorio.stock - cantidad : cantidad;
  if (nuevoStock < 0) throw new Error(`Stock insuficiente. Disponibles: ${accesorio.stock}`);
  accesorio.stock = nuevoStock;
  accesorio.movimientos.push({ tipo, cantidad, motivo, usuarioId: user._id, usuarioNombre: user.nombre });
  await accesorio.save();
  if (nuevoStock > 0 && ["ENTRADA", "AJUSTE"].includes(tipo)) await asignarStockPendiente(accesorio._id, user);
  return Accesorio.findById(accesorio._id);
};

export const eliminarAccesorio = async (id) => {
  const solicitado = await Asesoria.exists({
    estado: { $ne: "CANCELADA" },
    accesorios: { $elemMatch: { accesorioId: id, cantidadPendiente: { $gt: 0 } } },
  });
  if (solicitado) throw new Error("No puede desactivar este accesorio porque existen servicios esperando unidades");
  const accesorio = await Accesorio.findByIdAndUpdate(id, { activo: false }, { new: true });
  if (!accesorio) throw new Error("Accesorio no encontrado");
  return accesorio;
};
