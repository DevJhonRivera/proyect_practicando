import mongoose from "mongoose";

const detallePedidoSchema = new mongoose.Schema(
  {
    pedidoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pedido",
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

    cantidadRollos: {
      type: Number,
      required: true,
    },

    cantidadRecibida: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "DetallePedido",
  detallePedidoSchema
);
