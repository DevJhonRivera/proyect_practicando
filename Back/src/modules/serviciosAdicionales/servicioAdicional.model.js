import mongoose from "mongoose";

const servicioAdicionalSchema = new mongoose.Schema({
  categoria: { type: String, required: true, trim: true, uppercase: true },
  nombre: { type: String, required: true, trim: true, uppercase: true },
  precioSugerido: { type: Number, default: 0, min: 0 },
  activo: { type: Boolean, default: true },
  creadoPorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  creadoPorNombre: { type: String, default: "SISTEMA", trim: true, uppercase: true },
}, { timestamps: true });

servicioAdicionalSchema.index({ categoria: 1, nombre: 1, activo: 1 });

export default mongoose.model("ServicioAdicional", servicioAdicionalSchema);
