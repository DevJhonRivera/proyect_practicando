import mongoose from "mongoose";

const pedidoSchema = new mongoose.Schema(
  {
    codigoPedido: {
      type: String,
      required: true,
      unique: true
    },

    proveedor: {
      type: String,
      required: true
    },

    fechaPedido: {
      type: Date,
      default: Date.now
    },

    estado: {
      type: String,
      enum: [
        "PENDIENTE",
        "PARCIAL",
        "COMPLETADO"
      ],
      default: "PENDIENTE"
    },

    observaciones: String
  },
  {
    timestamps: true
  }
);

pedidoSchema.index({ createdAt: -1 });
pedidoSchema.index({ estado: 1, createdAt: -1 });

export default mongoose.model(
  "Pedido",
  pedidoSchema
);
