import { estaEnLinea, notificarUsuarios } from "../tiempoReal/canales.js";
import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import User from "../users/user.model.js";
import Asesoria from "../asesores/asesoria.model.js";
import { suspensionEstaActiva } from "../users/userSuspension.js";
import { validarImagen } from "../asesores/fotosDiagnostico.utils.js";
import { Conversacion, Mensaje } from "./chat.model.js";
import { alcanceOrdenChat, claveConversacion, destinosChat, puedeIniciarChat, puedenConversar, rolesChat } from "./chat.utils.js";

const router = Router();
const idValido = (id) => typeof id === "string" && mongoose.isObjectIdOrHexString(id);
const responder = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error("Error en chat interno:", error.name);
    res.status(500).json({ message: "No se pudo completar la operación del chat. Intente nuevamente." });
  }
};
const errorChat = (message, status = 400) => Object.assign(new Error(message), { status });
const campoUsuario = (prefijo, id) => `${prefijo}.${String(id)}`;
const ordenAbiertaParaChat = { estado: { $ne: "CANCELADA" }, "flujo.etapa": { $nin: ["FINALIZADA", "CANCELADA"] } };

router.use(authMiddleware, (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!rolesChat.includes(req.user.rol)) return res.status(403).json({ message: "Este perfil no tiene acceso al chat" });
  next();
});

async function destinatarioParaInicio(user, id) {
  if (!idValido(id) || id === String(user._id)) throw errorChat("Seleccione un destinatario válido");
  const otro = await User.findById(id).select("nombre rol suspendido suspensionIndefinida suspendidoHasta").lean();
  if (!otro || suspensionEstaActiva(otro) || !puedeIniciarChat(user.rol, otro.rol)) throw errorChat("Su perfil no puede iniciar una conversación con este usuario", 403);
  return otro;
}

async function conversacionPropia(req) {
  if (!idValido(req.params.id)) throw errorChat("Conversación no encontrada", 404);
  const chat = await Conversacion.findOne({ _id: req.params.id, participantes: req.user._id }).lean();
  if (!chat) throw errorChat("Conversación no encontrada", 404);
  return chat;
}

router.get("/contactos", responder(async ({ user }) => {
  const contactos = await User.find({ rol: { $in: destinosChat(user.rol) } })
    .select("nombre rol suspendido suspensionIndefinida suspendidoHasta").sort({ nombre: 1 }).lean();
  return contactos.filter((u) => !suspensionEstaActiva(u)).map(({ _id, nombre, rol }) => ({ _id, nombre, rol }));
}));

router.get("/ordenes", responder(async ({ user, query }) => {
  const otro = await destinatarioParaInicio(user, query.destinatario);
  const filtros = [ordenAbiertaParaChat, alcanceOrdenChat(user), alcanceOrdenChat(otro)];
  if (query.id) {
    if (!idValido(query.id)) throw errorChat("Orden no válida");
    filtros.push({ _id: query.id });
  } else if (typeof query.buscar === "string" && query.buscar.trim()) {
    const valor = query.buscar.trim().slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filtros.push({ $or: [{ codigo: { $regex: valor, $options: "i" } }, { "vehiculo.placa": { $regex: valor, $options: "i" } }] });
  }
  return Asesoria.find({ $and: filtros }).select("codigo vehiculo.placa").sort({ createdAt: -1 }).limit(20).lean();
}));

router.post("/conversaciones", responder(async ({ user, body = {} }) => {
  const otro = await destinatarioParaInicio(user, body.destinatario);
  const ordenId = body.orden || null;
  if (ordenId && (!idValido(ordenId) || !await Asesoria.exists({ $and: [{ _id: ordenId }, ordenAbiertaParaChat, alcanceOrdenChat(user), alcanceOrdenChat(otro)] }))) {
    throw errorChat("La orden no está disponible para los dos participantes", 403);
  }
  const clave = claveConversacion(user._id, otro._id, ordenId?.toLowerCase());
  let chat;
  try {
    chat = await Conversacion.findOneAndUpdate({ clave }, {
      $setOnInsert: { clave, participantes: [user._id, otro._id], orden: ordenId, ultimoEn: new Date() },
    }, { upsert: true, new: true }).select("_id");
  } catch (error) {
    if (error.code !== 11000) throw error;
    chat = await Conversacion.findOne({ clave, participantes: user._id }).select("_id");
  }
  return { _id: chat._id };
}));

