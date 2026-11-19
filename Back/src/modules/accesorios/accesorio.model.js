import mongoose from "mongoose";

const movimientoSchema = new mongoose.Schema({
  tipo: { type: String, enum: ["ENTRADA", "SALIDA", "AJUSTE"], required: true },
  cantidad: { type: Number, required: true },
  motivo: { type: String, required: true, trim: true, uppercase: true },
  asesoriaId: { type: mongoose.Schema.Types.ObjectId, ref: "Asesoria", default: null },
  codigoOrden: { type: String, default: "", trim: true, uppercase: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  usuarioNombre: { type: String, default: "", trim: true, uppercase: true },
  fecha: { type: Date, default: Date.now },
}, { _id: true });

const accesorioSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true, trim: true, uppercase: true },
  categoria: { type: String, required: true, trim: true, uppercase: true },
  nombre: { type: String, required: true, trim: true, uppercase: true },
  marca: { type: String, default: "GENERICO", trim: true, uppercase: true },
  referencia: { type: String, default: "", trim: true, uppercase: true },
  stock: { type: Number, default: 0, min: 0 },
  stockMinimo: { type: Number, default: 0, min: 0 },
  costoUnitario: { type: Number, default: 0, min: 0 },
  precioSugerido: { type: Number, default: 0, min: 0 },
  activo: { type: Boolean, default: true },
  movimientos: { type: [movimientoSchema], default: [] },
}, { timestamps: true });

accesorioSchema.index({ categoria: 1, nombre: 1, marca: 1 });

export default mongoose.model("Accesorio", accesorioSchema);
