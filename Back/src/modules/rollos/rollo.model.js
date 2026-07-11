import mongoose from "mongoose";

const rolloSchema = new mongoose.Schema(
  {
    codigoRollo: {
      type: String,
      unique: true,
      required: true
    },

    pedidoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pedido"
    },

    recepcionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recepcion"
    },

    tipoPolarizado: {
      type: String,
      required: true
    },

    porcentaje: {
      type: Number,
      required: true
    },

    unidadMedida: {
      type: String,
      enum: [
        "PORCENTAJE",
        "MICRAS",
        "NINGUNA",
      ],
      default: "PORCENTAJE"
    },

    ancho: {
      type: Number,
      required: true
    },

    largoOriginal: {
      type: Number,
      required: true
    },

    largoDisponible: {
      type: Number,
      required: true
    },

    costoUnitarioCop: {
      type: Number,
      default: 0
    },

    costoPorMetroCop: {
      type: Number,
      default: 0
    },

    costoTotalAsignadoCop: {
      type: Number,
      default: 0
    },

    costeoPedidoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CosteoPedido"
    },

    costoAsignadoAt: Date,

    estado: {
      type: String,
      enum: [
        "RECEPCION",
        "RESERVA",
        "USO",
        "AGOTADO"
      ],
      default: "RECEPCION"
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  "Rollo",
  rolloSchema
);