router.get("/conversaciones", responder(async ({ user, query }) => {
  const filtro = { participantes: user._id };
  if (query.orden) {
    if (!idValido(query.orden)) throw errorChat("Orden no válida");
    filtro.orden = query.orden;
  }
  const pagina = Math.min(Math.max(Number.parseInt(query.pagina, 10) || 1, 1), 10000);
  const chats = await Conversacion.find(filtro).sort({ ultimoEn: -1, _id: -1 }).skip((pagina - 1) * 30).limit(31)
    .populate("participantes", "nombre rol").populate("orden", "codigo vehiculo.placa").lean();
  return {
    hayMas: chats.length > 30,
    conversaciones: chats.slice(0, 30).map((chat) => {
      const otro = chat.participantes.find((p) => String(p._id) !== String(user._id));
      const ultimo = chat.ultimoPorAutor?.[String(otro?._id)] || "";
      return { _id: chat._id, contacto: otro, orden: chat.orden, ultimoEn: chat.ultimoEn,
        puedeEnviar: puedenConversar(user.rol, otro?.rol),
        sinLeer: String(ultimo) > String(chat.leidoHasta?.[String(user._id)] || "") };
    }),
  };
}));

router.get("/no-leidos", responder(async ({ user }) => {
  const id = String(user._id);
  const [resultado] = await Conversacion.aggregate([
    { $match: { participantes: new mongoose.Types.ObjectId(id) } },
    { $project: {
      ultimo: { $ifNull: [{ $arrayElemAt: [{ $map: {
        input: { $filter: { input: { $objectToArray: { $ifNull: ["$ultimoPorAutor", {}] } }, as: "autor", cond: { $ne: ["$$autor.k", id] } } },
        as: "autor", in: "$$autor.v",
      } }, 0] }, null] },
      leido: { $ifNull: [`$leidoHasta.${id}`, null] },
      recibido: { $ifNull: [`$recibidoHasta.${id}`, null] },
    } },
    { $match: { $expr: { $gt: ["$ultimo", "$leido"] } } },
    { $facet: {
      total: [{ $count: "cantidad" }],
      pendientes: [{ $match: { $expr: { $gt: ["$ultimo", "$recibido"] } } }, { $limit: 50 }, { $project: { ultimo: 1 } }],
    } },
  ]);
  return { cantidad: resultado?.total[0]?.cantidad || 0, pendientes: resultado?.pendientes || [] };
}));

router.get("/conversaciones/:id/mensajes", responder(async (req) => {
  const chat = await conversacionPropia(req);
  const filtro = { conversacion: chat._id };
  if (req.query.antes) {
    if (!idValido(req.query.antes)) throw errorChat("Referencia de mensaje no válida");
    filtro._id = { $lt: req.query.antes };
  }
  const despues = req.query.despues;
  if (despues) {
    if (req.query.antes || !idValido(despues)) throw errorChat("Referencia de mensaje no válida");
    filtro._id = { $gt: despues };
  }
  const mensajes = await Mensaje.find(filtro).sort({ _id: despues ? 1 : -1 }).limit(31).lean();
  const contacto = chat.participantes.find((id) => String(id) !== String(req.user._id));
  const pagina = mensajes.slice(0, 30);
  return { mensajes: despues ? pagina : pagina.reverse(), hayMas: mensajes.length > 30, enLinea: estaEnLinea(contacto),
    leidoHasta: chat.leidoHasta?.[String(contacto)], recibidoHasta: chat.recibidoHasta?.[String(contacto)] };
}));

