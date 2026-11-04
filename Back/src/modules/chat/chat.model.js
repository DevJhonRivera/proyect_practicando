import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;
const conversacionSchema = new mongoose.Schema({
  clave: { type: String, required: true, unique: true },
  participantes: [{ type: ObjectId, ref: "User", required: true }],
  orden: { type: ObjectId, ref: "Asesoria", default: null },
  ultimoEn: { type: Date, required: true, default: Date.now },
  ultimoPorAutor: { type: Map, of: ObjectId, default: {} },
  leidoHasta: { type: Map, of: ObjectId, default: {} },
  recibidoHasta: { type: Map, of: ObjectId, default: {} },
}, { timestamps: true });
conversacionSchema.index({ participantes: 1, ultimoEn: -1, _id: -1 });

const mensajeSchema = new mongoose.Schema({
  conversacion: { type: ObjectId, required: true },
  autor: { type: ObjectId, required: true },
  intento: { type: String, required: true },
  texto: { type: String, maxlength: 4000, default: "" },
  foto: { type: String, default: "", select: false },
  tieneFoto: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });
mensajeSchema.index({ conversacion: 1, _id: -1 });
mensajeSchema.index({ conversacion: 1, autor: 1, intento: 1 }, { unique: true });

export const Conversacion = mongoose.model("ChatConversacion", conversacionSchema);
export const Mensaje = mongoose.model("ChatMensaje", mensajeSchema);
