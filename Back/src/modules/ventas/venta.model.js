import mongoose from "mongoose";

const clienteSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    telefono: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const vehiculoSchema = new mongoose.Schema(
  {
    placa: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    marca: {
      type: String,
      required: true,
      trim: true,
    },
    modelo: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const ventaItemSchema = new mongoose.Schema(
  {
    tipoServicio: {
      type: String,
      enum: [
        "POLARIZADO",
        "PPF",
        "PELICULA_SEGURIDAD",
        "LAVADO",
        "POLICHADA",
        "PDR",
        "ASEGURADA",
        "OTRO",
      ],
      required: true,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    corteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Corte",
    },
    corteIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Corte",
      },
    ],
    cantidad: {
      type: Number,
      default: 1,
      min: 1,
    },
    valorUnitario: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const auditoriaSchema = new mongoose.Schema(
  {
    fecha: {
      type: Date,
      default: Date.now,
    },
    accion: {
      type: String,
      required: true,
    },
    descripcion: {
      type: String,
      default: "",
    },
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    usuarioNombre: {
      type: String,
      default: "",
    },
    usuarioRol: {
      type: String,
      default: "",
    },
    cambios: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
  }
);

const ventaSchema = new mongoose.Schema(
  {
    codigoVenta: {
      type: String,
      unique: true,
      required: true,
    },
    cliente: {
      type: clienteSchema,
      required: true,
    },
    vehiculo: {
      type: vehiculoSchema,
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    estado: {
      type: String,
      enum: [
        "PENDIENTE",
        "PAGADA",
        "ANULADA",
      ],
      default: "PENDIENTE",
    },
    items: {
      type: [ventaItemSchema],
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,
        message:
          "Debe agregar al menos un servicio a la venta",
      },
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    descuento: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    observaciones: {
      type: String,
      default: "",
    },
    auditoria: {
      type: [auditoriaSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Venta",
  ventaSchema
);