router.post("/conversaciones/:id/mensajes", responder(async (req) => {
  const chat = await conversacionPropia(req);
  const otroId = chat.participantes.find((id) => String(id) !== String(req.user._id));
  const otro = await User.findById(otroId).select("rol suspendido suspensionIndefinida suspendidoHasta").lean();
  if (!otro || suspensionEstaActiva(otro) || !puedenConversar(req.user.rol, otro.rol)) throw errorChat("Este contacto no está disponible para recibir mensajes", 403);
  const { intento, foto, texto: entrada } = req.body || {};
  const texto = typeof entrada === "string" ? entrada.trim() : "";
  if (texto.length > 4000 || (!texto && !foto) || typeof intento !== "string" || !/^[a-f0-9-]{36}$/i.test(intento)) throw errorChat("Escriba un mensaje de hasta 4000 caracteres o adjunte una foto");
  if (foto) {
    try { validarImagen(foto); }
    catch (error) { throw errorChat(error.message); }
  }
  const clave = { conversacion: chat._id, autor: req.user._id, intento };
  let mensaje;
  try { mensaje = await Mensaje.create({ ...clave, texto, foto: foto || "", tieneFoto: !!foto }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    mensaje = await Mensaje.findOne(clave);
  }
  await Conversacion.updateOne({ _id: chat._id }, {
    $max: { ultimoEn: mensaje.createdAt, [campoUsuario("ultimoPorAutor", req.user._id)]: mensaje._id },
  });
  notificarUsuarios(chat.participantes, "chat", { conversacion: String(chat._id) });
  const salida = mensaje.toObject();
  delete salida.foto;
  return salida;
}));

router.post("/conversaciones/:id/escribiendo", responder(async (req) => {
  const chat = await conversacionPropia(req);
  const otroId = chat.participantes.find((id) => String(id) !== String(req.user._id));
  if (!estaEnLinea(otroId)) return { ok: true };
  const otro = await User.findById(otroId).select("rol suspendido suspensionIndefinida suspendidoHasta").lean();
  if (otro && !suspensionEstaActiva(otro) && puedenConversar(req.user.rol, otro.rol)) {
    notificarUsuarios([otroId], "escribiendo", {
      conversacion: String(chat._id), usuario: String(req.user._id), escribiendo: req.body?.escribiendo === true,
    });
  }
  return { ok: true };
}));

router.get("/conversaciones/:id/fotos/:mensaje", responder(async (req) => {
  const chat = await conversacionPropia(req);
  if (!idValido(req.params.mensaje)) throw errorChat("Foto no encontrada", 404);
  const mensaje = await Mensaje.findOne({ _id: req.params.mensaje, conversacion: chat._id, tieneFoto: true }).select("+foto").lean();
  if (!mensaje) throw errorChat("Foto no encontrada", 404);
  return { foto: mensaje.foto };
}));

router.post("/conversaciones/:id/recibido", responder(async (req) => {
  const chat = await conversacionPropia(req);
  const mensaje = req.body?.mensaje;
  if (!idValido(mensaje) || !await Mensaje.exists({ _id: mensaje, conversacion: chat._id, autor: { $ne: req.user._id } })) {
    throw errorChat("Mensaje no encontrado", 404);
  }
  const resultado = await Conversacion.updateOne({ _id: chat._id }, {
    $max: { [campoUsuario("recibidoHasta", req.user._id)]: new mongoose.Types.ObjectId(mensaje) },
  }, { timestamps: false });
  if (resultado.modifiedCount) notificarUsuarios(chat.participantes, "chat-recibo", { conversacion: String(chat._id) });
  return { ok: true };
}));

router.post("/conversaciones/:id/leido", responder(async (req) => {
  const chat = await conversacionPropia(req);
  const mensaje = req.body?.mensaje;
  if (!idValido(mensaje) || !await Mensaje.exists({ _id: mensaje, conversacion: chat._id })) throw errorChat("Mensaje no encontrado", 404);
  const resultado = await Conversacion.updateOne({ _id: chat._id }, { $max: { [campoUsuario("leidoHasta", req.user._id)]: new mongoose.Types.ObjectId(mensaje) } }, { timestamps: false });
  if (resultado.modifiedCount) {
    const evento = { conversacion: String(chat._id) };
    notificarUsuarios([req.user._id], "chat-leido", evento);
    notificarUsuarios(chat.participantes.filter((id) => String(id) !== String(req.user._id)), "chat-recibo", evento);
  }
  return { ok: true };
}));

export default router;
