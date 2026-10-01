import mongoose from "mongoose";

const alertaSchema =
  new mongoose.Schema(
    {
      tipo: String,

      mensaje: String,

      clave: {
        type: String,
        index: true
      },

      referenciaId:
        mongoose.Schema.Types.ObjectId,

      destinatarioId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },

      accionUrl: {
        type: String,
        default: ""
      },

      atendida: {
        type: Boolean,
        default: false
      },

      activa: {
        type: Boolean,
        default: true
      }
    },
    {
      timestamps: true
    }
  );

export default mongoose.model(
  "Alerta",
  alertaSchema
);
