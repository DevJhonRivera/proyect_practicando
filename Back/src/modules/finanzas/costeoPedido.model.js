import mongoose from "mongoose";

const costeoDetalleSchema =
  new mongoose.Schema(
    {
      detallePedidoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DetallePedido",
      },

      tipoPolarizado: String,

      porcentaje: Number,

      unidadMedida: {
        type: String,
        enum: [
          "PORCENTAJE",
          "MICRAS",
          "NINGUNA",
        ],
        default: "PORCENTAJE",
      },

      ancho: Number,

      cantidadRollos: Number,

      valorUnitario: {
        type: Number,
        default: 0,
      },

      subtotalOriginal: {
        type: Number,
        default: 0,
      },

      valorUnitarioCop: {
        type: Number,
        default: 0,
      },

      subtotalCop: {
        type: Number,
        default: 0,
      },

      fleteAsignadoCop: {
        type: Number,
        default: 0,
      },

      otrosAsignadosCop: {
        type: Number,
        default: 0,
      },

      ivaAsignadoCop: {
        type: Number,
        default: 0,
      },

      costoFinalTotalCop: {
        type: Number,
        default: 0,
      },

      costoFinalUnitarioCop: {
        type: Number,
        default: 0,
      },
    },
    {
      _id: false,
    }
  );

const costeoPedidoSchema =
  new mongoose.Schema(
    {
      pedidoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pedido",
        required: true,
        unique: true,
      },

      moneda: {
        type: String,
        enum: ["COP", "USD"],
        default: "COP",
      },

      trm: {
        type: Number,
        default: 1,
      },

      trmFlete: {
        type: Number,
        default: 1,
      },

      flete: {
        type: Number,
        default: 0,
      },

      otrosCostos: {
        type: Number,
        default: 0,
      },

      aplicaIva: {
        type: Boolean,
        default: true,
      },

      ivaIncluido: {
        type: Boolean,
        default: false,
      },

      porcentajeIva: {
        type: Number,
        default: 19,
      },

      metodoProrrateoFlete: {
        type: String,
        enum: ["VALOR", "CANTIDAD"],
        default: "VALOR",
      },

      estado: {
        type: String,
        enum: ["PENDIENTE", "COSTEADO", "PAGADO"],
        default: "COSTEADO",
      },

      detalles: [costeoDetalleSchema],

      subtotalProductosOriginal: {
        type: Number,
        default: 0,
      },

      subtotalProductosCop: {
        type: Number,
        default: 0,
      },

      fleteCop: {
        type: Number,
        default: 0,
      },

      otrosCostosCop: {
        type: Number,
        default: 0,
      },

      ivaCop: {
        type: Number,
        default: 0,
      },

      totalOriginal: {
        type: Number,
        default: 0,
      },

      totalCop: {
        type: Number,
        default: 0,
      },

      costoPromedioRolloCop: {
        type: Number,
        default: 0,
      },

      observaciones: String,
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "CosteoPedido",
  costeoPedidoSchema
);
