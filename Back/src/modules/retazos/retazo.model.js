import mongoose from "mongoose";

const retazoSchema = new mongoose.Schema(
  {
    codigoRetazo: {
      type: String,
      unique: true,
      required: true,
    },

    tipoPolarizado: {
      type: String,
      required: true,
    },

    porcentaje: {
      type: Number,
      required: true,
    },

    unidadMedida: {
      type: String,
      enum: [
        "PORCENTAJE",
        "MICRAS",
        "NINGUNA",
      ],
      default: "PORCENTAJE",
    },

    ancho: {
      type: Number,
      required: true,
    },

    largoOriginal: {
      type: Number,
      required: true,
    },

    largoDisponible: {
      type: Number,
      required: true,
    },

    costoPorMetroCop: {
      type: Number,
      default: 0,
    },

    costoTotalCop: {
      type: Number,
      default: 0,
    },

    estado: {
      type: String,
      enum: [
        "DISPONIBLE",
        "USADO",
        "DESCARTADO",
      ],
      default: "DISPONIBLE",
    },

    origenRolloId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rollo",
    },

    origenCorteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corte",
    },

    observaciones: String,
  },
  {
    timestamps: true,
  }
);

retazoSchema.index({ estado: 1, createdAt: -1 });
retazoSchema.index({ tipoPolarizado: 1, unidadMedida: 1, porcentaje: 1, ancho: 1, largoDisponible: 1 });

export default mongoose.model(
  "Retazo",
  retazoSchema
);
