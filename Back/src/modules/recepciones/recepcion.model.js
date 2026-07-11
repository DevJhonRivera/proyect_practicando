import mongoose from "mongoose";

const recepcionSchema =
new mongoose.Schema({

  codigoRecepcion: {
    type: String,
    unique: true
  },

  cantidadRollos: {
    type: Number,
    required: true
  },

  clasificados: {
    type: Number,
    default: 0
  },

  observaciones: {
    type: String
  },

  estado: {
    type: String,
    enum: [
      "PENDIENTE_CLASIFICACION",
      "PARCIAL",
      "COMPLETADA"
    ],
    default:
      "PENDIENTE_CLASIFICACION"
  }

},
{
  timestamps: true
});

export default mongoose.model(
  "Recepcion",
  recepcionSchema
);