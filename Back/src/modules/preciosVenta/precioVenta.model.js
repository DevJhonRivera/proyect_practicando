import mongoose from "mongoose";

const filaSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  hoja: { type: String, required: true },
  grupo: { type: String, required: true },
  descripcion: { type: String, required: true },
  modalidad: { type: String, enum: ["FIJO", "PORCENTAJE"], required: true },
  precios: [{ type: Number, default: null }],
  condiciones: [String],
  notas: { type: String, default: "" },
  originales: [String],
  filaExcel: Number,
  activo: { type: Boolean, default: true },
  requiereRevision: { type: Boolean, default: false },
  revision: { type: Number, default: 0 },
  actualizadoPor: String,
  fechaActualizacion: Date,
}, { _id: false });

export default mongoose.model("ListaPreciosVenta", new mongoose.Schema({
  _id: String,
  filas: [filaSchema],
}, { timestamps: true }));
