import mongoose from "mongoose";

const dimensionSchema = new mongoose.Schema({
  anchoCm: { type: Number, default: 0, min: 0 },
  largoCm: { type: Number, default: 0, min: 0 },
  cantidad: { type: Number, default: 1, min: 1 },
}, { _id: false });

const medidaVehiculoSchema = new mongoose.Schema({
  marca: { type: String, required: true, trim: true, uppercase: true },
  modelo: { type: String, required: true, trim: true, uppercase: true },
  anio: { type: String, default: "", trim: true },
  medidas: {
    delanteras: { type: dimensionSchema, default: () => ({ cantidad: 2 }) },
    traseras: { type: dimensionSchema, default: () => ({ cantidad: 2 }) },
    panoramico: { type: dimensionSchema, default: () => ({ cantidad: 1 }) },
    luneta: { type: dimensionSchema, default: () => ({ cantidad: 1 }) },
    fijos: { type: dimensionSchema, default: () => ({ cantidad: 2 }) },
    custodias: { type: dimensionSchema, default: () => ({ cantidad: 2 }) },
    sunroof: { type: dimensionSchema, default: () => ({ cantidad: 1 }) },
  },
  observaciones: { type: String, default: "", trim: true, uppercase: true },
}, { timestamps: true });

medidaVehiculoSchema.index({ marca: 1, modelo: 1, anio: 1 }, { unique: true });
export default mongoose.model("MedidaVehiculo", medidaVehiculoSchema);
