import { Router } from "express";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import User from "../users/user.model.js";
import { suspensionEstaActiva } from "../users/userSuspension.js";
import { Conversacion } from "../chat/chat.model.js";
import { puedenConversar, rolesChat } from "../chat/chat.utils.js";
import { cantidadConexiones, conectarUsuario, estaEnLinea, notificarUsuarios } from "./canales.js";

const router = Router();

async function anunciarPresencia(usuario) {
  if (!rolesChat.includes(usuario.rol)) return;
  const conversaciones = await Conversacion.find({ participantes: usuario._id })
    .select("participantes").populate("participantes", "rol suspendido suspensionIndefinida suspendidoHasta").lean();
  const contactos = conversaciones.flatMap((chat) => chat.participantes).filter((otro) =>
    String(otro._id) !== String(usuario._id) && puedenConversar(usuario.rol, otro.rol) && !suspensionEstaActiva(otro));
  notificarUsuarios(contactos.map((u) => u._id), "presencia", { usuario: String(usuario._id), enLinea: estaEnLinea(usuario._id) });
}

router.get("/", authMiddleware, (req, res) => {
  const usuario = req.user;
  if (cantidadConexiones(usuario._id) >= 8) return res.status(429).json({ message: "Hay demasiadas pestañas conectadas" });
  const token = jwt.decode(req.headers.authorization.split(" ")[1]);
  const vence = Math.min(token.exp ? token.exp * 1000 : Infinity, token.iat * 1000 + 8 * 60 * 60 * 1000);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const canal = conectarUsuario(usuario._id, res);
  const publicarPresencia = () => anunciarPresencia(usuario).catch(() => console.error("No se pudo anunciar presencia"));
  if (canal.primera) publicarPresencia();
  let validando = false;
  const pulso = setInterval(async () => {
    if (validando) return;
    validando = true;
    try {
      if (Date.now() >= vence) return res.end();
      const actual = await User.findById(usuario._id).select("rol tokenVersion suspendido suspensionIndefinida suspendidoHasta").lean();
      if (!actual || suspensionEstaActiva(actual) || actual.rol !== usuario.rol || Number(actual.tokenVersion || 0) !== Number(usuario.tokenVersion || 0)) return res.end();
      if (!res.destroyed && !res.writableEnded) {
        if (res.writableLength > 65536) res.destroy();
        else res.write(": pulso\n\n");
      }
    } catch { res.end(); }
    finally { validando = false; }
  }, 15000);
  res.once("close", () => {
    clearInterval(pulso);
    if (canal.desconectar()) publicarPresencia();
  });
});

export default router;
