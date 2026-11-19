import mongoose from "mongoose";

const piezaPpfSchema = new mongoose.Schema(
  {
    tipoVehiculo: { type: String, enum: ["CARRO", "MOTO"], default: "CARRO" },
    marca: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    modelo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    anio: {
      type: String,
      default: "",
      trim: true,
    },

    ubicacion: {
      type: String,
      enum: [
        "EXTERIOR",
        "INTERIOR",
      ],
      required: true,
    },

    pieza: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    anchoCm: {
      type: Number,
      default: 0,
      min: 0,
    },

    largoCm: {
      type: Number,
      default: 0,
      min: 0,
    },

    cantidad: {
      type: Number,
      default: 1,
      min: 1,
    },

    observaciones: {
      type: String,
      default: "",
      trim: true,
    },

    activa: {
      type: Boolean,
      default: true,
    },
    origenAsesoriaId: { type: mongoose.Schema.Types.ObjectId, ref: "Asesoria", default: null },
    actualizadoPorNombre: { type: String, default: "", trim: true, uppercase: true },
  },
  {
    timestamps: true,
  }
);

piezaPpfSchema.index({
  tipoVehiculo: 1,
  marca: 1,
  modelo: 1,
  anio: 1,
  ubicacion: 1,
  pieza: 1,
});

export default mongoose.model(
  "PiezaPpf",
  piezaPpfSchema
);
