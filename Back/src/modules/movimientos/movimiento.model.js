import mongoose from "mongoose";

const movimientoSchema =
  new mongoose.Schema(
    {
      rolloId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rollo"
      },

      origen: String,

      destino: String,

      usuarioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },

      fecha: {
        type: Date,
        default: Date.now
      }
    },
    {
      timestamps: true
    }
  );

export default mongoose.model(
  "Movimiento",
  movimientoSchema
);