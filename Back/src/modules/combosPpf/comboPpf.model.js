import mongoose from "mongoose";

const comboPpfSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, uppercase: true },
  tipoVehiculo: { type: String, enum: ["CARRO", "MOTO", "AMBOS"], default: "AMBOS" },
  marca: { type: String, default: "", trim: true, uppercase: true },
  modelo: { type: String, default: "", trim: true, uppercase: true },
  referenciasPpf: { type: [String], default: [] },
  piezas: { type: [String], required: true },
  precioIndividual: { type: Number, required: true, min: 1 },
  precioCombo: { type: Number, required: true, min: 1 },
  precioMinimo: { type: Number, required: true, min: 1 },
  permiteDescuento: { type: Boolean, default: false },
  descuentoMaximoPorcentaje: { type: Number, default: 0, min: 0, max: 100 },
  activo: { type: Boolean, default: true },
  creadoPorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  creadoPorNombre: { type: String, required: true, trim: true, uppercase: true },
}, { timestamps: true });

comboPpfSchema.index({ activo: 1, tipoVehiculo: 1, nombre: 1 });
export default mongoose.model("ComboPpf", comboPpfSchema);
