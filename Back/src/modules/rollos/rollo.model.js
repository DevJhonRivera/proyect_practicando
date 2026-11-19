import mongoose from "mongoose";

const bajaMaterialSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ["DANO_PARCIAL", "BAJA_TOTAL"],
      required: true,
    },
    causa: {
      type: String,
      enum: ["DEFECTO_PROVEEDOR", "HUMEDAD", "GOLPE", "MALA_MANIPULACION", "VENCIMIENTO", "OTRO"],
      required: true,
    },
    metros: { type: Number, required: true },
    costoPerdidaCop: { type: Number, default: 0 },
    observacion: { type: String, required: true, trim: true, uppercase: true },
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    usuarioNombre: { type: String, required: true, trim: true, uppercase: true },
    fecha: { type: Date, default: Date.now },
  },
  { _id: true }
);

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
    },

    fechaAgotado: {
      type: Date,
      default: null
    },

    bajasMaterial: {
      type: [bajaMaterialSchema],
      default: [],
    },
  },
  {
    timestamps: true
  }
);

rolloSchema.index({ estado: 1, createdAt: -1 });
rolloSchema.index({ tipoPolarizado: 1, unidadMedida: 1, porcentaje: 1, ancho: 1, estado: 1 });
rolloSchema.index({ pedidoId: 1 });
rolloSchema.index({ recepcionId: 1 });

export default mongoose.model(
  "Rollo",
  rolloSchema
);
