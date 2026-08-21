import mongoose from "mongoose";

const piezaPpfSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

piezaPpfSchema.index({
  marca: 1,
  modelo: 1,
  ubicacion: 1,
  pieza: 1,
});

export default mongoose.model(
  "PiezaPpf",
  piezaPpfSchema
);
